import { SaleEventRepository, SaleEvent } from '../repositories/sale-event.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { AppError, ErrorCode } from '@fs/shared';

export class SaleEventService {
  constructor(
    private saleEventRepo: SaleEventRepository,
    private auditLogRepo: AuditLogRepository
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
}
