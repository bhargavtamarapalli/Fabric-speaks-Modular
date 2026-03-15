import { BannerRepository, Banner } from '../repositories/banner.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { AppError, ErrorCode } from '@fs/shared';

export class BannerService {
  constructor(
    private bannerRepo: BannerRepository,
    private auditLogRepo: AuditLogRepository
  ) {}

  async createBanner(data: Omit<Banner, 'id' | 'created_at'>, adminId: string) {
    const banner = await this.bannerRepo.create(data);
    
    await this.auditLogRepo.insert({
      adminId,
      action: 'banner_create',
      entityType: 'banner',
      entityId: banner.id,
      afterJson: banner as any
    });

    return banner;
  }

  async listBanners(filters: { isActive?: boolean; limit?: number; offset?: number }) {
    return this.bannerRepo.list(filters);
  }

  async getBanner(id: string) {
    const banner = await this.bannerRepo.findById(id);
    if (!banner) throw new AppError(ErrorCode.NOT_FOUND, 'Banner not found');
    return banner;
  }

  async updateBanner(id: string, data: Partial<Omit<Banner, 'id' | 'created_at' | 'created_by'>>, adminId: string) {
    const previous = await this.getBanner(id);
    const updated = await this.bannerRepo.update(id, data);

    await this.auditLogRepo.insert({
      adminId,
      action: 'banner_update',
      entityType: 'banner',
      entityId: id,
      beforeJson: previous as any,
      afterJson: updated as any
    });

    return updated;
  }

  async deleteBanner(id: string, adminId: string) {
    const deleted = await this.bannerRepo.delete(id);
    if (!deleted) throw new AppError(ErrorCode.NOT_FOUND, 'Banner not found');

    await this.auditLogRepo.insert({
      adminId,
      action: 'banner_delete',
      entityType: 'banner',
      entityId: id
    });

    return { success: true };
  }
}
