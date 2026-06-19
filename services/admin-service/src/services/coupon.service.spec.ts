import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CouponService } from './coupon.service';
import { CouponRepository } from '../repositories/coupon.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { AppError, ErrorCode } from '@fs/shared';

vi.mock('../repositories/coupon.repository');
vi.mock('../repositories/audit-log.repository');

describe('CouponService', () => {
  let service: CouponService;
  let repo: CouponRepository;
  let auditLogRepo: AuditLogRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new CouponRepository({} as any);
    auditLogRepo = new AuditLogRepository({} as any);
    service = new CouponService(repo, auditLogRepo);
  });

  it('should create a coupon and log audit', async () => {
    const dto = { code: 'SAVE10', discountType: 'PERCENT' as const, discountValue: 10, minOrderAmount: 100, validFrom: new Date().toISOString(), validUntil: new Date().toISOString(), maxUsesPerUser: 1 };
    const mockCoupon = {
      id: 'c1',
      code: dto.code,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      minOrderAmount: dto.minOrderAmount,
      maxDiscount: null,
      maxUsesTotal: null,
      maxUsesPerUser: dto.maxUsesPerUser,
      usesCount: 0,
      validFrom: new Date(dto.validFrom),
      validUntil: new Date(dto.validUntil),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    vi.mocked(repo.findByCode).mockResolvedValue(null);
    vi.mocked(repo.create).mockResolvedValue(mockCoupon);

    const result = await service.createCoupon(dto, 'admin-1');

    expect(result).toEqual(mockCoupon);
    expect(auditLogRepo.insert).toHaveBeenCalledWith(expect.objectContaining({
      action: 'coupon_create',
      entityType: 'coupon'
    }));
  });

  it('should throw error if coupon code exists', async () => {
    vi.mocked(repo.findByCode).mockResolvedValue({ id: 'c1' } as any);
    await expect(service.createCoupon({ code: 'EXT' } as any, 'a1')).rejects.toThrow('already exists');
  });

  it('should update coupon and log audit', async () => {
    const mockOld = { id: 'c1', code: 'C1', discountValue: 10 };
    vi.mocked(repo.findById).mockResolvedValue(mockOld as any);
    vi.mocked(repo.update).mockResolvedValue({ ...mockOld, discountValue: 20 } as any);

    await service.updateCoupon('c1', { isActive: true }, 'admin-1');

    expect(auditLogRepo.insert).toHaveBeenCalledWith(expect.objectContaining({
      action: 'coupon_update',
      beforeJson: mockOld
    }));
  });
});
