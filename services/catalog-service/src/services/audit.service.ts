import { AuditLogRepository, AuditLogDto } from '../repositories/audit_log.repository';
import { DbClient } from '@fs/shared';
import pino from 'pino';

const logger = pino();

/**
 * Audit Service - Logs all mutations for compliance and debugging
 * Captures user, action, timestamp, and before/after state
 */
export class AuditService {
  constructor(private auditRepository: AuditLogRepository) {}

  /**
   * Log a create operation
   */
  async logCreate(
    adminId: string,
    entityType: string,
    entityId: string,
    createdData: any,
    ipAddress?: string,
    client?: DbClient
  ): Promise<void> {
    try {
      await this.auditRepository.insert(
        {
          adminId,
          action: 'CREATE',
          entityType,
          entityId,
          beforeJson: null, // No before state on create
          afterJson: createdData,
          ipAddress,
        },
        client
      );
    } catch (error) {
      logger.error({ error, adminId, entityType, entityId }, 'Failed to log CREATE audit');
      // Don't throw - audit logging failure should not block main operation
    }
  }

  /**
   * Log an update operation with before/after comparison
   */
  async logUpdate(
    adminId: string,
    entityType: string,
    entityId: string,
    beforeData: any,
    afterData: any,
    ipAddress?: string,
    client?: DbClient
  ): Promise<void> {
    try {
      await this.auditRepository.insert(
        {
          adminId,
          action: 'UPDATE',
          entityType,
          entityId,
          beforeJson: beforeData,
          afterJson: afterData,
          ipAddress,
        },
        client
      );
    } catch (error) {
      logger.error({ error, adminId, entityType, entityId }, 'Failed to log UPDATE audit');
    }
  }

  /**
   * Log a delete operation
   */
  async logDelete(
    adminId: string,
    entityType: string,
    entityId: string,
    deletedData: any,
    ipAddress?: string,
    client?: DbClient
  ): Promise<void> {
    try {
      await this.auditRepository.insert(
        {
          adminId,
          action: 'DELETE',
          entityType,
          entityId,
          beforeJson: deletedData,
          afterJson: null, // No after state on delete
          ipAddress,
        },
        client
      );
    } catch (error) {
      logger.error({ error, adminId, entityType, entityId }, 'Failed to log DELETE audit');
    }
  }

  /**
   * Log a bulk operation
   */
  async logBulkOperation(
    adminId: string,
    action: string, // 'BULK_UPDATE', 'BULK_UPLOAD', 'BULK_DELETE'
    entityType: string,
    entityId: string, // Usually a batch ID or count
    summary: any, // Summary of changes
    ipAddress?: string,
    client?: DbClient
  ): Promise<void> {
    try {
      await this.auditRepository.insert(
        {
          adminId,
          action,
          entityType,
          entityId,
          afterJson: summary,
          ipAddress,
        },
        client
      );
    } catch (error) {
      logger.error({ error, adminId, action, entityType }, 'Failed to log BULK audit');
    }
  }

  /**
   * Log a status change (deactivate, activate, etc.)
   */
  async logStatusChange(
    adminId: string,
    entityType: string,
    entityId: string,
    oldStatus: string,
    newStatus: string,
    ipAddress?: string,
    client?: DbClient
  ): Promise<void> {
    try {
      await this.auditRepository.insert(
        {
          adminId,
          action: 'STATUS_CHANGE',
          entityType,
          entityId,
          beforeJson: { status: oldStatus },
          afterJson: { status: newStatus },
          ipAddress,
        },
        client
      );
    } catch (error) {
      logger.error({ error, adminId, entityType, entityId }, 'Failed to log STATUS_CHANGE audit');
    }
  }

  /**
   * Log a price override operation
   */
  async logPriceOverride(
    adminId: string,
    entityType: string,
    entityId: string,
    oldPrice: number | null,
    newPrice: number,
    reason?: string,
    ipAddress?: string,
    client?: DbClient
  ): Promise<void> {
    try {
      await this.auditRepository.insert(
        {
          adminId,
          action: 'PRICE_OVERRIDE',
          entityType,
          entityId,
          beforeJson: { priceOverride: oldPrice, reason: null },
          afterJson: { priceOverride: newPrice, reason: reason || null },
          ipAddress,
        },
        client
      );
    } catch (error) {
      logger.error({ error, adminId, entityType, entityId }, 'Failed to log PRICE_OVERRIDE audit');
    }
  }
}
