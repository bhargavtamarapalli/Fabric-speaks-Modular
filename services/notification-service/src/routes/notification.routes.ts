import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { requireAuth, requireRole } from '@fs/shared';

const router = Router();
const controller = new NotificationController();

router.post('/admin/broadcast', requireAuth, requireRole('superAdmin'), controller.broadcast);
router.post('/admin/broadcast/estimate', requireAuth, requireRole('superAdmin'), controller.estimateBroadcast);
router.post('/admin/broadcast/campaigns', requireAuth, requireRole('superAdmin'), controller.createCampaign);
router.get('/admin/broadcast/campaigns', requireAuth, requireRole('superAdmin'), controller.listCampaigns);
router.get('/admin/broadcast/campaigns/:id', requireAuth, requireRole('superAdmin'), controller.getCampaign);
router.get('/admin/broadcast/templates', requireAuth, requireRole('superAdmin'), controller.listTemplates);
router.post('/admin/broadcast/preview', requireAuth, requireRole('superAdmin'), controller.previewTemplate);

export default router;
