import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CartService } from '../../src/services/cart.service';
import { CartRepository } from '../../src/repositories/cart.repository';
import { CouponRepository } from '../../src/repositories/coupon.repository';
import { CatalogIntegrationService } from '../../src/services/catalog-integration.service';
import { Redis } from 'ioredis';

describe('CartService - Merge Logic', () => {
    let service: CartService;
    let mockCartRepo: any;
    let mockRedis: any;
    let mockCouponRepo: any;
    let mockCatalogInt: any;

    beforeEach(() => {
        mockCartRepo = {
            getGuestCart: vi.fn(),
            addUserItem: vi.fn(),
            clearGuestCart: vi.fn(),
        };
        mockRedis = {};
        mockCouponRepo = {};
        mockCatalogInt = {};

        service = new CartService(
            mockCartRepo as unknown as CartRepository,
            mockCouponRepo as unknown as CouponRepository,
            mockCatalogInt as unknown as CatalogIntegrationService,
            mockRedis as unknown as Redis
        );
    });

    it('should beautifully merge guest cart items into the user cart and clear the guest cart', async () => {
        const guestSessionId = 'guest_123';
        const userId = 'user_abc';
        const guestItems = [
            { variantId: 'v1', quantity: 2 },
            { variantId: 'v2', quantity: 1 }
        ];

        mockCartRepo.getGuestCart.mockResolvedValue(guestItems);

        await service.mergeCart(userId, guestSessionId);

        expect(mockCartRepo.getGuestCart).toHaveBeenCalledWith(guestSessionId);
        expect(mockCartRepo.addUserItem).toHaveBeenCalledTimes(2);
        expect(mockCartRepo.addUserItem).toHaveBeenNthCalledWith(1, userId, 'v1', 2);
        expect(mockCartRepo.addUserItem).toHaveBeenNthCalledWith(2, userId, 'v2', 1);
        expect(mockCartRepo.clearGuestCart).toHaveBeenCalledWith(guestSessionId);
    });

    it('should do nothing if guest cart is empty', async () => {
        mockCartRepo.getGuestCart.mockResolvedValue([]);

        await service.mergeCart('user_abc', 'guest_123');

        expect(mockCartRepo.addUserItem).not.toHaveBeenCalled();
        expect(mockCartRepo.clearGuestCart).not.toHaveBeenCalled();
    });
});
