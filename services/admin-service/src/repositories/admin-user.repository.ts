import { BaseRepository, AppError, ErrorCode } from '@fs/shared';

export interface AdminUser {
    id: string;
    name: string;
    mobile: string;
    email: string | null;
    role: string;
    firebaseUid?: string | null;
    isDeleted: boolean;
    lastActiveAt?: Date | null;
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
        
        // Filter: only show admin-capable roles, excluding 'customer'
        let query = "SELECT *, updated_at AS last_active_at, NOT is_deleted as is_active FROM users WHERE role != 'customer' AND is_deleted = false";
        const params: unknown[] = [];
        
        if (filters.role) {
            params.push(filters.role);
            query += ` AND role = $${params.length}`;
        }

        if (filters.search) {
            params.push(`%${filters.search}%`);
            query += ` AND (name ILIKE $${params.length} OR email ILIKE $${params.length} OR mobile ILIKE $${params.length})`;
        }

        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const { rows } = await this.query(query, params);
        
        // Count for meta
        let countQuery = "SELECT COUNT(*) FROM users WHERE role != 'customer' AND is_deleted = false";
        const countParams: unknown[] = [];
        if (filters.role) {
            countParams.push(filters.role);
            countQuery += ` AND role = $${countParams.length}`;
        }
        if (filters.search) {
            countParams.push(`%${filters.search}%`);
            countQuery += ` AND (name ILIKE $${countParams.length} OR email ILIKE $${countParams.length} OR mobile ILIKE $${countParams.length})`;
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
        const { rows } = await this.query('SELECT * FROM users WHERE id = $1 AND is_deleted = false', [id]);
        if (!rows.length) return null;
        return this.mapToCamelCase<AdminUser>(rows[0]);
    }

    async create(data: { name: string; mobile: string; role: string; email?: string }): Promise<AdminUser> {
        const query = `
            INSERT INTO users (name, mobile, email, role)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const { rows } = await this.query(query, [data.name, data.mobile, data.email || null, data.role]);
        return this.mapToCamelCase<AdminUser>(rows[0]);
    }

    async updateRole(id: string, role: string): Promise<AdminUser> {
        const query = 'UPDATE users SET role = $2, updated_at = now() WHERE id = $1 RETURNING *';
        const { rows } = await this.query(query, [id, role]);
        if (!rows.length) throw new AppError(ErrorCode.NOT_FOUND, 'User not found');
        return this.mapToCamelCase<AdminUser>(rows[0]);
    }

    async softDelete(id: string): Promise<boolean> {
        const query = 'UPDATE users SET is_deleted = true, updated_at = now() WHERE id = $1';
        const result = await this.query(query, [id]);
        return (result.rowCount ?? 0) > 0;
    }

    async resetSession(id: string): Promise<{ sessionVersion: number; revokedAt: Date }> {
        const query = `
            UPDATE users
            SET session_version = session_version + 1,
                session_revoked_at = now(),
                updated_at = now()
            WHERE id = $1 AND is_deleted = false
            RETURNING session_version as "sessionVersion", session_revoked_at as "revokedAt"
        `;
        const { rows } = await this.query(query, [id]);
        if (!rows.length) {
            throw new AppError(ErrorCode.NOT_FOUND, 'User not found');
        }
        return rows[0];
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
