import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/index';

vi.mock('../../src/lib/firebase', () => ({
    firebaseAuth: {}
}));
describe('Auth Service - Health Flow', () => {
    it('GET /health returns 200 OK', async () => {
        const response = await request(app).get('/health');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'ok', service: 'auth-service' });
    });
});
