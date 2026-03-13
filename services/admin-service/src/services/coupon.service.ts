import { CouponRepository, AdminCoupon } from '../repositories/coupon.repository';
import { AppError, ErrorCode } from '@fs/shared';
import { CouponListQueryDto, CreateCouponDto, UpdateCouponDto } from '../schemas/coupon.schemas';

export class CouponService {
  constructor(private repo: CouponRepository) {}

  async listCoupons(filters: CouponListQueryDto) {
    return this.repo.list(filters);
  }

  async createCoupon(data: CreateCouponDto, adminId: string) {
    const existing = await this.repo.findByCode(data.code);
    if (existing) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Coupon code already exists');
    }

    const coupon = await this.repo.create(data);
    return coupon;
  }

  async updateCoupon(id: string, data: UpdateCouponDto, adminId: string) {
    const coupon = await this.repo.findById(id);
    if (!coupon) throw new AppError(ErrorCode.NOT_FOUND, 'Coupon not found');

    const updated = await this.repo.update(id, data);
    return updated;
  }
}
