import { query } from '@fs/shared/db';
import { v4 as uuidv4 } from 'uuid';
import { AdminListQueryDto } from '../schemas/admin.schemas';
import { PaginatedResponse } from '@fs/shared/types';

export interface AdminUser {
  id: string;
  name: string;
  mobile: string;
  role: string;
  createdAt: Date;
  isDeleted: boolean;
}

export class AdminUserRepository {
  async list(filters: AdminListQueryDto): Promise<PaginatedResponse<AdminUser>> {
    const params: any[] = [];
    // Only return admin roles
    let whereClause = `u.role IN ('superAdmin', 'inventoryManager', 'supportAgent') AND u.is_deleted = false`;

    if (filters['filter[role]']) {
      params.push(filters['filter[role]']);
      whereClause += ` AND u.role = $${params.length}`;
    }

    const { page, limit } = filters;
    const offset = (page - 1) * limit;

    const sql = `
      SELECT id, name, mobile, role, created_at as "createdAt", is_deleted as "isDeleted"
      FROM users u
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const countSql = `SELECT COUNT(*) FROM users u WHERE ${whereClause}`;

    const [dataRes, countRes] = await Promise.all([
      query(sql, [...params, limit, offset]),
      query(countSql, params)
    ]);

    const total = parseInt(countRes.rows[0].count, 10);

    return {
      items: dataRes.rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findById(id: string): Promise<AdminUser | null> {
    const { rows } = await query(`
      SELECT id, name, mobile, role, created_at as "createdAt", is_deleted as "isDeleted"
      FROM users 
      WHERE id = $1 AND is_deleted = false
    `, [id]);
    
    return rows[0] || null;
  }

  async create(data: { name: string; mobile: string; role: string }): Promise<AdminUser> {
    const id = uuidv4();
    const { rows } = await query(`
      INSERT INTO users (id, name, mobile, role, is_new_user)
      VALUES ($1, $2, $3, $4, false)
      RETURNING id, name, mobile, role, created_at as "createdAt", is_deleted as "isDeleted"
    `, [id, data.name, data.mobile, data.role]);
    return rows[0];
  }

  async updateRole(id: string, role: string): Promise<AdminUser | null> {
    const { rows } = await query(`
      UPDATE users 
      SET role = $1
      WHERE id = $2 AND is_deleted = false
      RETURNING id, name, mobile, role, created_at as "createdAt", is_deleted as "isDeleted"
    `, [role, id]);
    return rows[0] || null;
  }

  async softDelete(id: string): Promise<boolean> {
    const { rowCount } = await query(`
      UPDATE users SET is_deleted = true WHERE id = $1 AND is_deleted = false
    `, [id]);
    return (rowCount ?? 0) > 0;
  }
}

export const adminUserRepository = new AdminUserRepository();
