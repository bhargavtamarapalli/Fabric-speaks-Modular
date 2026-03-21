import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { catchAsync } from '@fs/shared';
import { LiveSaleMonitorSchema, ReportPaginationSchema, SalePerformanceParamsSchema } from '../schemas/analytics.schemas';

export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  getCouponUsage = catchAsync(async (req: Request, res: Response) => {
    const query = ReportPaginationSchema.parse(req.query);
    const items = await this.analyticsService.getCouponUsage(query.limit, query.offset);
    res.json({ success: true, data: { items }, meta: query });
  });

  getReturnRateByProduct = catchAsync(async (req: Request, res: Response) => {
    const query = ReportPaginationSchema.parse(req.query);
    const items = await this.analyticsService.getReturnRateByProduct(query.limit, query.offset);
    res.json({ success: true, data: { items }, meta: query });
  });

  getSalePerformance = catchAsync(async (req: Request, res: Response) => {
    const { id } = SalePerformanceParamsSchema.parse(req.params);
    const result = await this.analyticsService.getSalePerformanceReport(id);
    res.json({ success: true, data: result });
  });

  getLiveSaleMonitor = catchAsync(async (req: Request, res: Response) => {
    const query = LiveSaleMonitorSchema.parse(req.query);
    const data = await this.analyticsService.getLiveSaleMonitor(query);
    res.json({ success: true, data });
  });
}
