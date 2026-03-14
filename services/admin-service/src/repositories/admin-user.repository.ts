import { BaseRepository } from '@fs/shared';

export interface AdminUser {
    id: string;
    name: string;
    mobile: string;
    role: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export class AdminUserRepository extends BaseRepository {
    async list(filters: Record<string, unknown>): Promise<{ items: AdminUser[]; meta: Record<string, unknown> }> {
        const { page = 1, limit = 20, role } = filters;
        const offset = ((page as number) - 1) * (limit as number);
        
        let query = 'SELECT * FROM admin_users WHERE is_active = true';
        const params: unknown[] = [];
        if (role) {
            params.push(role);
            query += ` AND role = $${params.length}`;
        }

        query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit as number, offset);

        const { rows } = await this.query(query, params);

        // For meta, we'd typically run a separate COUNT query for total,
        // but for now, we'll stick to the original behavior of returning rows.length
        // as the snippet didn't provide a total count query.
        return {
            items: rows.map(r => this.mapToCamelCase<AdminUser>(r)),
            meta: { total: rows.length }
        };
    }

    async findById(id: string): Promise<AdminUser | null> {
        const { rows } = await this.query('SELECT * FROM admin_users WHERE id = $1', [id]);
        if (!rows.length) return null;
        return this.mapToCamelCase<AdminUser>(rows[0]);
    }

    async create(data: Record<string, unknown>): Promise<AdminUser> {
        const query = `
            INSERT INTO admin_users (name, mobile, role)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        const { rows } = await this.query(query, [data.name, data.mobile, data.role]);
        return this.mapToCamelCase<AdminUser>(rows[0]);
    }

    async updateRole(id: string, role: string): Promise<AdminUser> {
        const query = 'UPDATE admin_users SET role = $2, updated_at = now() WHERE id = $1 RETURNING *';
        const { rows } = await this.query(query, [id, role]);
        if (!rows.length) throw new Error('User not found');
        return this.mapToCamelCase<AdminUser>(rows[0]);
    }

    async softDelete(id: string): Promise<boolean> {
        const query = 'UPDATE admin_users SET is_active = false, updated_at = now() WHERE id = $1';
        const result = await this.query(query, [id]);
        return (result.rowCount ?? 0) > 0;
    }
}
