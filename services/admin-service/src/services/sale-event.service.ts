import { SaleEventRepository, SaleEvent } from '../repositories/sale-event.repository';
import { SaleEventTargetRepository } from '../repositories/sale-event-target.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { AppError, ErrorCode } from '@fs/shared';

export class SaleEventService {
  constructor(
    private saleEventRepo: SaleEventRepository,
    private auditLogRepo: AuditLogRepository,
    private saleTargetRepo: SaleEventTargetRepository
  ) {}

  async createSaleEvent(data: Omit<SaleEvent, 'id' | 'created_at' | 'updated_at'>, adminId: string) {
    const saleEvent = await this.saleEventRepo.create(data);
    
    await this.auditLogRepo.insert({
      adminId,
      action: 'sale_event_create',
      entityType: 'sale_event',
      entityId: saleEvent.id,
      afterJson: saleEvent as any
    });

    return saleEvent;
  }

  async listSaleEvents(filters: { isActive?: boolean; limit?: number; offset?: number }) {
    return this.saleEventRepo.list(filters);
  }

  async getSaleEvent(id: string) {
    const saleEvent = await this.saleEventRepo.findById(id);
    if (!saleEvent) throw new AppError(ErrorCode.NOT_FOUND, 'Sale event not found');
    return saleEvent;
  }

  async updateSaleEvent(id: string, data: Partial<Omit<SaleEvent, 'id' | 'created_at' | 'updated_at' | 'created_by'>>, adminId: string) {
    const previous = await this.getSaleEvent(id);
    const updated = await this.saleEventRepo.update(id, data);

    await this.auditLogRepo.insert({
      adminId,
      action: 'sale_event_update',
      entityType: 'sale_event',
      entityId: id,
      beforeJson: previous as any,
      afterJson: updated as any
    });

    return updated;
  }

  async deleteSaleEvent(id: string, adminId: string) {
    const deleted = await this.saleEventRepo.delete(id);
    if (!deleted) throw new AppError(ErrorCode.NOT_FOUND, 'Sale event not found');

    await this.auditLogRepo.insert({
      adminId,
      action: 'sale_event_delete',
      entityType: 'sale_event',
      entityId: id
    });

    return { success: true };
  }

  async previewSaleEvent(id: string, limit: number = 50, offset: number = 0) {
    const saleEvent = await this.getSaleEvent(id);
    const scopeIds = Array.isArray(saleEvent.scope_ids) ? saleEvent.scope_ids : [];

    if (saleEvent.scope !== 'global' && scopeIds.length === 0) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'scope_ids required for non-global sale events');
    }

    const preview = await this.saleTargetRepo.getTargets(saleEvent.scope, scopeIds, limit, offset);
    const items = preview.items.map((item) => ({
      ...item,
      computedSalePrice: this.computeSalePrice(item.basePrice, saleEvent.discount_type, saleEvent.discount_value)
    }));

    return { total: preview.total, items };
  }

  async applySaleEvent(id: string, adminId: string) {
    const saleEvent = await this.getSaleEvent(id);
    const scopeIds = Array.isArray(saleEvent.scope_ids) ? saleEvent.scope_ids : [];

    if (saleEvent.scope !== 'global' && scopeIds.length === 0) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'scope_ids required for non-global sale events');
    }

    const now = new Date();
    if (now < saleEvent.starts_at || now > saleEvent.ends_at) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Sale event is not within active window');
    }

    const activeEvents = await this.saleEventRepo.findActiveAt(now);
    const otherActive = activeEvents.find((event) => event.id !== saleEvent.id);
    if (otherActive) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Another sale event is already active');
    }

    const updatedCount = await this.saleTargetRepo.applySale(
      saleEvent.scope,
      scopeIds,
      saleEvent.discount_type,
      saleEvent.discount_value
    );

    if (!saleEvent.is_active) {
      await this.saleEventRepo.update(id, { is_active: true, paused_at: null as any });
    }

    await this.auditLogRepo.insert({
      adminId,
      action: 'sale_event_apply',
      entityType: 'sale_event',
      entityId: id,
      afterJson: { updatedCount }
    });

    return { updatedCount };
  }

  async endSaleEvent(id: string, adminId: string) {
    const saleEvent = await this.getSaleEvent(id);
    const scopeIds = Array.isArray(saleEvent.scope_ids) ? saleEvent.scope_ids : [];

    if (saleEvent.scope !== 'global' && scopeIds.length === 0) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'scope_ids required for non-global sale events');
    }

    const updatedCount = await this.saleTargetRepo.endSale(saleEvent.scope, scopeIds);

    if (saleEvent.is_active) {
      await this.saleEventRepo.update(id, { is_active: false });
    }

    await this.auditLogRepo.insert({
      adminId,
      action: 'sale_event_end',
      entityType: 'sale_event',
      entityId: id,
      afterJson: { updatedCount }
    });

    return { updatedCount };
  }

  async pauseSaleEvent(id: string, adminId: string, reason?: string) {
    const saleEvent = await this.getSaleEvent(id);
    const scopeIds = Array.isArray(saleEvent.scope_ids) ? saleEvent.scope_ids : [];

    const updatedCount = await this.saleTargetRepo.endSale(saleEvent.scope, scopeIds);
    const pausedAt = new Date();

    if (saleEvent.is_active) {
      await this.saleEventRepo.update(id, { is_active: false, paused_at: pausedAt as any });
    }

    await this.auditLogRepo.insert({
      adminId,
      action: 'sale_event_pause',
      entityType: 'sale_event',
      entityId: id,
      afterJson: { updatedCount, reason, pausedAt }
    });

    return { updatedCount, pausedAt };
  }

  async extendSaleEvent(id: string, hours: number, adminId: string) {
    const saleEvent = await this.getSaleEvent(id);
    const newEndsAt = new Date(saleEvent.ends_at.getTime() + hours * 60 * 60 * 1000);

    const updated = await this.saleEventRepo.update(id, { ends_at: newEndsAt });

    await this.auditLogRepo.insert({
      adminId,
      action: 'sale_event_extend',
      entityType: 'sale_event',
      entityId: id,
      beforeJson: { ends_at: saleEvent.ends_at },
      afterJson: { ends_at: updated.ends_at, hours }
    });

    return updated;
  }

  private computeSalePrice(basePrice: number, discountType: 'PERCENT' | 'FIXED', discountValue: number): number {
    if (discountType === 'PERCENT') {
      return Number((basePrice * (1 - discountValue / 100)).toFixed(2));
    }
    return Math.max(Number((basePrice - discountValue).toFixed(2)), 0);
  }
}
