import { couponRepository } from '../repositories/coupon.repository';
import { auditLogRepository } from '../repositories/audit-log.repository';
import { AppError, ErrorCode } from '@fs/shared/errors';
import { CouponListQueryDto, CreateCouponDto, UpdateCouponDto } from '../schemas/coupon.schemas';

export class CouponService {
  async listCoupons(filters: CouponListQueryDto) {
    return couponRepository.list(filters);
  }

  async createCoupon(data: CreateCouponDto, adminId: string) {
    const existing = await couponRepository.findByCode(data.code);
    if (existing) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Coupon code already exists');
    }

    const coupon = await couponRepository.create(data);

    // RULE 6
    await auditLogRepository.insert({
      adminId,
      action: 'coupon_create',
      targetType: 'coupon',
      targetId: coupon.id,
      payload: { code: coupon.code }
    });

    return coupon;
  }

  async updateCoupon(id: string, data: UpdateCouponDto, adminId: string) {
    const coupon = await couponRepository.findById(id);
    if (!coupon) throw new AppError(ErrorCode.NOT_FOUND, 'Coupon not found');

    const updated = await couponRepository.update(id, data);

    // RULE 6
    await auditLogRepository.insert({
      adminId,
      action: 'coupon_update',
      targetType: 'coupon',
      targetId: id,
      payload: data
    });

    return updated;
  }
}

export const couponService = new CouponService();
