import { BaseRepository, Category, ICategoryRepository } from '@fs/shared';

export { Category };

export class CategoryRepository extends BaseRepository implements ICategoryRepository {
    async findAllActive(): Promise<Category[]> {
        const result = await this.query(
            'SELECT * FROM categories WHERE is_active = true AND is_deleted = false ORDER BY display_order ASC, name ASC'
        );
        return result.rows.map(row => this.mapToCamelCase<Category>(row));
    }
}
