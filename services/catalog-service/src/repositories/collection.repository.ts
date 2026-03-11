import { Pool } from 'pg';

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

export class CollectionRepository {
    constructor(private db: Pool) {}

    async findBySlug(slug: string): Promise<Collection | null> {
        const result = await this.db.query(
            'SELECT * FROM collections WHERE slug = $1 AND is_deleted = false',
            [slug]
        );
        return result.rows[0] ? this.mapCollection(result.rows[0]) : null;
    }

    async findAllActive(): Promise<Collection[]> {
        const result = await this.db.query(
            'SELECT * FROM collections WHERE is_active = true AND is_deleted = false ORDER BY created_at DESC'
        );
        return result.rows.map(row => this.mapCollection(row));
    }

    async findProductsByCollectionId(collectionId: string): Promise<string[]> {
        const result = await this.db.query(
            'SELECT product_id FROM collection_products WHERE collection_id = $1 ORDER BY display_order ASC',
            [collectionId]
        );
        return result.rows.map(row => row.product_id);
    }

    private mapCollection(row: any): Collection {
        return {
            id: row.id,
            name: row.name,
            slug: row.slug,
            type: row.type,
            rules_json: row.rules_json,
            heroImageMobileUrl: row.hero_image_mobile_url,
            heroImageDesktopUrl: row.hero_image_desktop_url,
            description: row.description,
            isActive: row.is_active,
            createdAt: row.created_at,
        };
    }
}
