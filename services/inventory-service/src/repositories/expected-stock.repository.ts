import { BaseRepository } from '@fs/shared';

export interface ExpectedStock {
    id: string;
    variant_id: string;
    expected_qty: number;
    expected_date: Date;
    notes?: string;
    is_received: boolean;
    received_at?: Date;
    created_by: string;
}

export class ExpectedStockRepository extends BaseRepository {
    async addExpectedStock(data: Omit<ExpectedStock, 'id' | 'is_received' | 'received_at'>): Promise<ExpectedStock> {
        const query = `
            INSERT INTO expected_stock (variant_id, expected_qty, expected_date, notes, created_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const result = await this.query(query, [data.variant_id, data.expected_qty, data.expected_date, data.notes, data.created_by]);
        return result.rows[0];
    }

    async getPendingArrivals(): Promise<ExpectedStock[]> {
        const { rows } = await this.query("SELECT * FROM expected_stock WHERE is_received = false ORDER BY expected_date ASC");
        return rows as ExpectedStock[];
    }

    async getById(id: string): Promise<ExpectedStock | null> {
        const { rows } = await this.query("SELECT * FROM expected_stock WHERE id = $1", [id]);
        return rows[0] || null;
    }

    async receiveArrival(id: string, adminUserId: string): Promise<void> {
        return this.withTransaction(async (client) => {
            // 1. Get arrival details
            const arrivalRes = await client.query('SELECT * FROM expected_stock WHERE id = $1 FOR UPDATE', [id]);
            if (!arrivalRes.rows.length) throw new Error(`Arrival ${id} not found`);
            const arrival = arrivalRes.rows[0];

            if (arrival.is_received) throw new Error(`Arrival ${id} already received`);

            // 2. Update variant qty
            const variantRes = await client.query('SELECT qty FROM variants WHERE id = $1 FOR UPDATE', [arrival.variant_id]);
            if (!variantRes.rows.length) throw new Error(`Variant ${arrival.variant_id} not found`);
            const oldQty = variantRes.rows[0].qty;
            const newQty = oldQty + arrival.expected_qty;

            await client.query('UPDATE variants SET qty = $1, updated_at = now() WHERE id = $2', [newQty, arrival.variant_id]);

            // 3. Log stock adjustment
            await client.query(`
                INSERT INTO stock_adjustments (variant_id, before_qty, after_qty, reason, adjusted_by, notes)
                VALUES ($1, $2, $3, 'correction', $4, $5)
            `, [arrival.variant_id, oldQty, newQty, adminUserId, `Received from expectation ID: ${id}`]);

            // 4. Mark arrival as received
            await client.query('UPDATE expected_stock SET is_received = true, received_at = now() WHERE id = $1', [id]);
        });
    }

    /**
     * Critical #4: Atomic arrival marking to prevent TOCTOU race condition.
     * Single SQL statement atomically checks is_received=false AND marks it true.
     * Only one concurrent caller will get the row back — all others get null.
     */
    async receiveArrivalAtomic(id: string): Promise<ExpectedStock | null> {
        const result = await this.query(
            `UPDATE expected_stock
             SET is_received = true, received_at = now()
             WHERE id = $1 AND is_received = false
             RETURNING *`,
            [id]
        );
        return result.rows[0] || null;
    }
}
