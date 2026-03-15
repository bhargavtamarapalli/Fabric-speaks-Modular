import { SettingsRepository } from '../repositories/settings.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { getRedisClient, AppError, ErrorCode, logger } from '@fs/shared';
import { v5 as uuidv5 } from 'uuid';

// Allowed public keys that storefront can view without JWT
const PUBLIC_KEYS = ['store_name', 'free_shipping_above', 'cod_enabled'];

const ALLOWED_SETTING_KEYS = new Set([
  'store_name',
  'store_email',
  'store_phone',
  'gst_number',
  'free_shipping_above',
  'cod_enabled',
  'stock_alert_threshold',
  'razorpay_live_mode',
  'admin_whatsapp',
  'inventory_manager_whatsapp',
  'admin_notification_preferences'
]);
const STORE_SETTING_NAMESPACE = '2bb80d53-54f9-4b8d-8ca2-4150bc4b7d33';

export class SettingsService {
  constructor(
    private settingsRepo: SettingsRepository,
    private auditLogRepo: AuditLogRepository
  ) {}

  async getAllSettings(): Promise<Record<string, string>> {
    // Check cache first
    const redis = getRedisClient();
    const cacheKey = 'settings:all';
    
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      logger.warn('Failed to read settings from Redis cache', e);
    }

    // Cache miss or Redis error — fetch from DB
    const settings = await this.settingsRepo.getAll();
    
    // Set cache for 5 minutes (300s)
    try {
      await redis.setex(cacheKey, 300, JSON.stringify(settings));
    } catch (e) {
      logger.warn('Failed to write settings to Redis cache', e);
    }

    return settings;
  }

  async getPublicSettings(): Promise<Record<string, string>> {
    // Check cache first
    const redis = getRedisClient();
    const cacheKey = 'settings:public';
    
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      logger.warn('Failed to read public settings from Redis', e);
    }

    // Cache miss — fetch only public keys from DB
    const settings = await this.settingsRepo.getMultiple(PUBLIC_KEYS);
    
    // Set cache for 5 minutes
    try {
      await redis.setex(cacheKey, 300, JSON.stringify(settings));
    } catch (e) {
      logger.warn('Failed to write public settings to Redis', e);
    }

    return settings;
  }

  async updateSetting(key: string, value: string, adminId: string): Promise<any> {
    if (!ALLOWED_SETTING_KEYS.has(key)) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, `Unsupported setting key: ${key}`);
    }

    // Fetch previous value for audit log
    const oldValue = await this.settingsRepo.getByKey(key);
    
    // Save to DB
    const updated = await this.settingsRepo.upsert(key, value, adminId);
    
    // Invalidate caches
    const redis = getRedisClient();
    try {
      await redis.del('settings:all');
      if (PUBLIC_KEYS.includes(key)) {
        await redis.del('settings:public');
      }
    } catch (e) {
      logger.error('Failed to invalidate settings cache during update', e);
    }

    // RULE 6: Audit log for admin write
    await this.auditLogRepo.insert({
      adminId,
      action: 'UPDATE_STORE_SETTING',
      entityType: 'STORE_SETTING',
      entityId: uuidv5(key, STORE_SETTING_NAMESPACE),
      beforeJson: oldValue !== null ? { value: oldValue } : null,
      afterJson: { value }
    });

    return updated;
  }
}
