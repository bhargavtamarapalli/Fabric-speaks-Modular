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

    const { joinClause, filterClause, params } = this.buildScopeFilter(
      saleEvent.scope,
      Array.isArray(saleEvent.scope_ids) ? saleEvent.scope_ids : [],
      3
    );

    const performance = await this.dashboardRepo.getSalePerformance(
      saleEvent.starts_at,
      saleEvent.ends_at,
      joinClause,
      filterClause,
      params
    );

    return { saleEvent, performance };
  }

  async getLiveSaleMonitor(options: { windowMinutes: number; saleEventId?: string; saleOnly?: boolean }) {
    const { windowMinutes, saleEventId, saleOnly } = options;

    if (!saleEventId) {
      return this.dashboardRepo.getLiveSaleMonitor(windowMinutes, '', '', [], saleOnly ?? false);
    }

    const saleEvent = await this.saleEventRepo.findById(saleEventId);
    if (!saleEvent) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Sale event not found');
    }

    const { joinClause, filterClause, params } = this.buildScopeFilter(
      saleEvent.scope,
      Array.isArray(saleEvent.scope_ids) ? saleEvent.scope_ids : [],
      2
    );

    return this.dashboardRepo.getLiveSaleMonitor(windowMinutes, joinClause, filterClause, params, true);
  }

  private buildScopeFilter(scope: SaleEventScope, scopeIds: string[], startIndex: number) {
    const params: string[] = [];
    let joinClause = '';
    let filterClause = '';

    switch (scope) {
      case 'collection': {
        joinClause = 'JOIN collection_products cp ON cp.product_id = p.id';
        params.push(...scopeIds);
        const placeholders = scopeIds.map((_, idx) => `$${startIndex + idx}`).join(', ');
        filterClause = `cp.collection_id IN (${placeholders})`;
        break;
      }
      case 'specific_products': {
        params.push(...scopeIds);
        const placeholders = scopeIds.map((_, idx) => `$${startIndex + idx}`).join(', ');
        filterClause = `p.id IN (${placeholders})`;
        break;
      }
      case 'fabric_type': {
        params.push(...scopeIds);
        const placeholders = scopeIds.map((_, idx) => `$${startIndex + idx}`).join(', ');
        filterClause = `p.attributes->>'fabric_type' IN (${placeholders})`;
        break;
      }
      case 'global':
      default:
        break;
    }

    return { joinClause, filterClause, params };
  }
}
