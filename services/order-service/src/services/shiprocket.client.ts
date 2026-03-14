import axios, { AxiosInstance } from 'axios';
import { logger, AppError, ErrorCode } from '@fs/shared';

/**
 * Shiprocket API Response types
 * Reference: https://docs.shiprocket.in/v1/api-documentation
 */

export interface ShiprocketCreateOrderRequest {
  order_id: string;
  order_date: string;
  pickup_location: string;
  billing_customer_name: string;
  billing_last_name?: string;
  billing_email: string;
  billing_phone: string;
  billing_address: string;
  billing_city: string;
  billing_state: string;
  billing_country: string;
  billing_pincode: string;
  shipping_is_billing?: boolean;
  shipping_customer_name?: string;
  shipping_email?: string;
  shipping_phone?: string;
  shipping_address?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_country?: string;
  shipping_pincode?: string;
  order_items: Array<{
    name: string;
    sku: string;
    units: number;
    selling_price: number;
  }>;
  payment_method: string;
  sub_total: number;
  length?: number;
  breadth?: number;
  height?: number;
  weight: number;
}

export interface ShiprocketCreateOrderResponse {
  token: string;
  shipment_id: number;
  order_id: string;
  status: number;
  status_code: string;
  onboarding_status: number;
  message: string;
  data?: {
    shipment_id: number;
    order_id: string;
    awb_number?: string;
  };
}

export class ShiprocketClient {
  private client: AxiosInstance;
  private apiKey: string;
  private baseURL = 'https://apiv2.shiprocket.in/v1/external';

  constructor() {
    this.apiKey = process.env.SHIPROCKET_API_KEY || '';

    if (!this.apiKey) {
      logger.warn('SHIPROCKET_API_KEY environment variable is missing, Shiprocket integrations will fail');
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      timeout: 10000
    });

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      response => {
        logger.info(`Shiprocket API call successful: ${response.config.url}`, { status: response.status });
        return response;
      },
      error => {
        logger.error(`Shiprocket API call failed`, {
          url: error.config?.url,
          status: error.response?.status,
          message: error.response?.data?.message || error.message
        });
        throw error;
      }
    );
  }

  /**
   * Create order in Shiprocket
   * Maps internal order data to Shiprocket API format
   * Returns Shiprocket order ID and tracking details
   */
  async createOrder(orderData: ShiprocketCreateOrderRequest): Promise<ShiprocketCreateOrderResponse> {
    try {
      const response = await this.client.post('/orders/create/adhoc', orderData);

      if (response.status !== 200) {
        throw new AppError(
          ErrorCode.INTERNAL_ERROR,
          `Shiprocket returned status ${response.status}`,
          { shiprocketResponse: response.data }
        );
      }

      // Check Shiprocket's own status code in response
      if (response.data.status_code !== 'success' && response.data.status !== 1) {
        logger.warn('Shiprocket order creation returned non-success code', {
          statusCode: response.data.status_code,
          message: response.data.message
        });
        throw new AppError(
          ErrorCode.INTERNAL_ERROR,
          `Shiprocket order creation failed: ${response.data.message}`,
          { shiprocketStatus: response.data.status_code }
        );
      }

      logger.info('Shiprocket order created successfully', {
        orderId: orderData.order_id,
        shipmentId: response.data.data?.shipment_id
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to create Shiprocket order', {
        orderId: orderData.order_id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get order status from Shiprocket
   * Used to sync status independently of webhooks
   */
  async getOrderStatus(orderId: string): Promise<any> {
    try {
      const response = await this.client.get(`/orders/${orderId}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to get Shiprocket order status', { orderId });
      throw error;
    }
  }

  /**
   * Get tracking URL for shipment
   * Used for generating guest tracking links
   */
  async getTrackingUrl(shipmentId: number): Promise<string> {
    try {
      const response = await this.client.get(`/shipments/${shipmentId}/track`);
      return response.data.tracking_url || `https://shiprocket.co/track/${shipmentId}`;
    } catch (error) {
      logger.error('Failed to get tracking URL', { shipmentId });
      // Fallback to generic tracking URL
      return `https://shiprocket.co/track/${shipmentId}`;
    }
  }

  /**
   * Cancel order in Shiprocket
   * Used when order is cancelled before shipping
   */
  async cancelOrder(orderId: string): Promise<any> {
    try {
      const response = await this.client.post(`/orders/${orderId}/cancel`);
      return response.data;
    } catch (error) {
      logger.error('Failed to cancel Shiprocket order', { orderId });
      throw error;
    }
  }
}
