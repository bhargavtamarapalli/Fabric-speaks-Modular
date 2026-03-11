import { Request, Response } from 'express';
import { couponService } from '../services/coupon.service';
import { 
  CouponListQuerySchema, 
  CreateCouponSchema, 
  UpdateCouponSchema 
} from '../schemas/coupon.schemas';

export async function listCoupons(req: Request, res: Response): Promise<void> {
  const filters = CouponListQuerySchema.parse(req.query);
  const result = await couponService.listCoupons(filters);
  res.json({ success: true, data: { items: result.items }, meta: result.meta });
}

export async function createCoupon(req: Request, res: Response): Promise<void> {
  const dto = CreateCouponSchema.parse(req.body);
  const result = await couponService.createCoupon(dto, req.user!.userId);
  res.status(201).json({ success: true, data: result });
}

export async function updateCoupon(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const dto = UpdateCouponSchema.parse(req.body);
  const result = await couponService.updateCoupon(id, dto, req.user!.userId);
  res.json({ success: true, data: result });
}
