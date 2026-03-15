import { BaseRepository, Category, ICategoryRepository } from '@fs/shared';

export { Category };

export class CategoryRepository extends BaseRepository implements ICategoryRepository {
    async findAllActive(): Promise<Category[]> {
        const result = await this.query(
            'SELECT * FROM categories WHERE is_active = true AND is_deleted = false ORDER BY display_order ASC, name ASC'
        );
        return result.rows.map(row => this.mapToCamelCase<Category>(row));
    }

    async findById(id: string): Promise<Category | null> {
        const result = await this.query(
            'SELECT * FROM categories WHERE id = $1 AND is_deleted = false',
            [id]
        );
        return result.rows[0] ? this.mapToCamelCase<Category>(result.rows[0]) : null;
    }

    async create(dto: any): Promise<Category> {
        const columns = Object.keys(dto).map(k => k.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`));
        const values = Object.values(dto);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

        const result = await this.query(
            `INSERT INTO categories (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
            values
        );
        return this.mapToCamelCase<Category>(result.rows[0]);
    }

    async update(id: string, dto: any): Promise<Category> {
        const updates: string[] = [];
        const values: any[] = [id];
        let i = 2;

        for (const [key, value] of Object.entries(dto)) {
            const snakeKey = key.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
            updates.push(`${snakeKey} = $${i++}`);
            values.push(value);
        }

        const result = await this.query(
            `UPDATE categories SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`,
            values
        );
        return this.mapToCamelCase<Category>(result.rows[0]);
    }
}
