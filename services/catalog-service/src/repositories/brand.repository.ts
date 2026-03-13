import { BaseRepository, Brand, IBrandRepository } from '@fs/shared';

export { Brand };

export class BrandRepository extends BaseRepository implements IBrandRepository {
    async findAllActive(): Promise<Brand[]> {
        const result = await this.query(
            'SELECT * FROM brands WHERE is_active = true AND is_deleted = false ORDER BY name ASC'
        );
        return result.rows.map(row => this.mapToCamelCase<Brand>(row));
    }

    async create(dto: { name: string, slug: string, story?: string, logoUrl?: string }): Promise<Brand> {
        const result = await this.query(
            'INSERT INTO brands (name, slug, story, logo_url) VALUES ($1, $2, $3, $4) RETURNING *',
            [dto.name, dto.slug, dto.story, dto.logoUrl]
        );
        return this.mapToCamelCase<Brand>(result.rows[0]);
    }
}
