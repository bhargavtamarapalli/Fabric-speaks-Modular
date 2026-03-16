import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { logger, AppError, ErrorCode, withExternalRetry } from '@fs/shared';
import { env } from '../config/env';

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
  private baseURL = env.SHIPROCKET_API_URL;
  private authToken: string | null = null;
  private authTokenExpiry: number | null = null;

  constructor() {
    this.apiKey = env.SHIPROCKET_API_KEY || '';

    if (!this.apiKey && !env.SHIPROCKET_EMAIL && !env.SHIPROCKET_PASSWORD) {
      logger.warn('Shiprocket credentials are missing, Shiprocket integrations will fail');
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json'
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

  private async getAccessToken(): Promise<string> {
    if (this.apiKey) {
      return this.apiKey;
    }

    if (this.authToken && this.authTokenExpiry && Date.now() < this.authTokenExpiry) {
      return this.authToken;
    }

    if (!env.SHIPROCKET_EMAIL || !env.SHIPROCKET_PASSWORD) {
      throw new AppError(ErrorCode.EXTERNAL_SERVICE_ERROR, 'Shiprocket credentials are not configured');
    }

    try {
      const response = await this.requestWithRetry<{ token: string }>({
        method: 'POST',
        url: '/auth/login',
        data: {
          email: env.SHIPROCKET_EMAIL,
          password: env.SHIPROCKET_PASSWORD,
        },
        idempotent: true,
        operation: 'shiprocket.auth'
      });

      const token = response.data?.token;
      if (!token) {
        throw new AppError(ErrorCode.EXTERNAL_SERVICE_ERROR, 'Shiprocket authentication did not return an access token');
      }

      this.authToken = String(token);
      this.authTokenExpiry = Date.now() + (9 * 24 * 60 * 60 * 1000);
      return this.authToken;
    } catch (error) {
      logger.error('Failed to authenticate with Shiprocket', {
        message: error instanceof Error ? error.message : String(error)
      });
      throw new AppError(ErrorCode.EXTERNAL_SERVICE_ERROR, 'Unable to authenticate with Shiprocket');
    }
  }

  private async requestWithRetry<T>(config: {
    method: 'GET' | 'POST';
    url: string;
    data?: unknown;
    headers?: Record<string, string>;
    idempotent?: boolean;
    operation?: string;
  }): Promise<AxiosResponse<T>> {
    return withExternalRetry(
      () => this.client.request<T>({
        method: config.method,
        url: config.url,
        data: config.data,
        headers: config.headers
      }),
      {
        method: config.method,
        idempotent: config.idempotent,
        operation: config.operation
      }
    );
  }

  private async authorizedPost<T>(url: string, payload?: unknown, idempotent: boolean = false, operation?: string): Promise<T> {
    const token = await this.getAccessToken();
    const response = await this.requestWithRetry<T>({
      method: 'POST',
      url,
      data: payload,
      headers: {
        Authorization: `Bearer ${token}`
      },
      idempotent,
      operation
    });
    return response.data as T;
  }

  private async authorizedGet<T>(url: string): Promise<T> {
    const token = await this.getAccessToken();
    const response = await this.requestWithRetry<T>({
      method: 'GET',
      url,
      headers: {
        Authorization: `Bearer ${token}`
      },
      idempotent: true,
      operation: `shiprocket.get.${url}`
    });
    return response.data as T;
  }

  /**
   * Create order in Shiprocket
   * Maps internal order data to Shiprocket API format
   * Returns Shiprocket order ID and tracking details
   */
  async createOrder(orderData: ShiprocketCreateOrderRequest): Promise<ShiprocketCreateOrderResponse> {
    try {
      const response = await this.authorizedPost<ShiprocketCreateOrderResponse>(
        '/orders/create/adhoc',
        orderData,
        false,
        'shiprocket.createOrder'
      );

      // Check Shiprocket's own status code in response
      if (response.status_code !== 'success' && response.status !== 1) {
        logger.warn('Shiprocket order creation returned non-success code', {
          statusCode: response.status_code,
          message: response.message
        });
        throw new AppError(
          ErrorCode.INTERNAL_ERROR,
          `Shiprocket order creation failed: ${response.message}`,
          { shiprocketStatus: response.status_code }
        );
      }

      logger.info('Shiprocket order created successfully', {
        orderId: orderData.order_id,
        shipmentId: response.data?.shipment_id
      });

      return response;
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
      return await this.authorizedGet(`/orders/${orderId}`);
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
      const response = await this.authorizedGet<any>(`/shipments/${shipmentId}/track`);
      return response.tracking_url || `https://shiprocket.co/track/${shipmentId}`;
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
      return await this.authorizedPost(`/orders/${orderId}/cancel`, undefined, true, 'shiprocket.cancelOrder');
    } catch (error) {
      logger.error('Failed to cancel Shiprocket order', { orderId });
      throw error;
    }
  }
}
