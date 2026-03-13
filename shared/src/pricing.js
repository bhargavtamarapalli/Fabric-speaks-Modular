"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEffectivePrice = void 0;
/**
 * Calculates the effective runtime price based on Rule 1.
 * Precedence: sale_price (if sale_active) > price_override > base_price
 */
const getEffectivePrice = (variant) => {
    if (variant.sale_active && variant.sale_price != null && variant.sale_price > 0) {
        return variant.sale_price;
    }
    if (variant.price_override != null && variant.price_override > 0) {
        return variant.price_override;
    }
    return variant.base_price;
};
exports.getEffectivePrice = getEffectivePrice;
