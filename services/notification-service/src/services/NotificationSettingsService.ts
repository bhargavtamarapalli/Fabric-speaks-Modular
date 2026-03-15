import { getDbPool, getRedisClient, logger } from '@fs/shared';
import { SettingsRepository } from '../repositories/SettingsRepository';

export interface NotificationPreferences {
  new_orders: boolean;
  cod_orders: boolean;
  stock_critical: boolean;
  stock_low: boolean;
  returns: boolean;
  payment_failed: boolean;
  large_orders: boolean;
  admin_user_created: boolean;
  failed_admin_login: boolean;
  pickup_failed: boolean;
}

export interface NotificationSettings {
  adminWhatsapp: string | null;
  inventoryManagerWhatsapp: string | null;
  preferences: NotificationPreferences;
}

const SETTINGS_KEYS = [
  'admin_whatsapp',
  'inventory_manager_whatsapp',
  'admin_notification_preferences'
];

const DEFAULT_PREFERENCES: NotificationPreferences = {
  new_orders: true,
  cod_orders: true,
  stock_critical: true,
  stock_low: true,
  returns: true,
  payment_failed: true,
  large_orders: true,
  admin_user_created: true,
  failed_admin_login: true,
  pickup_failed: true
};

const normalizePhone = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('+')) {
    return trimmed;
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }

  return trimmed;
};

const parsePreferences = (raw: string | undefined): NotificationPreferences => {
  if (!raw) {
    return { ...DEFAULT_PREFERENCES };
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const preferences = { ...DEFAULT_PREFERENCES };
    Object.keys(preferences).forEach((key) => {
      if (typeof parsed[key] === 'boolean') {
        (preferences as Record<string, boolean>)[key] = parsed[key] as boolean;
      }
    });
    return preferences;
  } catch (error) {
    logger.warn('Failed to parse admin notification preferences, using defaults.', error);
    return { ...DEFAULT_PREFERENCES };
  }
};

export class NotificationSettingsService {
  private settingsRepo: SettingsRepository;

  constructor() {
    const db = getDbPool();
    this.settingsRepo = new SettingsRepository(db);
  }

  async getNotificationSettings(): Promise<NotificationSettings> {
    const cacheKey = 'settings:notification';
    const redis = getRedisClient();

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as NotificationSettings;
      }
    } catch (error) {
      logger.warn('Failed to read notification settings from Redis cache.', error);
    }

    const settings = await this.settingsRepo.getMultiple(SETTINGS_KEYS);

    const result: NotificationSettings = {
      adminWhatsapp: normalizePhone(settings.admin_whatsapp),
      inventoryManagerWhatsapp: normalizePhone(settings.inventory_manager_whatsapp),
      preferences: parsePreferences(settings.admin_notification_preferences)
    };

    try {
      await redis.setex(cacheKey, 300, JSON.stringify(result));
    } catch (error) {
      logger.warn('Failed to cache notification settings.', error);
    }

    return result;
  }
}
