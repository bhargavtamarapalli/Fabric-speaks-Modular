import { BaseRepository } from '@fs/shared';

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  mobile: string;
  firebaseUid: string;
  role: string;
  createdAt: Date;
}

export class CustomerRepository extends BaseRepository {
  async lookup(query: string): Promise<Customer[]> {
    const sql = `
      SELECT id, name, email, mobile, firebase_uid, role, created_at
      FROM users
      WHERE role = 'customer'
        AND is_deleted = false
        AND (
          name ILIKE $1 
          OR email ILIKE $1 
          OR mobile ILIKE $1
        )
      LIMIT 10
    `;
    const searchTerm = `%${query}%`;
    const result = await this.query(sql, [searchTerm]);
    return result.rows.map(row => this.mapToCamelCase<Customer>(row));
  }
}
