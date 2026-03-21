import axios from 'axios';
import { AppError, ErrorCode, withExternalRetry } from '@fs/shared';

export class CatalogIntegrationService {
    private readonly catalogUrl: string;

    constructor() {
        this.catalogUrl = process.env.CATALOG_SERVICE_URL || 'http://catalog-service:8080';
    }

    async getVariantStockDetails(variantId: string): Promise<{ stock_qty: number; price: number } | null> {
        try {
            const response = await withExternalRetry(
                () => axios.get(`${this.catalogUrl}/internal/variants/${variantId}`, { timeout: 5000 }),
                {
                    method: 'GET',
                    operation: 'catalog.getVariant'
                }
            );
            const variant = response.data.data;
            
            if (!variant) return null;

            // Calculate effective price taking sale_price into account
            const price = variant.salePrice !== null ? variant.salePrice : variant.basePrice;

            return {
                stock_qty: variant.stockQty,
                price: price
            };
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                return null;
            }
            throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to connect to catalog service');
        }
    }
}
