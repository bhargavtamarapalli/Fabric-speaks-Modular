import { logger } from '@fs/shared';

/**
 * Inline DDL has been removed from this file to prevent conflicts with
 * versioned migrations managed by node-pg-migrate.
 *
 * Schema for inventory_adjustment_log and expected_stock_arrivals is defined in:
 *   db/migrations/20260316000002_inventory_audit_tables.sql
 *
 * Schema for admin_audit_log is defined in:
 *   db/migrations/20250101000005_collections_notifications.sql
 *
 * Run migrations via: npm run db:migrate
 */
export async function runMigrations() {
  logger.info('Inventory Service: schema is managed by versioned migrations (node-pg-migrate). Skipping inline DDL.');
}

