import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserRepository } from '../../src/repositories/user.repository';

describe('UserRepository', () => {
    let userRepo: UserRepository;
    let mockDb: any;

    beforeEach(() => {
        mockDb = {
            query: vi.fn(),
        };
        userRepo = new UserRepository(mockDb);
    });

    it('findByFirebaseUid should filter by is_deleted = false', async () => {
        mockDb.query.mockResolvedValue({ rows: [{ id: 'u1' }] });
        await userRepo.findByFirebaseUid('fb123');
        expect(mockDb.query).toHaveBeenCalledWith(
            expect.stringContaining('is_deleted = false'),
            ['fb123']
        );
    });

    it('softDeleteCustomer should hash mobile and sets nulls', async () => {
        mockDb.query.mockResolvedValue({ rowCount: 1 });
        await userRepo.softDeleteCustomer('u123');
        
        expect(mockDb.query).toHaveBeenCalledWith(
            expect.stringMatching(/UPDATE users\s+SET is_deleted = true/i),
            [expect.any(String), expect.any(String), 'u123']
        );
    });
});
