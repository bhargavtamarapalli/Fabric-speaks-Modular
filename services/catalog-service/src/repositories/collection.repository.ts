import { BaseRepository } from '@fs/shared';

export interface Collection {
    id: string;
    name: string;
    slug: string;
    type: 'smart' | 'manual';
    rules_json?: any;
    heroImageMobileUrl?: string;
    heroImageDesktopUrl?: string;
    description?: string;
    isActive: boolean;
    createdAt: Date;
}

export class CollectionRepository extends BaseRepository {
    async findBySlug(slug: string): Promise<Collection | null> {
        const result = await this.query(
            'SELECT * FROM collections WHERE slug = $1 AND is_deleted = false',
            [slug]
        );
        return result.rows[0] ? this.mapToCamelCase<Collection>(result.rows[0]) : null;
    }

    async findAllActive(): Promise<Collection[]> {
        const result = await this.query(
            'SELECT * FROM collections WHERE is_active = true AND is_deleted = false ORDER BY created_at DESC'
        );
        return result.rows.map(row => this.mapToCamelCase<Collection>(row));
    }

    async findProductsByCollectionId(collectionId: string): Promise<string[]> {
        const result = await this.query(
            'SELECT product_id FROM collection_products WHERE collection_id = $1 ORDER BY display_order ASC',
            [collectionId]
        );
        return result.rows.map(row => row.product_id);
    }

    async create(dto: { name: string, slug: string, type: 'smart' | 'manual', rules_json?: any, heroImageMobileUrl?: string, heroImageDesktopUrl?: string, description?: string, isActive?: boolean }): Promise<Collection> {
        const result = await this.query(
            `INSERT INTO collections (name, slug, type, rules_json, hero_image_mobile_url, hero_image_desktop_url, description, is_active) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [dto.name, dto.slug, dto.type, dto.rules_json, dto.heroImageMobileUrl, dto.heroImageDesktopUrl, dto.description, dto.isActive ?? true]
        );
        return this.mapToCamelCase<Collection>(result.rows[0]);
    }
}
