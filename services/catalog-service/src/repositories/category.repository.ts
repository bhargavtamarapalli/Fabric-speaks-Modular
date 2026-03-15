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
        const result = await this.query(
            `INSERT INTO categories (name, slug, description, image_url, display_order, is_active) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [dto.name, dto.slug, dto.description, dto.imageUrl, dto.displayOrder ?? 0, dto.isActive ?? true]
        );
        return this.mapToCamelCase<Category>(result.rows[0]);
    }

    async update(id: string, dto: any): Promise<Category> {
        const updates: string[] = [];
        const values: any[] = [id];
        let i = 2;

        if (dto.name !== undefined) { updates.push(`name = $${i++}`); values.push(dto.name); }
        if (dto.slug !== undefined) { updates.push(`slug = $${i++}`); values.push(dto.slug); }
        if (dto.description !== undefined) { updates.push(`description = $${i++}`); values.push(dto.description); }
        if (dto.imageUrl !== undefined) { updates.push(`image_url = $${i++}`); values.push(dto.imageUrl); }
        if (dto.displayOrder !== undefined) { updates.push(`display_order = $${i++}`); values.push(dto.displayOrder); }
        if (dto.isActive !== undefined) { updates.push(`is_active = $${i++}`); values.push(dto.isActive); }

        if (updates.length === 0) return this.findById(id) as Promise<Category>;

        const result = await this.query(
            `UPDATE categories SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`,
            values
        );
        return this.mapToCamelCase<Category>(result.rows[0]);
    }
}
