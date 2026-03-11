import { Request, Response, NextFunction } from 'express';
import { CartService } from '../services/cart.service';
import { AddCartItemSchema, UpdateCartItemQtySchema, ApplyCouponSchema, MergeCartSchema } from '../schemas/cart.schemas';

export class CartController {
    constructor(private readonly cartService: CartService) {}

    getCart = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.userId;
            const sessionId = req.cookies?.sessionId || req.headers['x-session-id'] as string;
            
            // Logic handled in service (if user, use DB; if guest, use Redis)
            const result = await this.cartService.getCart(userId, sessionId);
            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    };

    addItem = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.userId;
            const sessionId = req.cookies?.sessionId || req.headers['x-session-id'] as string;
            const dto = AddCartItemSchema.parse(req.body);

            const result = await this.cartService.addItem(userId, sessionId, dto);
            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    };

    updateItemQty = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.userId;
            const sessionId = req.cookies?.sessionId || req.headers['x-session-id'] as string;
            const dto = UpdateCartItemQtySchema.parse(req.body);

            const result = await this.cartService.updateItemQty(userId, sessionId, req.params.variantId!, dto.quantity);
            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    };

    removeItem = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.userId;
            const sessionId = req.cookies?.sessionId || req.headers['x-session-id'] as string;

            await this.cartService.removeItem(userId, sessionId, req.params.variantId!);
            res.json({ success: true });
        } catch (err) {
            next(err);
        }
    };

    applyCoupon = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const dto = ApplyCouponSchema.parse(req.body);
            // Require login to use coupons (based on DB schema references)
            const result = await this.cartService.applyCoupon(req.user!.userId, dto.code);
            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    };

    removeCoupon = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.cartService.removeCoupon(req.user!.userId);
            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    };

    mergeCart = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const dto = MergeCartSchema.parse(req.body);
            const result = await this.cartService.mergeCart(req.user!.userId, dto.guestSessionId);
            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    };
}
