import { Request, Response } from 'express';
import { NotificationCoordinator } from '../services/NotificationCoordinator';
import { BroadcastNotificationSchema } from '../schemas/notification.schemas';
import { catchAsync } from '@fs/shared';

export class NotificationController {
  private coordinator: NotificationCoordinator;

  constructor() {
    this.coordinator = new NotificationCoordinator();
  }

  broadcast = catchAsync(async (req: Request, res: Response) => {
    const data = BroadcastNotificationSchema.parse(req.body);
    const result = await this.coordinator.broadcast(data, req.user!.userId);
    res.status(200).json({ success: true, data: result });
  });
}
