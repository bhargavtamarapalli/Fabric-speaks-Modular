import { BaseRepository } from '@fs/shared';
import crypto from 'crypto';

export interface User {
    id: string;
    mobile: string | null;
    mobile_hash: string | null;
    name: string | null;
    email: string | null;
    password_hash?: string | null;
    email_verified?: boolean;
    firebase_uid?: string | null;
    role: string;
    whatsapp_enabled: boolean;
    is_deleted: boolean;
    session_version?: number;
    session_revoked_at?: Date | null;
}

export interface IUserRepository {
    findById(id: string): Promise<User | null>;
    findByMobileHash(hash: string): Promise<User | null>;
    findByFirebaseUid(firebaseUid: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    createCustomer(mobile: string, hash: string, firebaseUid: string): Promise<User>;
    createWithEmail(data: { email: string, name?: string, passwordHash: string }): Promise<User>;
    updateProfile(id: string, data: Partial<User>): Promise<User>;
    updateRole(id: string, role: string): Promise<User>;
    softDeleteCustomer(id: string): Promise<void>;
}

export class UserRepository extends BaseRepository implements IUserRepository {
    async findById(id: string): Promise<User | null> {
        const result = await this.db.query<User>(
            'SELECT * FROM users WHERE id = $1 AND is_deleted = false',
            [id]
        );
        return result.rows[0] ?? null;
    }

    async findByMobileHash(hash: string): Promise<User | null> {
        const result = await this.db.query<User>(
            'SELECT * FROM users WHERE mobile_hash = $1 AND is_deleted = false',
            [hash]
        );
        return result.rows[0] ?? null;
    }

    async findByFirebaseUid(firebaseUid: string): Promise<User | null> {
        const result = await this.db.query<User>(
            'SELECT * FROM users WHERE firebase_uid = $1 AND is_deleted = false',
            [firebaseUid]
        );
        return result.rows[0] ?? null;
    }

    async findByEmail(email: string): Promise<User | null> {
        const result = await this.db.query<User>(
            'SELECT * FROM users WHERE email = $1 AND is_deleted = false',
            [email]
        );
        return result.rows[0] ?? null;
    }

    async createCustomer(mobile: string, hash: string, firebaseUid: string): Promise<User> {
        const result = await this.db.query<User>(
            `INSERT INTO users (mobile, mobile_hash, firebase_uid, role) 
       VALUES ($1, $2, $3, 'customer') RETURNING *`,
            [mobile, hash, firebaseUid]
        );
        return result.rows[0]!;
    }

    async createWithEmail(data: { email: string, name?: string, passwordHash: string }): Promise<User> {
        const result = await this.db.query<User>(
            `INSERT INTO users (email, name, password_hash, role) 
       VALUES ($1, $2, $3, 'customer') RETURNING *`,
            [data.email, data.name || null, data.passwordHash]
        );
        return result.rows[0]!;
    }

    async updateProfile(id: string, data: Partial<User>): Promise<User> {
        const keys = Object.keys(data).filter(k => data[k as keyof User] !== undefined);
        if (keys.length === 0) return (await this.findById(id))!;

        const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
        const values = keys.map(k => data[k as keyof User]);

        const result = await this.db.query<User>(
            `UPDATE users SET ${setClause}, updated_at = now() WHERE id = $1 RETURNING *`,
            [id, ...values]
        );
        return result.rows[0]!;
    }

    async updateRole(id: string, role: string): Promise<User> {
        const result = await this.db.query<User>(
            `UPDATE users SET role = $2, updated_at = now() WHERE id = $1 RETURNING *`,
            [id, role]
        );
        return result.rows[0]!;
    }

    async softDeleteCustomer(id: string): Promise<void> {
        const mobileHash = crypto.createHash('sha256').update(id).digest('hex');
        await this.db.query(
            `UPDATE users 
       SET is_deleted = true, 
           deleted_at = now(), 
           mobile = $1, 
           mobile_hash = $2, 
           name = NULL, 
           email = NULL 
       WHERE id = $3 AND is_deleted = false`,
            [mobileHash, mobileHash, id] // DPDPA: Both fields hashed per 6 RULES
        );
    }
}
