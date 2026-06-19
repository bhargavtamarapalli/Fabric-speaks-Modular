import { BaseRepository, DbClient } from '@fs/shared';

export interface AuditLogDto {
  adminId: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeJson?: any;
  afterJson?: any;
  ipAddress?: string;
}

export class AuditLogRepository extends BaseRepository {
  private sanitizeAuditData(data: any): any {
    if (!data) return null;
    try {
      const sanitized = JSON.parse(JSON.stringify(data));
      const sensitiveKeys = ['basePrice', 'salePrice', 'priceOverride', 'cost', 'base_price', 'sale_price', 'price_override', 'password'];
      const mask = (obj: any) => {
        if (Array.isArray(obj)) obj.forEach(mask);
        else if (obj && typeof obj === 'object') {
          for (const key of Object.keys(obj)) {
            if (sensitiveKeys.includes(key) && obj[key] !== undefined && obj[key] !== null) {
              obj[key] = '[REDACTED]';
            } else {
              mask(obj[key]);
            }
          }
        }
      };
      mask(sanitized);
      return sanitized;
    } catch {
      return null;
    }
  }

  async insert(dto: Partial<AuditLogDto>, client?: DbClient): Promise<void> {
    const db = client || this.db;
    
    // Auto-fill missing halves so we always store a consistent shape if possible
    let finalBefore = this.sanitizeAuditData(dto.beforeJson) || null;
    let finalAfter = this.sanitizeAuditData(dto.afterJson) || null;
    
    await db.query(
      `INSERT INTO admin_audit_log
            (admin_id, action, entity_type, entity_id, before_json, after_json, ip_address)
            VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        dto.adminId,
        dto.action,
        dto.entityType,
        dto.entityId,
        finalBefore,
        finalAfter,
        dto.ipAddress || null,
      ]
    );
  }
}
