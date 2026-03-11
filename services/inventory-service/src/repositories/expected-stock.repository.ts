import { getDbPool } from '@fs/shared';
import { v4 as uuidv4 } from 'uuid';

export interface ExpectedStock {
  id: string;
  variant_id: string;
  expected_qty: number;
  arrival_date: Date;
  status: 'PENDING' | 'ARRIVED' | 'CANCELLED';
}

export class ExpectedStockRepository {
  async addExpectedStock(data: Omit<ExpectedStock, 'id' | 'status'>): Promise<ExpectedStock> {
    const pool = getDbPool();
    const id = uuidv4();
    const query = `
      INSERT INTO expected_stock_arrivals (id, variant_id, expected_qty, arrival_date, status)
      VALUES ($1, $2, $3, $4, 'PENDING')
      RETURNING id, variant_id, expected_qty, arrival_date, status;
    `;
    const values = [id, data.variant_id, data.expected_qty, data.arrival_date];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async getPendingArrivals(): Promise<ExpectedStock[]> {
    const pool = getDbPool();
    const query = `
      SELECT id, variant_id, expected_qty, arrival_date, status
      FROM expected_stock_arrivals
      WHERE status = 'PENDING'
      ORDER BY arrival_date ASC;
    `;
    const result = await pool.query(query);
    return result.rows;
  }
}
