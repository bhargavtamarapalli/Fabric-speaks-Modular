import { Pool } from 'pg';

export interface Category {
    id: string;
    name: string;
    slug: string;
    parentId?: string;
    imageUrl?: string;
    displayOrder: number;
    isActive: boolean;
    createdAt: Date;
}

export class CategoryRepository {
    constructor(private db: Pool) {}

    async findAllActive(): Promise<Category[]> {
        const result = await this.db.query(
            'SELECT * FROM categories WHERE is_active = true AND is_deleted = false ORDER BY display_order ASC, name ASC'
        );
        return result.rows.map(row => this.mapCategory(row));
    }

    private mapCategory(row: any): Category {
        return {
            id: row.id,
            name: row.name,
            slug: row.slug,
            parentId: row.parent_id,
            imageUrl: row.image_url,
            displayOrder: row.display_order,
            isActive: row.is_active,
            createdAt: row.created_at,
        };
    }
}
