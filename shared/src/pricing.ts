export interface IVariantPricing {
  base_price: number;
  sale_price?: number | null;
  price_override?: number | null;
  sale_active: boolean;
}

/**
 * Calculates the effective runtime price based on Rule 1.
 * Precedence: sale_price (if sale_active) > price_override > base_price
 */
export const getEffectivePrice = (variant: IVariantPricing): number => {
  if (variant.sale_active && variant.sale_price != null && variant.sale_price > 0) {
    return variant.sale_price;
  }
  
  if (variant.price_override != null && variant.price_override > 0) {
    return variant.price_override;
  }

  return variant.base_price;
};
