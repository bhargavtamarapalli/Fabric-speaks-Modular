import { BaseRepository } from '@fs/shared';

export interface ExpectedStock {
    id: string;
    variant_id: string;
    expected_qty: number;
    arrival_date: Date;
    status: 'PENDING' | 'ARRIVED' | 'CANCELLED';
}

export class ExpectedStockRepository extends BaseRepository {
    async addExpectedStock(data: Omit<ExpectedStock, 'id' | 'status'>): Promise<ExpectedStock> {
        const query = `
            INSERT INTO expected_stock (variant_id, expected_qty, arrival_date, status)
            VALUES ($1, $2, $3, 'PENDING')
            RETURNING *
        `;
        const result = await this.query(query, [data.variant_id, data.expected_qty, data.arrival_date]);
        return result.rows[0] as ExpectedStock;
    }

    async getPendingArrivals(): Promise<ExpectedStock[]> {
        const { rows } = await this.query("SELECT * FROM expected_stock WHERE status = 'PENDING' ORDER BY arrival_date ASC");
        return rows as ExpectedStock[];
    }
}
