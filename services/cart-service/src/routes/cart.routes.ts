import { Router } from 'express';
import { requireAuth } from '@fs/shared/middleware';
import { CartController } from '../controllers/cart.controller';
import { CartService } from '../services/cart.service';
import { CartRepository } from '../repositories/cart.repository';
import { CouponRepository } from '../repositories/coupon.repository';
// import { CatalogIntegrationService } from '../services/catalog-integration.service';
import { getDbPool } from '@fs/shared/db';
import { getRedisClient } from '@fs/shared/redis';

export const cartRouter = Router();

const db = getDbPool();
const redis = getRedisClient();

const cartRepo = new CartRepository(db, redis);
const couponRepo = new CouponRepository(db);
// const catalogIntegration = new CatalogIntegrationService();

const cartService = new CartService(cartRepo, couponRepo);
const cartController = new CartController(cartService);

// GET /cart (fetch active cart — works for guest session + logged-in user)
cartRouter.get('/', cartController.getCart);

// POST /cart/items (add item — checks stock via catalog-service)
cartRouter.post('/items', cartController.addItem);

// PATCH /cart/items/:variantId (update qty)
cartRouter.patch('/items/:variantId', cartController.updateItemQty);

// DELETE /cart/items/:variantId
cartRouter.delete('/items/:variantId', cartController.removeItem);

// POST /cart/coupon (apply coupon code)
cartRouter.post('/coupon', requireAuth, cartController.applyCoupon);

// DELETE /cart/coupon
cartRouter.delete('/coupon', requireAuth, cartController.removeCoupon);

// POST /cart/merge (merge guest cart into user cart after OTP login)
cartRouter.post('/merge', requireAuth, cartController.mergeCart);
