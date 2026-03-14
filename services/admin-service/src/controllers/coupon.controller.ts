import { Request, Response, NextFunction } from 'express';
import { CouponService } from '../services/coupon.service';
import { 
  CouponListQuerySchema, 
  CreateCouponSchema, 
  UpdateCouponSchema 
} from '../schemas/coupon.schemas';
import { AppError, ErrorCode } from '@fs/shared';

export class CouponController {
  constructor(private couponService: CouponService) {}

  listCoupons = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = CouponListQuerySchema.parse(req.query);
      const result = await this.couponService.listCoupons(filters);
      res.json({ success: true, data: { items: result.items }, meta: result.meta });
    } catch (error) {
      next(error);
    }
  }

  createCoupon = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = CreateCouponSchema.parse(req.body);
      const adminUserId = req.user?.userId;
      if (!adminUserId) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');

      const result = await this.couponService.createCoupon(dto, adminUserId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  updateCoupon = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const dto = UpdateCouponSchema.parse(req.body);
      const adminUserId = req.user?.userId;
      if (!adminUserId) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');

      const result = await this.couponService.updateCoupon(id, dto, adminUserId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
