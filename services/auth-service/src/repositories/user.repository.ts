import { AppError, ErrorCode, BaseRepository } from '@fs/shared';
import crypto from 'crypto';

export interface User {
    id: string;
    mobile: string;
    mobile_hash: string;
    name: string | null;
    email: string | null;
    firebase_uid: string;
    role: string;
    is_deleted: boolean;
}

export interface IUserRepository {
    findById(id: string): Promise<User | null>;
    findByMobileHash(hash: string): Promise<User | null>;
    findByFirebaseUid(firebaseUid: string): Promise<User | null>;
    createCustomer(mobile: string, hash: string, firebaseUid: string): Promise<User>;
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

    async createCustomer(mobile: string, hash: string, firebaseUid: string): Promise<User> {
        const result = await this.db.query<User>(
            `INSERT INTO users (mobile, mobile_hash, firebase_uid, role) 
       VALUES ($1, $2, $3, 'customer') RETURNING *`,
            [mobile, hash, firebaseUid]
        );
        return result.rows[0]!;
    }

    async softDeleteCustomer(id: string): Promise<void> {
        const hash = crypto.createHash('sha256').update(Date.now().toString()).digest('hex');
        await this.db.query(
            `UPDATE users 
       SET is_deleted = true, 
           deleted_at = now(), 
           mobile = $1, 
           mobile_hash = $2, 
           name = NULL, 
           email = NULL 
       WHERE id = $3 AND is_deleted = false`,
            [`deleted_${id.slice(0, 5)}`, hash, id] // DPDPA right to erasure
        );
    }
}
