import { Request, Response } from 'express';
import { NotificationCoordinator } from '../services/NotificationCoordinator';
import { BroadcastNotificationSchema } from '../schemas/notification.schemas';
import { BroadcastService } from '../services/BroadcastService';
import { BroadcastCampaignSchema, BroadcastCampaignListSchema, BroadcastEstimateSchema, TemplateListSchema, TemplatePreviewSchema } from '../schemas/broadcast.schemas';
import { catchAsync } from '@fs/shared';

export class NotificationController {
  private coordinator: NotificationCoordinator;
  private broadcastService: BroadcastService;

  constructor() {
    this.coordinator = new NotificationCoordinator();
    this.broadcastService = new BroadcastService();
  }

  broadcast = catchAsync(async (req: Request, res: Response) => {
    const data = BroadcastNotificationSchema.parse(req.body);
    const result = await this.coordinator.broadcast(data, req.user!.userId);
    res.status(200).json({ success: true, data: result });
  });

  estimateBroadcast = catchAsync(async (req: Request, res: Response) => {
    const dto = BroadcastEstimateSchema.parse(req.body);
    const result = await this.broadcastService.estimateReach(dto.audience);
    res.status(200).json({ success: true, data: result });
  });

  createCampaign = catchAsync(async (req: Request, res: Response) => {
    const dto = BroadcastCampaignSchema.parse(req.body);
    const campaign = await this.broadcastService.createCampaign({
      templateId: dto.templateId,
      messagePreview: dto.messagePreview,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      templateComponents: dto.templateComponents ?? [],
      channel: dto.channel,
      audience: dto.audience,
      adminId: req.user!.userId
    });
    res.status(201).json({ success: true, data: campaign });
  });

  listCampaigns = catchAsync(async (req: Request, res: Response) => {
    const query = BroadcastCampaignListSchema.parse(req.query);
    const items = await this.broadcastService.listCampaigns(query);
    res.status(200).json({ success: true, data: { items }, meta: query });
  });

  getCampaign = catchAsync(async (req: Request, res: Response) => {
    const campaign = await this.broadcastService.getCampaign(req.params.id);
    res.status(200).json({ success: true, data: campaign });
  });

  listTemplates = catchAsync(async (req: Request, res: Response) => {
    const query = TemplateListSchema.parse(req.query);
    const items = await this.broadcastService.listTemplates(query);
    res.status(200).json({ success: true, data: { items }, meta: query });
  });

  previewTemplate = catchAsync(async (req: Request, res: Response) => {
    const dto = TemplatePreviewSchema.parse(req.body);
    const result = await this.broadcastService.previewTemplate(dto.templateId, dto.variables ?? []);
    res.status(200).json({ success: true, data: result });
  });
}
