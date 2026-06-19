import { AppError, ErrorCode } from '@fs/shared';
import { DashboardRepository } from '../repositories/dashboard.repository';
import { SaleEventRepository, SaleEventScope } from '../repositories/sale-event.repository';

export class AnalyticsService {
  constructor(
    private dashboardRepo: DashboardRepository,
    private saleEventRepo: SaleEventRepository
  ) {}

  async getCouponUsage(limit: number, offset: number) {
    return this.dashboardRepo.getCouponUsage(limit, offset);
  }

  async getReturnRateByProduct(limit: number, offset: number) {
    return this.dashboardRepo.getReturnRateByProduct(limit, offset);
  }

  async getSalePerformanceReport(saleEventId: string) {
    const saleEvent = await this.saleEventRepo.findById(saleEventId);
    if (!saleEvent) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Sale event not found');
    }

    const performance = await this.dashboardRepo.getSalePerformance(
      saleEvent.starts_at,
      saleEvent.ends_at,
      {
        type: saleEvent.scope as any,
        ids: Array.isArray(saleEvent.scope_ids) ? saleEvent.scope_ids : []
      }
    );

    return { saleEvent, performance };
  }

  async getLiveSaleMonitor(options: { windowMinutes: number; saleEventId?: string; saleOnly?: boolean }) {
    const { windowMinutes, saleEventId, saleOnly } = options;

    if (!saleEventId) {
      return this.dashboardRepo.getLiveSaleMonitor(windowMinutes, undefined, saleOnly ?? false);
    }

    const saleEvent = await this.saleEventRepo.findById(saleEventId);
    if (!saleEvent) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Sale event not found');
    }

    return this.dashboardRepo.getLiveSaleMonitor(windowMinutes, {
      type: saleEvent.scope as any,
      ids: Array.isArray(saleEvent.scope_ids) ? saleEvent.scope_ids : []
    }, true);
  }

}
