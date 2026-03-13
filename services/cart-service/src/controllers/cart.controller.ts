import { Request, Response } from 'express';
import { CartService } from '../services/cart.service';
import { AddCartItemSchema, UpdateCartItemQtySchema, ApplyCouponSchema, MergeCartSchema } from '../schemas/cart.schemas';
import { catchAsync } from '@fs/shared';

export class CartController {
    constructor(private readonly cartService: CartService) {}

    getCart = catchAsync(async (req: Request, res: Response) => {
        const userId = req.user?.userId;
        const sessionId = req.cookies?.sessionId || (req.headers['x-session-id'] as string);
        
        const result = await this.cartService.getCart(userId, sessionId);
        res.json({ success: true, data: result });
    });

    addItem = catchAsync(async (req: Request, res: Response) => {
        const userId = req.user?.userId;
        const sessionId = req.cookies?.sessionId || (req.headers['x-session-id'] as string);
        const dto = AddCartItemSchema.parse(req.body);

        const result = await this.cartService.addItem(userId, sessionId, dto);
        res.json({ success: true, data: result });
    });

    updateItemQty = catchAsync(async (req: Request, res: Response) => {
        const userId = req.user?.userId;
        const sessionId = req.cookies?.sessionId || (req.headers['x-session-id'] as string);
        const dto = UpdateCartItemQtySchema.parse(req.body);

        const result = await this.cartService.updateItemQty(userId, sessionId, req.params.variantId!, dto.quantity);
        res.json({ success: true, data: result });
    });

    removeItem = catchAsync(async (req: Request, res: Response) => {
        const userId = req.user?.userId;
        const sessionId = req.cookies?.sessionId || (req.headers['x-session-id'] as string);

        await this.cartService.removeItem(userId, sessionId, req.params.variantId!);
        res.json({ success: true });
    });

    applyCoupon = catchAsync(async (req: Request, res: Response) => {
        const dto = ApplyCouponSchema.parse(req.body);
        const result = await this.cartService.applyCoupon(req.user!.userId, dto.code);
        res.json({ success: true, data: result });
    });

    removeCoupon = catchAsync(async (req: Request, res: Response) => {
        const result = await this.cartService.removeCoupon(req.user!.userId);
        res.json({ success: true, data: result });
    });

    mergeCart = catchAsync(async (req: Request, res: Response) => {
        const dto = MergeCartSchema.parse(req.body);
        const result = await this.cartService.mergeCart(req.user!.userId, dto.guestSessionId);
        res.json({ success: true, data: result });
    });
}
