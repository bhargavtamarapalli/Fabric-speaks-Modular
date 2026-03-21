import axios from 'axios';
import { env } from '../config/env';
import { logger, AppError, ErrorCode, withExternalRetry } from '@fs/shared';

export class ShiprocketService {
  private baseUrl = env.SHIPROCKET_API_URL;
  private token: string | null = null;
  private tokenExpiry: number | null = null;

  private async authenticate() {
    if (env.SHIPROCKET_API_KEY) {
      return env.SHIPROCKET_API_KEY;
    }

    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    if (!env.SHIPROCKET_EMAIL || !env.SHIPROCKET_PASSWORD) {
       logger.warn('[Shiprocket] Missing credentials. Falling back to mock response.');
       return null;
    }

    try {
      const response = await withExternalRetry(
        () => axios.post(`${this.baseUrl}/auth/login`, {
          email: env.SHIPROCKET_EMAIL,
          password: env.SHIPROCKET_PASSWORD
        }),
        {
          method: 'POST',
          idempotent: true,
          operation: 'shiprocket.auth'
        }
      );
      this.token = response.data.token;
      this.tokenExpiry = Date.now() + 10 * 24 * 60 * 60 * 1000; // 10 days
      return this.token;
    } catch (error: any) {
      logger.error('[Shiprocket] Authentication failed:', error.message);
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Shiprocket authentication failed');
    }
  }

  async createReversePickup(returnId: string, orderId: string, customer: any) {
    const token = await this.authenticate();
    
    if (!token) {
        // Fallback for development/missing credentials
        logger.info(`[Shiprocket] MOCK: Creating reverse pickup for return ${returnId}`);
        const pickupDate = new Date();
        pickupDate.setDate(pickupDate.getDate() + 2);
        return { pickupDate, awbCode: `MOCK-AWB-${returnId}` };
    }

    try {
      const response = await withExternalRetry(
        () => axios.post(
          `${this.baseUrl}/orders/create/return`,
          {
            order_id: orderId,
            order_date: new Date().toISOString().slice(0, 10),
            channel_id: "",
            pickup_customer_name: customer.name || "Customer",
            pickup_last_name: "",
            pickup_address: customer.address || "Address",
            pickup_city: customer.city || "City",
            pickup_state: customer.state || "State",
            pickup_country: "India",
            pickup_pincode: customer.pincode || "110001",
            pickup_email: customer.email || "customer@example.com",
            pickup_phone: customer.phone || "9999999999",
            order_items: customer.items || []
          },
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        {
          method: 'POST',
          idempotent: false,
          operation: 'shiprocket.createReturn'
        }
      );

      logger.info(`[Shiprocket] Pickup created for return ${returnId}: ${response.data.shipment_id}`);
      
      return {
        pickupDate: new Date(), // Usually parsed from response
        awbCode: response.data.awb_code
      };
    } catch (error: any) {
      logger.error('[Shiprocket] API call failed:', error.response?.data || error.message);
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Shiprocket API call failed');
    }
  }
}
