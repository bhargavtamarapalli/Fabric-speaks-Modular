import { Router } from 'express';
import { requireAuth, getDbPool, getRedisClient } from '@fs/shared';
import { CartController } from '../controllers/cart.controller';
import { CartService } from '../services/cart.service';
import { CartRepository } from '../repositories/cart.repository';
import { CouponRepository } from '../repositories/coupon.repository';
import { CatalogIntegrationService } from '../services/catalog-integration.service';

const router = Router();

const db = getDbPool();
const redis = getRedisClient();

const cartRepo = new CartRepository(db, redis);
const couponRepo = new CouponRepository(db);
const catalogService = new CatalogIntegrationService();

const cartService = new CartService(cartRepo, couponRepo, catalogService, redis);
const cartController = new CartController(cartService);

// GET /cart (fetch active cart — works for guest session + logged-in user)
router.get('/', cartController.getCart);

// POST /cart/items (add item — checks stock via catalog-service)
router.post('/items', cartController.addItem);

// PATCH /cart/items/:variantId (update qty)
router.patch('/items/:variantId', cartController.updateItemQty);

// DELETE /cart/items/:variantId
router.delete('/items/:variantId', cartController.removeItem);

// POST /cart/coupon (apply coupon code)
router.post('/coupon', requireAuth, cartController.applyCoupon);

// DELETE /cart/coupon
router.delete('/coupon', requireAuth, cartController.removeCoupon);

// POST /cart/merge (merge guest cart into user cart after OTP login)
router.post('/merge', requireAuth, cartController.mergeCart);

export default router;
