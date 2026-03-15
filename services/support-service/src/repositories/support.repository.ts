import { BaseRepository, maskMobile, PaginatedResponse } from '@fs/shared';
import { v4 as uuidv4 } from 'uuid';
import { SupportQueueQueryDto } from '../schemas/support.schemas';

export class SupportRepository extends BaseRepository {
  async listQueue(filters: SupportQueueQueryDto): Promise<PaginatedResponse<any>> {
    const params: any[] = [];
    let whereClause = '1=1';

    if (filters['filter[status]']) {
      params.push(filters['filter[status]']);
      whereClause += ` AND q.status = $${params.length}`;
    }

    if (filters['filter[priority]']) {
      params.push(filters['filter[priority]']);
      whereClause += ` AND q.priority = $${params.length}`;
    }

    const { page, limit } = filters;
    const offset = (page - 1) * limit;

    const sql = `
      SELECT 
        q.id, q.type, q.priority, q.status, 
        q.order_id as "orderId", q.summary,
        q.wa_window_status as "waWindowStatus",
        q.created_at as "createdAt",
        u.mobile as "customerMobile"
      FROM support_queries q
      LEFT JOIN users u ON q.user_id = u.id
      WHERE ${whereClause}
      ORDER BY q.priority ASC, q.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const countSql = `SELECT COUNT(*) FROM support_queries q WHERE ${whereClause}`;

    const [dataRes, countRes] = await Promise.all([
      this.query(sql, [...params, limit, offset]),
      this.query(countSql, params)
    ]);

    const total = parseInt(countRes.rows[0].count, 10);

    // RULE 5 compliance: mask mobile on egress
    const items = dataRes.rows.map(row => ({
      ...row,
      customerMobile: row.customerMobile ? maskMobile(row.customerMobile) : null
    }));

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  async findById(caseId: string): Promise<any | null> {
    const { rows } = await this.query(`
      SELECT
        q.*,
        u.name as "customerName",
        u.mobile as "customerMobile",
        EXISTS (
          SELECT 1
          FROM consent_log cl
          WHERE cl.user_id = u.id
            AND cl.channel = 'whatsapp'
            AND cl.opted_out_at IS NULL
        ) as "isWaOptedIn"
      FROM support_queries q
      LEFT JOIN users u ON q.user_id = u.id
      WHERE q.id = $1
    `, [caseId]);

    if (!rows[0]) return null;

    const caseData = rows[0];
    const userId = caseData.user_id;
    caseData.customerMobile = maskMobile(caseData.customerMobile); // RULE 5

    // Fetch notes separately
    const noteRes = await this.query(`
      SELECT n.id, n.text, n.created_at as "createdAt", u.name as "agentName"
      FROM support_query_notes n
      LEFT JOIN users u ON n.admin_id = u.id
      WHERE n.query_id = $1
      ORDER BY n.created_at ASC
    `, [caseId]);

    // Fetch WhatsApp log (SUP-08)
    const waLogRes = await this.query(`
      SELECT channel, template_id as "templateId", status, sent_at as "sentAt"
      FROM notification_log
      WHERE user_id = $1 AND channel = 'whatsapp'
      ORDER BY sent_at DESC
      LIMIT 10
    `, [userId]);

    return {
      id: caseData.id,
      type: caseData.type,
      priority: caseData.priority,
      status: caseData.status,
      waWindowStatus: caseData.wa_window_status,
      customer: {
        id: userId,
        name: caseData.customerName,
        mobile: caseData.customerMobile,
        isWaOptedIn: caseData.isWaOptedIn
      },
      orderId: caseData.order_id,
      notes: noteRes.rows,
      whatsappLog: waLogRes.rows
    };
  }

  async updateStatus(caseId: string, status?: string, priority?: string): Promise<void> {
    const setParts: string[] = [];
    const params: any[] = [caseId];
    let paramIdx = 2;

    if (status) { setParts.push(`status = $${paramIdx++}`); params.push(status); }
    if (priority) { setParts.push(`priority = $${paramIdx++}`); params.push(priority); }

    if (setParts.length > 0) {
      setParts.push(`updated_at = NOW()`);
      await this.query(`UPDATE support_queries SET ${setParts.join(', ')} WHERE id = $1`, params);
    }
  }

  // INSERT-only for agent notes
  async addNote(caseId: string, adminId: string, text: string): Promise<void> {
    await this.query(`
      INSERT INTO support_query_notes (id, query_id, admin_id, text)
      VALUES ($1, $2, $3, $4)
    `, [uuidv4(), caseId, adminId, text]);
  }
}
