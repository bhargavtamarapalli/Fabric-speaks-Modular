import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CartService } from '../../src/services/cart.service';
import { CartRepository } from '../../src/repositories/cart.repository';
import { CouponRepository } from '../../src/repositories/coupon.repository';
import { CatalogIntegrationService } from '../../src/services/catalog-integration.service';
import { Redis } from 'ioredis';
import { AppError, ErrorCode } from '@fs/shared/errors';

describe('CartService - Core Logic', () => {
    let service: CartService;
    let mockCartRepo: any;
    let mockRedis: any;
    let mockCouponRepo: any;
    let mockCatalogInt: any;

    beforeEach(() => {
        mockCartRepo = {
            getUserCart: vi.fn(),
            getGuestCart: vi.fn(),
            addUserItem: vi.fn(),
            saveGuestCart: vi.fn(),
            updateUserItemQty: vi.fn(),
            removeUserItem: vi.fn(),
        };
        mockRedis = {
            get: vi.fn(),
            setex: vi.fn(),
            del: vi.fn()
        };
        mockCouponRepo = {
            findByCode: vi.fn(),
            getUserRedemptionCount: vi.fn()
        };
        mockCatalogInt = {
            getVariantStockDetails: vi.fn()
        };

        service = new CartService(
            mockCartRepo as unknown as CartRepository,
            mockCouponRepo as unknown as CouponRepository,
            mockCatalogInt as unknown as CatalogIntegrationService,
            mockRedis as unknown as Redis
        );
    });

    describe('addItem', () => {
        it('should throw STOCK_UNAVAILABLE if requested quantity exceeds stock', async () => {
            mockCatalogInt.getVariantStockDetails.mockResolvedValue({ stock_qty: 2, price: 100 });
            mockCartRepo.getUserCart.mockResolvedValue([]);

            await expect(service.addItem('user1', undefined, { variantId: 'v1', quantity: 3 }))
                .rejects.toThrowError(/Only 2 items available/);
        });

        it('should add item with max cap of 10 if stock allows', async () => {
            mockCatalogInt.getVariantStockDetails.mockResolvedValue({ stock_qty: 50, price: 100 });
            mockCartRepo.getUserCart.mockResolvedValue([]);

            await service.addItem('user1', undefined, { variantId: 'v1', quantity: 15 });

            // Repository handles capping for users via LEAST(..., 10) in SQL
            expect(mockCartRepo.addUserItem).toHaveBeenCalledWith('user1', 'v1', 15, 100);
        });

        it('should cap guest cart items at 10 correctly and lock price', async () => {
            mockCatalogInt.getVariantStockDetails.mockResolvedValue({ stock_qty: 50, price: 100 });
            mockCartRepo.getGuestCart.mockResolvedValue([{ variantId: 'v1', quantity: 8, price: 100 }]);

            await service.addItem(undefined, 'guest_1', { variantId: 'v1', quantity: 5 });

            expect(mockCartRepo.saveGuestCart).toHaveBeenCalledWith('guest_1', [{ variantId: 'v1', quantity: 10, price: 100 }]);
        });

        it('should RULE 1: Lock price for guest cart on first add', async () => {
            mockCatalogInt.getVariantStockDetails.mockResolvedValue({ stock_qty: 50, price: 299 });
            mockCartRepo.getGuestCart.mockResolvedValue([]);

            await service.addItem(undefined, 'guest_1', { variantId: 'v1', quantity: 1 });

            expect(mockCartRepo.saveGuestCart).toHaveBeenCalledWith('guest_1', [{ variantId: 'v1', quantity: 1, price: 299 }]);
        });
    });

    describe('getCart', () => {
        it('should RULE 1: Use stored price for guest cart even if catalog price changes', async () => {
            const guestItems = [{ variantId: 'v1', quantity: 2, price: 299 }];
            mockCartRepo.getGuestCart.mockResolvedValue(guestItems);
            // Catalog price changed to 399
            mockCatalogInt.getVariantStockDetails.mockResolvedValue({ stock_qty: 10, price: 399 });

            const result = await service.getCart(undefined, 'guest_1');

            expect(result.items[0]!.price).toBe(299);
            expect(result.subtotal).toBe(598);
        });
    });

    describe('applyCoupon', () => {
        it('should throw if coupon is expired', async () => {
            const expiredCoupon = {
                id: 'c1',
                code: 'NEW50',
                valid_from: new Date(Date.now() - 100000),
                valid_until: new Date(Date.now() - 50000), // explicitly past
                max_uses_total: 100,
                uses_count: 0,
                max_uses_per_user: 1
            };
            mockCouponRepo.findByCode.mockResolvedValue(expiredCoupon);

            await expect(service.applyCoupon('user1', 'NEW50'))
                .rejects.toThrowError(/not currently valid/);
        });

        it('should throw if global usage limit exceeded', async () => {
            const usedCoupon = {
                id: 'c1',
                code: 'NEW50',
                valid_from: new Date(Date.now() - 100000),
                valid_until: new Date(Date.now() + 100000),
                max_uses_total: 100,
                uses_count: 100,
                max_uses_per_user: 1
            };
            mockCouponRepo.findByCode.mockResolvedValue(usedCoupon);

            await expect(service.applyCoupon('user1', 'NEW50'))
                .rejects.toThrowError(/exceeded globally/);
        });

        it('should apply valid coupon securely into Redis', async () => {
            const validCoupon = {
                id: 'c1',
                code: 'NEW50',
                valid_from: new Date(Date.now() - 100000),
                valid_until: new Date(Date.now() + 100000),
                max_uses_total: 100,
                uses_count: 50,
                max_uses_per_user: 1
            };
            mockCouponRepo.findByCode.mockResolvedValue(validCoupon);
            mockCouponRepo.getUserRedemptionCount.mockResolvedValue(0);

            await service.applyCoupon('user1', 'NEW50');

            expect(mockRedis.setex).toHaveBeenCalledWith('cart:coupon:user1', 604800, 'NEW50');
        });
    });
});
