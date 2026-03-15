import { BaseRepository, ICollectionRepository, Collection } from '@fs/shared';

export { Collection };

export class CollectionRepository extends BaseRepository implements ICollectionRepository {
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

    async create(dto: any): Promise<Collection> {
        const result = await this.query(
            `INSERT INTO collections (name, slug, type, rules_json, hero_image_mobile_url, hero_image_desktop_url, description, is_active, display_order) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [dto.name, dto.slug, dto.type, dto.rules_json, dto.heroImageMobileUrl, dto.heroImageDesktopUrl, dto.description, dto.isActive ?? true, dto.displayOrder ?? 0]
        );
        return this.mapToCamelCase<Collection>(result.rows[0]);
    }
    async findById(id: string): Promise<Collection | null> {
        const result = await this.query(
            'SELECT * FROM collections WHERE id = $1 AND is_deleted = false',
            [id]
        );
        return result.rows[0] ? this.mapToCamelCase<Collection>(result.rows[0]) : null;
    }

    async update(id: string, dto: any): Promise<Collection> {
        const updates: string[] = [];
        const values: any[] = [id];
        let i = 2;

        if (dto.name !== undefined) { updates.push(`name = $${i++}`); values.push(dto.name); }
        if (dto.slug !== undefined) { updates.push(`slug = $${i++}`); values.push(dto.slug); }
        if (dto.type !== undefined) { updates.push(`type = $${i++}`); values.push(dto.type); }
        if (dto.rulesJson !== undefined) { updates.push(`rules_json = $${i++}`); values.push(JSON.stringify(dto.rulesJson)); }
        if (dto.heroImageMobileUrl !== undefined) { updates.push(`hero_image_mobile_url = $${i++}`); values.push(dto.heroImageMobileUrl); }
        if (dto.heroImageDesktopUrl !== undefined) { updates.push(`hero_image_desktop_url = $${i++}`); values.push(dto.heroImageDesktopUrl); }
        if (dto.description !== undefined) { updates.push(`description = $${i++}`); values.push(dto.description); }
        if (dto.isActive !== undefined) { updates.push(`is_active = $${i++}`); values.push(dto.isActive); }
        if (dto.displayOrder !== undefined) { updates.push(`display_order = $${i++}`); values.push(dto.displayOrder); }

        if (updates.length === 0) return this.findById(id) as Promise<Collection>;

        const result = await this.query(
            `UPDATE collections SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`,
            values
        );
        return this.mapToCamelCase<Collection>(result.rows[0]);
    }

    async addProducts(collectionId: string, productIds: string[]): Promise<void> {
        // Simple insert, ignore if already exists
        const queries = productIds.map(pid => 
            this.query(
                `INSERT INTO collection_products (collection_id, product_id) 
                 VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [collectionId, pid]
            )
        );
        await Promise.all(queries);
    }

    async removeProduct(collectionId: string, productId: string): Promise<void> {
        await this.query(
            'DELETE FROM collection_products WHERE collection_id = $1 AND product_id = $2',
            [collectionId, productId]
        );
    }
}
