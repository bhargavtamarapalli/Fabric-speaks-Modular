import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { ReturnController } from '../controllers/return.controller';
import { ReturnService } from '../services/return.service';

const mockRepo = {
    create: vi.fn().mockResolvedValue({ id: 'ret_1', status: 'REQUESTED' }),
    updateStatus: vi.fn().mockResolvedValue({ id: 'ret_1', status: 'APPROVED' }),
    findById: vi.fn().mockResolvedValue({ id: 'ret_1', status: 'APPROVED', userId: 'user_1' }),
    getReturns: vi.fn(),
    setShiprocketId: vi.fn(),
    resolve: vi.fn()
};

const mockShiprocket = {
    createReversePickup: vi.fn()
};
const mockInternal = {
    getOrder: vi.fn().mockResolvedValue({
        id: 'order_1',
        userId: 'user_1',
        status: 'DELIVERED',
        deliveredAt: new Date().toISOString()
    }),
    getOrderItems: vi.fn().mockResolvedValue([{ 
        id: '00000000-0000-0000-0000-000000000001', 
        quantity: 5 
    }]),
    initiateRefund: vi.fn().mockResolvedValue({ success: true }),
    createReplacementOrder: vi.fn().mockResolvedValue({ id: 'replacement_1' })
};

const mockAuditLog = {
    insert: vi.fn().mockResolvedValue(undefined)
};

const service = new ReturnService(mockRepo as any, mockShiprocket as any, mockInternal as any);
const controller = new ReturnController(service, mockAuditLog as any);

const app = express();
app.use(express.json());
// Simulate the routes manually for the test
app.post('/api/orders/:orderId/return', (req: any, res: any, next: any) => {
    req.user = { userId: 'user_1', role: 'customer' };
    controller.initiateReturn(req, res, next);
});
app.patch('/api/admin/returns/:returnId/status', (req: any, res: any, next: any) => {
    req.user = { userId: 'admin_1', role: 'superAdmin' };
    controller.updateStatus(req, res, next);
});

app.use((err: any, req: any, res: any, next: any) => {
    res.status(500).json({ success: false, message: err.message });
});

describe('Return Service Integration (Manual Setup)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('POST /api/orders/:orderId/return - successfully initiates return', async () => {
        const payload = {
            returnType: 'DAMAGED',
            items: [{ 
                orderItemId: '00000000-0000-0000-0000-000000000001', 
                variantId: '00000000-0000-0000-0000-000000000002', 
                quantity: 1 
            }]
        };

        const response = await request(app)
            .post('/api/orders/00000000-0000-0000-0000-000000000003/return')
            .send(payload);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
    });

    it('PATCH /api/admin/returns/:returnId/status - successfully updates status', async () => {
        const response = await request(app)
            .patch('/api/admin/returns/00000000-0000-0000-0000-000000000004/status')
            .send({ status: 'APPROVED' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });
});
