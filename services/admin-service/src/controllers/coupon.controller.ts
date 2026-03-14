import { Request, Response } from 'express';
import { CouponService } from '../services/coupon.service';
import { 
  CouponListQuerySchema, 
  CreateCouponSchema, 
  UpdateCouponSchema 
} from '../schemas/coupon.schemas';
import { AppError, ErrorCode, catchAsync } from '@fs/shared';

export class CouponController {
  constructor(private couponService: CouponService) {}

  listCoupons = catchAsync(async (req: Request, res: Response) => {
    const filters = CouponListQuerySchema.parse(req.query);
    const result = await this.couponService.listCoupons(filters);
    res.json({ success: true, data: { items: result.items }, meta: result.meta });
  });

  createCoupon = catchAsync(async (req: Request, res: Response) => {
    const dto = CreateCouponSchema.parse(req.body);
    const adminId = req.user?.userId;
    const adminRole = req.user?.role;
    
    if (!adminId || !adminRole) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');

    const result = await this.couponService.createCoupon(dto, adminId);
    res.status(201).json({ success: true, data: result });
  });

  updateCoupon = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const dto = UpdateCouponSchema.parse(req.body);
    const adminId = req.user?.userId;
    const adminRole = req.user?.role;
    
    if (!adminId || !adminRole) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');

    const result = await this.couponService.updateCoupon(id!, dto, adminId);
    res.json({ success: true, data: result });
  });
}
