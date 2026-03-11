import { query } from '@fs/shared/db';
import { v4 as uuidv4 } from 'uuid';
import { AuditLogQueryDto } from '../schemas/admin.schemas';
import { PaginatedResponse } from '@fs/shared/types';

export interface AuditLogInsert {
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  payload?: any;
}

export interface AuditLogRecord extends AuditLogInsert {
  id: string;
  createdAt: Date;
  adminName?: string;
}

export class AuditLogRepository {
  /**
   * RULE 6: INSERT-only. Must be called on every admin mutation.
   */
  async insert(data: AuditLogInsert): Promise<void> {
    const sql = `
      INSERT INTO admin_audit_logs (id, admin_id, action, target_type, target_id, payload)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    const params = [
      uuidv4(),
      data.adminId,
      data.action,
      data.targetType,
      data.targetId,
      data.payload ? JSON.stringify(data.payload) : null
    ];
    await query(sql, params);
  }

  async list(filters: AuditLogQueryDto): Promise<PaginatedResponse<AuditLogRecord>> {
    const params: any[] = [];
    let whereClause = '1=1';

    if (filters['filter[admin_id]']) {
      params.push(filters['filter[admin_id]']);
      whereClause += ` AND al.admin_id = $${params.length}`;
    }

    if (filters['filter[action]']) {
      params.push(filters['filter[action]']);
      whereClause += ` AND al.action = $${params.length}`;
    }

    if (filters['filter[created_at_from]']) {
      params.push(filters['filter[created_at_from]']);
      whereClause += ` AND al.created_at >= $${params.length}`;
    }

    if (filters.cursor) {
      params.push(filters.cursor);
      // We assume sequential UUID or created_at tiebreaker
      // For simplicity in UUIDs, we fetch created_at of cursor and filter
      whereClause += ` AND al.created_at < (SELECT created_at FROM admin_audit_logs WHERE id = $${params.length})`;
    }

    // Default limit + 1 to check for next cursor
    const qLimit = filters.limit + 1;
    params.push(qLimit);
    const limitIdx = params.length;

    const sql = `
      SELECT 
        al.id, al.admin_id as "adminId", al.action, al.target_type as "targetType", 
        al.target_id as "targetId", al.payload, al.created_at as "createdAt",
        u.name as "adminName"
      FROM admin_audit_logs al
      LEFT JOIN users u ON al.admin_id = u.id
      WHERE ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${limitIdx}
    `;

    const { rows } = await query(sql, params);
    
    let nextCursor = null;
    if (rows.length > filters.limit) {
      // Pop the extra item to determine next cursor
      const nextItem = rows.pop()!;
      nextCursor = nextItem.id;
    }

    return {
      items: rows,
      meta: {
        nextCursor
      }
    };
  }
}

export const auditLogRepository = new AuditLogRepository();
