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

export interface AdminListFilters {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
}

export class AdminUserRepository extends BaseRepository {
    async list(filters: AdminListFilters): Promise<{ items: AdminUser[]; meta: { total: number; page: number; limit: number } }> {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const offset = (page - 1) * limit;
        
        let query = 'SELECT * FROM admin_users WHERE is_active = true';
        const params: unknown[] = [];
        
        if (filters.role) {
            params.push(filters.role);
            query += ` AND role = $${params.length}`;
        }

        if (filters.search) {
            params.push(`%${filters.search}%`);
            query += ` AND (name ILIKE $${params.length} OR mobile ILIKE $${params.length})`;
        }

        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const { rows } = await this.query(query, params);
        
        // Count for meta
        let countQuery = 'SELECT COUNT(*) FROM admin_users WHERE is_active = true';
        const countParams: unknown[] = [];
        if (filters.role) {
            countParams.push(filters.role);
            countQuery += ' AND role = $1';
        }
        const countRes = await this.query(countQuery, countParams);

        return {
            items: rows.map(r => this.mapToCamelCase<AdminUser>(r)),
            meta: { 
                total: parseInt(countRes.rows[0].count),
                page,
                limit
            }
        };
    }

    async findById(id: string): Promise<AdminUser | null> {
        const { rows } = await this.query('SELECT * FROM admin_users WHERE id = $1', [id]);
        if (!rows.length) return null;
        return this.mapToCamelCase<AdminUser>(rows[0]);
    }

    async create(data: { name: string; mobile: string; role: string }): Promise<AdminUser> {
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

    // Dashboard Methods
    async getFailedPaymentsCount() {
        const { rows } = await this.query("SELECT COUNT(*) FROM payments WHERE status = 'FAILED'");
        return { count: parseInt(rows[0].count), trend: 'up' }; // trend mock for now
    }

    async getCODOrderStats() {
        const { rows } = await this.query("SELECT COUNT(*) FROM orders WHERE payment_method = 'COD' AND created_at > (now() - interval '24 hours')");
        return { count: parseInt(rows[0].count), window_hours: 24 };
    }

    async getLogisticsIssues() {
        const { rows } = await this.query("SELECT COUNT(*) FROM orders WHERE status = 'SHIPPED' AND updated_at < (now() - interval '3 days')");
        return { count: parseInt(rows[0].count), provider: 'Shiprocket' };
    }

    async getFraudFlags() {
        const { rows } = await this.query("SELECT COUNT(*) FROM orders WHERE cod_fraud_flag = true");
        return { count: parseInt(rows[0].count), level: 'critical' };
    }

    async getOrdersSummary() {
        const { rows } = await this.query("SELECT status, COUNT(*) as count FROM orders GROUP BY status");
        const summary: Record<string, number> = {};
        rows.forEach(r => {
            summary[r.status] = parseInt(r.count);
        });
        return summary;
    }
}
