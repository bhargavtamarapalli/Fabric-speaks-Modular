import { BaseRepository } from '@fs/shared';

export interface RefreshToken {
    id: string;
    user_id: string;
    token: string;
    expires_at: Date;
    created_at: Date;
    revoked_at: Date | null;
}

export class RefreshTokenRepository extends BaseRepository {
    async create(userId: string, token: string, expiresAt: Date): Promise<RefreshToken> {
        const result = await this.db.query<RefreshToken>(
            `INSERT INTO refresh_tokens (user_id, token, expires_at) 
             VALUES ($1, $2, $3) RETURNING *`,
            [userId, token, expiresAt]
        );
        return result.rows[0]!;
    }

    async findByToken(token: string): Promise<RefreshToken | null> {
        const result = await this.db.query<RefreshToken>(
            'SELECT * FROM refresh_tokens WHERE token = $1 AND revoked_at IS NULL',
            [token]
        );
        return result.rows[0] ?? null;
    }

    async revokeToken(token: string): Promise<void> {
        await this.db.query(
            'UPDATE refresh_tokens SET revoked_at = now() WHERE token = $1',
            [token]
        );
    }

    async revokeAllForUser(userId: string): Promise<void> {
        await this.db.query(
            'UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
            [userId]
        );
    }

    async deleteExpired(): Promise<number> {
        const result = await this.db.query(
            'DELETE FROM refresh_tokens WHERE expires_at < now() OR revoked_at IS NOT NULL'
        );
        return result.rowCount ?? 0;
    }
}
