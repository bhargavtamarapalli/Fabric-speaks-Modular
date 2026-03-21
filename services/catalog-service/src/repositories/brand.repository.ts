import { BaseRepository, Brand, IBrandRepository } from '@fs/shared';

export { Brand };

export class BrandRepository extends BaseRepository implements IBrandRepository {
    async findAll(includeInactive = false): Promise<Brand[]> {
        const result = await this.query(
            `SELECT * FROM brands
             WHERE is_deleted = false ${includeInactive ? '' : 'AND is_active = true'}
             ORDER BY name ASC`
        );
        return result.rows.map(row => this.mapToCamelCase<Brand>(row));
    }

    async findAllActive(): Promise<Brand[]> {
        return this.findAll(false);
    }

    async findById(id: string): Promise<Brand | null> {
        const result = await this.query(
            'SELECT * FROM brands WHERE id = $1 AND is_deleted = false',
            [id]
        );
        return result.rows[0] ? this.mapToCamelCase<Brand>(result.rows[0]) : null;
    }

    async create(dto: { name: string, slug: string, story?: string, logoUrl?: string }): Promise<Brand> {
        const result = await this.query(
            'INSERT INTO brands (name, slug, story, logo_url) VALUES ($1, $2, $3, $4) RETURNING *',
            [dto.name, dto.slug, dto.story, dto.logoUrl]
        );
        return this.mapToCamelCase<Brand>(result.rows[0]);
    }

    async update(id: string, dto: { name?: string; slug?: string; story?: string; logoUrl?: string; isActive?: boolean }): Promise<Brand> {
        const updates: string[] = [];
        const values: any[] = [id];
        let i = 2;

        if (dto.name !== undefined) { updates.push(`name = $${i++}`); values.push(dto.name); }
        if (dto.slug !== undefined) { updates.push(`slug = $${i++}`); values.push(dto.slug); }
        if (dto.story !== undefined) { updates.push(`story = $${i++}`); values.push(dto.story); }
        if (dto.logoUrl !== undefined) { updates.push(`logo_url = $${i++}`); values.push(dto.logoUrl || null); }
        if (dto.isActive !== undefined) { updates.push(`is_active = $${i++}`); values.push(dto.isActive); }

        if (updates.length === 0) {
            return this.findById(id) as Promise<Brand>;
        }

        const result = await this.query(
            `UPDATE brands SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`,
            values
        );
        return this.mapToCamelCase<Brand>(result.rows[0]);
    }
}
