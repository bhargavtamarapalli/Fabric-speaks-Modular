import { BaseRepository, Variant, IVariantRepository, CreateVariantDto, BulkVariantUpdateDto, UpdateVariantDto, DbClient } from '@fs/shared';

export { Variant };

export class VariantRepository extends BaseRepository implements IVariantRepository {
    async findById(id: string): Promise<Variant | null> {
        const result = await this.query(
            'SELECT * FROM variants WHERE id = $1 AND is_deleted = false',
            [id]
        );
        return result.rows[0] ? this.mapVariant(result.rows[0]) : null;
    }

    async findByProductId(productId: string): Promise<Variant[]> {
        const result = await this.query(
            'SELECT * FROM variants WHERE product_id = $1 AND is_deleted = false',
            [productId]
        );
        return result.rows.map(row => this.mapVariant(row));
    }

    async findBySku(sku: string): Promise<Variant | null> {
        const result = await this.query(
            'SELECT * FROM variants WHERE sku = $1 AND is_deleted = false',
            [sku]
        );
        return result.rows[0] ? this.mapVariant(result.rows[0]) : null;
    }

    async updateStock(id: string, qty: number): Promise<void> {
        await this.query(
            'UPDATE variants SET qty = $1, updated_at = now() WHERE id = $2 AND is_deleted = false',
            [qty, id]
        );
    }

    async create(dto: CreateVariantDto & { productId: string }, client?: DbClient): Promise<Variant> {
        const snakeDto: Record<string, any> = {};
        for (const [key, value] of Object.entries(dto)) {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            if (key === 'images') {
                snakeDto['images_json'] = JSON.stringify(value ?? []);
            } else if (key === 'badges') {
                snakeDto['badges_json'] = JSON.stringify(value ?? {});
            } else {
                snakeDto[snakeKey] = value;
            }
        }

        const columns = Object.keys(snakeDto);
        const values = Object.values(snakeDto);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

        const queryStr = `INSERT INTO variants (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
        const executor = client ?? this.db;
        const result = await executor.query(queryStr, values);
        return this.mapVariant(result.rows[0]);
    }

    async bulkCreate(productId: string, variants: CreateVariantDto[], client?: DbClient): Promise<Variant[]> {
        const created: Variant[] = [];
        for (const variant of variants) {
            created.push(await this.create({ ...variant, productId }, client));
        }
        return created;
    }

    async verifyBelongToProduct(variantIds: string[], productId: string, client?: DbClient): Promise<boolean> {
        if (variantIds.length === 0) return true;

        const placeholders = variantIds.map((_, index) => `$${index + 2}`).join(', ');
        const executor = client ?? this.db;
        const { rows } = await executor.query(
            `
                SELECT COUNT(*)::int AS count
                FROM variants
                WHERE product_id = $1
                  AND is_deleted = false
                  AND id IN (${placeholders})
            `,
            [productId, ...variantIds]
        );

        return rows[0]?.count === variantIds.length;
    }

    async bulkUpdate(updates: BulkVariantUpdateDto[], client?: DbClient): Promise<Variant[]> {
        const executor = client ?? this.db;
        const updatedVariants: Variant[] = [];

        for (const update of updates) {
            const sets: string[] = [];
            const params: any[] = [update.variantId];

            const mapping: Record<string, string> = {
                size: 'size',
                colour: 'colour',
                sizeLabel: 'size_label',
                basePrice: 'base_price',
                priceOverride: 'price_override',
                salePrice: 'sale_price',
                saleActive: 'sale_active',
                qty: 'qty',
                isActive: 'is_active'
            };

            Object.entries(mapping).forEach(([key, column]) => {
                const value = (update as any)[key];
                if (value !== undefined) {
                    params.push(value);
                    sets.push(`${column} = $${params.length}`);
                }
            });

            if (update.badges !== undefined) {
                params.push(JSON.stringify(update.badges));
                sets.push(`badges_json = $${params.length}`);
            }

            if (update.images !== undefined) {
                params.push(JSON.stringify(update.images));
                sets.push(`images_json = $${params.length}`);
            }

            if (sets.length === 0) {
                const current = await this.findById(update.variantId);
                if (current) updatedVariants.push(current);
                continue;
            }

            const { rows } = await executor.query(
                `
                    UPDATE variants
                    SET ${sets.join(', ')}, updated_at = now()
                    WHERE id = $1 AND is_deleted = false
                    RETURNING *
                `,
                params
            );

            if (!rows[0]) {
                throw new Error(`Variant ${update.variantId} not found`);
            }

            updatedVariants.push(this.mapVariant(rows[0]));
        }

        return updatedVariants;
    }

    async updateById(id: string, dto: UpdateVariantDto, client?: DbClient): Promise<Variant> {
        const executor = client ?? this.db;
        const sets: string[] = [];
        const params: any[] = [id];

        const mapping: Record<string, string> = {
            sizeLabel: 'size_label',
            basePrice: 'base_price',
            priceOverride: 'price_override',
            salePrice: 'sale_price',
            saleActive: 'sale_active',
            qty: 'qty',
            isActive: 'is_active'
        };

        Object.entries(mapping).forEach(([key, column]) => {
            const value = (dto as any)[key];
            if (value !== undefined) {
                params.push(value);
                sets.push(`${column} = $${params.length}`);
            }
        });

        if (dto.badges !== undefined) {
            params.push(JSON.stringify(dto.badges));
            sets.push(`badges_json = $${params.length}`);
        }

        if (dto.images !== undefined) {
            params.push(JSON.stringify(dto.images));
            sets.push(`images_json = $${params.length}`);
        }

        if (sets.length === 0) {
            const current = await this.findById(id);
            if (!current) {
                throw new Error(`Variant ${id} not found`);
            }
            return current;
        }

        const { rows } = await executor.query(
            `UPDATE variants
             SET ${sets.join(', ')}, updated_at = now()
             WHERE id = $1 AND is_deleted = false
             RETURNING *`,
            params
        );

        if (!rows[0]) {
            throw new Error(`Variant ${id} not found`);
        }

        return this.mapVariant(rows[0]);
    }

    async deactivate(id: string, client?: DbClient): Promise<Variant> {
        const executor = client ?? this.db;
        const { rows } = await executor.query(
            `UPDATE variants
             SET is_active = false, updated_at = now()
             WHERE id = $1 AND is_deleted = false
             RETURNING *`,
            [id]
        );

        if (!rows[0]) {
            throw new Error(`Variant ${id} not found`);
        }

        return this.mapVariant(rows[0]);
    }

    async countActiveOrders(id: string): Promise<number> {
        const { rows } = await this.query(
            `SELECT COUNT(*)::int AS count
             FROM order_items oi
             JOIN orders o ON o.id = oi.order_id
             WHERE oi.variant_id = $1
               AND o.status NOT IN ('DELIVERED', 'CANCELLED', 'RETURNED')`,
            [id]
        );
        return rows[0]?.count ?? 0;
    }

    async countActiveNotifySubscriptions(id: string): Promise<number> {
        const { rows } = await this.query(
            `SELECT COUNT(*)::int AS count
             FROM stock_notifications
             WHERE variant_id = $1
               AND is_active = true`,
            [id]
        );
        return rows[0]?.count ?? 0;
    }

    async bulkAdjustPrices(options: {
        targetType: 'product' | 'variant' | 'collection' | 'brand' | 'global';
        targetIds: string[];
        adjustmentType: 'PERCENT' | 'FIXED';
        adjustmentValue: number;
        applyTo: 'base_price' | 'price_override';
    }): Promise<number> {
        const params: any[] = [];
        let joinClause = 'JOIN products p ON p.id = v.product_id';
        let whereClause = `v.is_deleted = false AND v.is_active = true AND p.is_deleted = false AND p.is_active = true`;

        if (options.targetType !== 'global') {
            params.push(options.targetIds);
            const idParam = `$${params.length}`;
            switch (options.targetType) {
                case 'product':
                    whereClause += ` AND p.id = ANY(${idParam})`;
                    break;
                case 'variant':
                    whereClause += ` AND v.id = ANY(${idParam})`;
                    break;
                case 'collection':
                    joinClause += ' JOIN collection_products cp ON cp.product_id = p.id';
                    whereClause += ` AND cp.collection_id = ANY(${idParam})`;
                    break;
                case 'brand':
                    whereClause += ` AND p.brand_id = ANY(${idParam})`;
                    break;
                default:
                    break;
            }
        }

        const valueParamIndex = params.length + 1;
        params.push(options.adjustmentValue);

        const targetColumn = options.applyTo === 'price_override' ? 'price_override' : 'base_price';
        const baseExpression = options.applyTo === 'price_override'
            ? 'COALESCE(v.price_override, v.base_price)'
            : 'v.base_price';

        const priceExpression = options.adjustmentType === 'PERCENT'
            ? `GREATEST(ROUND(${baseExpression} * (1 + $${valueParamIndex} / 100.0), 2), 0)`
            : `GREATEST(${baseExpression} + $${valueParamIndex}, 0)`;

        // Convert JOIN clause to PostgreSQL FROM syntax
        const fromClause = joinClause ? `FROM ${joinClause}` : '';
        const query = `
            UPDATE variants v
            SET ${targetColumn} = ${priceExpression},
                updated_at = now()
            ${fromClause}
            WHERE ${whereClause}
        `;

        const result = await this.query(query, params);
        return result.rowCount ?? 0;
    }

    private mapVariant(row: Record<string, any>): Variant {
        const mapped = this.mapToCamelCase<Variant>(row);
        return {
            ...mapped,
            basePrice: parseFloat(row.base_price),
            priceOverride: row.price_override ? parseFloat(row.price_override) : undefined,
            salePrice: row.sale_price ? parseFloat(row.sale_price) : undefined,
            badges: row.badges_json ?? undefined,
            images: row.images_json ?? [],
        };
    }
}
