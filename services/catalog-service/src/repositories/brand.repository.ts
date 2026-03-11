import { Pool } from 'pg';

export interface Brand {
    id: string;
    name: string;
    slug: string;
    story?: string;
    logoUrl?: string;
    isActive: boolean;
    createdAt: Date;
}

export class BrandRepository {
    constructor(private db: Pool) {}

    async findAllActive(): Promise<Brand[]> {
        const result = await this.db.query(
            'SELECT * FROM brands WHERE is_active = true AND is_deleted = false ORDER BY name ASC'
        );
        return result.rows.map(row => this.mapBrand(row));
    }

    async create(dto: { name: string, slug: string, story?: string, logoUrl?: string }): Promise<Brand> {
        const result = await this.db.query(
            'INSERT INTO brands (name, slug, story, logo_url) VALUES ($1, $2, $3, $4) RETURNING *',
            [dto.name, dto.slug, dto.story, dto.logoUrl]
        );
        return this.mapBrand(result.rows[0]);
    }

    private mapBrand(row: any): Brand {
        return {
            id: row.id,
            name: row.name,
            slug: row.slug,
            story: row.story,
            logoUrl: row.logo_url,
            isActive: row.is_active,
            createdAt: row.created_at,
        };
    }
}
