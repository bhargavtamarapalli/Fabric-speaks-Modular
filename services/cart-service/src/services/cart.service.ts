import { CartRepository, CartItem } from '../repositories/cart.repository';
import { CouponRepository, Coupon } from '../repositories/coupon.repository';
import { CatalogIntegrationService } from './catalog-integration.service';
import { AddCartItemDto } from '../schemas/cart.schemas';
import { AppError, ErrorCode } from '@fs/shared/errors';
import { Redis } from 'ioredis';
import { logger } from '@fs/shared';

export interface CartResponse {
    items: CartItem[];
    subtotal: number;
    discount: number;
    total: number;
    coupon: string | null;
}

export class CartService {
    private readonly COUPON_PREFIX = 'cart:coupon:';
    private readonly REDIS_COUPON_TTL = 7 * 24 * 60 * 60; // 7 days
    private readonly MAX_CART_QUANTITY = 10;

    constructor(
        private cartRepo: CartRepository,
        private couponRepo: CouponRepository,
        private catalogInt: CatalogIntegrationService,
        private redis: Redis
    ) {}

    // ==========================================================
    // GET ACTIVE CART
    // ==========================================================
    async getCart(userId?: string, sessionId?: string): Promise<CartResponse> {
        if (!userId && !sessionId) {
            throw new AppError(ErrorCode.UNAUTHORIZED, 'Session ID or User ID required');
        }

        let items: CartItem[] = [];
        if (userId) {
            items = await this.cartRepo.getUserCart(userId);
        } else {
            // Guest
            items = await this.cartRepo.getGuestCart(sessionId!);
            // RULE 1: For guests, items now come with stored price. 
            // We only need to hydrate stock_qty for UI warnings, but use stored price.
            items = await Promise.all(items.map(async item => {
                const stockDetails = await this.catalogInt.getVariantStockDetails(item.variantId);
                return {
                    ...item,
                    // If price is missing (old session), fallback to current price but log it
                    price: item.price ?? (() => {
                        const p = stockDetails?.price ?? 0;
                        logger.warn(`Guest cart item missing price, falling back to current price: ${p}`, { variantId: item.variantId });
                        return p;
                    })(),
                    stock_qty: stockDetails?.stock_qty || 0
                };
            }));
        }

        // Calculate totals
        let subtotal = 0;
        let finalQuantity = 0;
        for (const item of items) {
            subtotal += (item.price || 0) * item.quantity;
            finalQuantity += item.quantity;
        }

        // Apply Coupon logic (only if logged in)
        let discount = 0;
        let activeCoupon = null;

        if (userId) {
            const couponCode = await this.redis.get(`${this.COUPON_PREFIX}${userId}`);
            if (couponCode) {
                const coupon = await this.couponRepo.findByCode(couponCode);
                if (coupon && subtotal >= coupon.min_order_amount) {
                    activeCoupon = couponCode;
                    if (coupon.discount_type === 'PERCENT') {
                        discount = (subtotal * coupon.discount_value) / 100;
                        if (coupon.max_discount) {
                            discount = Math.min(discount, coupon.max_discount);
                        }
                    } else {
                        discount = coupon.discount_value;
                    }
                } else if (coupon && subtotal < coupon.min_order_amount) {
                    // Min order amount not met
                    activeCoupon = couponCode;
                    discount = 0; // Not applied yet
                }
            }
        }

        return {
            items,
            subtotal,
            discount,
            total: Math.max(0, subtotal - discount),
            coupon: activeCoupon
        };
    }

    // ==========================================================
    // ADD ITEM TO CART (WITH STOCK CHECK)
    // ==========================================================
    async addItem(userId: string | undefined, sessionId: string | undefined, dto: AddCartItemDto): Promise<void> {
        if (!userId && !sessionId) throw new AppError(ErrorCode.UNAUTHORIZED, 'Session ID or User ID required');

        // Stock check via Catalog Service integration
        const variantDetails = await this.catalogInt.getVariantStockDetails(dto.variantId);
        if (!variantDetails) {
            throw new AppError(ErrorCode.NOT_FOUND, 'Variant not found');
        }

        // We need to fetch existing cart item quantity to check combined total vs stock
        let currentQtyInCart = 0;
        if (userId) {
            const items = await this.cartRepo.getUserCart(userId);
            const item = items.find(i => i.variantId === dto.variantId);
            if (item) currentQtyInCart = item.quantity;
        } else {
            const items = await this.cartRepo.getGuestCart(sessionId!);
            const item = items.find(i => i.variantId === dto.variantId);
            if (item) currentQtyInCart = item.quantity;
        }

        const requestedQty = currentQtyInCart + dto.quantity;

        // If insufficient stock return 409
        if (variantDetails.stock_qty < requestedQty) {
            throw new AppError(
                ErrorCode.STOCK_UNAVAILABLE, 
                `Only ${variantDetails.stock_qty} items available in stock`, 
                { available_qty: variantDetails.stock_qty }
            );
        }

        const cappedQty = Math.min(dto.quantity, this.MAX_CART_QUANTITY); // Check cap
        
        if (userId) {
            await this.cartRepo.addUserItem(userId, dto.variantId, dto.quantity, variantDetails.price);
        } else {
            const items = await this.cartRepo.getGuestCart(sessionId!);
            const existingIndex = items.findIndex(i => i.variantId === dto.variantId);
            
            if (existingIndex > -1) {
                const itemToUpdate = items[existingIndex];
                if (itemToUpdate) {
                    itemToUpdate.quantity = Math.min(itemToUpdate.quantity + dto.quantity, this.MAX_CART_QUANTITY);
                    // NOTE: RULE 1 - Do NOT update price for guests if already exists, like DB
                }
            } else {
                // RULE 1: Store price at add time for guests too
                items.push({ 
                    variantId: dto.variantId, 
                    quantity: cappedQty,
                    price: variantDetails.price 
                });
            }
            await this.cartRepo.saveGuestCart(sessionId!, items);
        }
    }

    // ==========================================================
    // UPDATE ITEM QTY
    // ==========================================================
    async updateItemQty(userId: string | undefined, sessionId: string | undefined, variantId: string, quantity: number): Promise<void> {
        if (!userId && !sessionId) throw new AppError(ErrorCode.UNAUTHORIZED, 'Session ID or User ID required');

        const variantDetails = await this.catalogInt.getVariantStockDetails(variantId);
        if (!variantDetails) throw new AppError(ErrorCode.NOT_FOUND, 'Variant not found');
        
        if (variantDetails.stock_qty < quantity) {
            throw new AppError(ErrorCode.STOCK_UNAVAILABLE, `Insufficient stock`, { available_qty: variantDetails.stock_qty });
        }

        if (userId) {
            await this.cartRepo.updateUserItemQty(userId, variantId, quantity);
        } else {
            const items = await this.cartRepo.getGuestCart(sessionId!);
            const existingIndex = items.findIndex(i => i.variantId === variantId);
            if (existingIndex > -1) {
                const itemToUpdate = items[existingIndex];
                if (itemToUpdate) {
                    itemToUpdate.quantity = quantity;
                }
                await this.cartRepo.saveGuestCart(sessionId!, items);
            }
        }
    }

    // ==========================================================
    // REMOVE ITEM
    // ==========================================================
    async removeItem(userId: string | undefined, sessionId: string | undefined, variantId: string): Promise<void> {
        if (!userId && !sessionId) throw new AppError(ErrorCode.UNAUTHORIZED, 'Session ID or User ID required');

        if (userId) {
            await this.cartRepo.removeUserItem(userId, variantId);
        } else {
            const items = await this.cartRepo.getGuestCart(sessionId!);
            const newItems = items.filter(i => i.variantId !== variantId);
            await this.cartRepo.saveGuestCart(sessionId!, newItems);
        }
    }

    // ==========================================================
    // APPLY COUPON
    // ==========================================================
    async applyCoupon(userId: string, code: string): Promise<void> {
        const coupon = await this.couponRepo.findByCode(code);
        if (!coupon) {
            throw new AppError(ErrorCode.NOT_FOUND, 'Invalid or expired coupon');
        }

        const now = new Date();
        if (now < coupon.valid_from || now > coupon.valid_until) {
            throw new AppError(ErrorCode.VALIDATION_ERROR, 'Coupon is not currently valid');
        }

        if (coupon.max_uses_total !== null && coupon.uses_count >= coupon.max_uses_total) {
            throw new AppError(ErrorCode.VALIDATION_ERROR, 'Coupon usage limit exceeded globally');
        }

        const userUses = await this.couponRepo.getUserRedemptionCount(coupon.id, userId);
        if (userUses >= coupon.max_uses_per_user) {
            throw new AppError(ErrorCode.VALIDATION_ERROR, 'You have reached the maximum usage limit for this coupon');
        }

        // Validated! Store to active cart context via Redis
        await this.redis.setex(`${this.COUPON_PREFIX}${userId}`, this.REDIS_COUPON_TTL, code);
    }

    // ==========================================================
    // REMOVE COUPON
    // ==========================================================
    async removeCoupon(userId: string): Promise<void> {
        await this.redis.del(`${this.COUPON_PREFIX}${userId}`);
    }

    // ==========================================================
    // MERGE GUEST CART INTO USER DB CART
    // ==========================================================
    async mergeCart(userId: string, guestSessionId: string): Promise<void> {
        const guestItems = await this.cartRepo.getGuestCart(guestSessionId);
        
        if (guestItems.length === 0) return;

        // Loop over guest items and insert/update in DB
        for (const item of guestItems) {
            try {
                // RULE 1: Transfer guest price to user cart
                await this.cartRepo.addUserItem(userId, item.variantId, item.quantity, item.price || 0);
            } catch (err) {
                // Ignore soft failures if variant got deleted
            }
        }

        // Delete guest cart from Redis
        await this.cartRepo.clearGuestCart(guestSessionId);
    }
}
