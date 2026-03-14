import axios from 'axios';
import { env } from '../config/env';
import { AppError, ErrorCode, logger } from '@fs/shared';

export class InternalService {
  private orderUrl = env.ORDER_SERVICE_URL;
  private paymentUrl = env.PAYMENT_SERVICE_URL;

  async getOrder(orderId: string, userId: string) {
    try {
      const response = await axios.get(`${this.orderUrl}/api/orders/${orderId}`, {
        headers: { 'x-user-id': userId } // Passing userId if needed for auth simulation
      });
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new AppError(ErrorCode.NOT_FOUND, 'Order not found');
      }
      logger.error(`Error fetching order ${orderId}:`, error.message);
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch order details');
    }
  }

  async initiateRefund(orderId: string, amount: number) {
    try {
      const response = await axios.post(`${this.paymentUrl}/api/payments/refund`, {
        orderId,
        amount
      });
      return response.data;
    } catch (error: any) {
      logger.error(`Error initiating refund for order ${orderId}:`, error.message);
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to initiate refund');
    }
  }

  async createReplacementOrder(originalOrderId: string, items: any[]) {
    try {
      const response = await axios.post(`${this.orderUrl}/api/orders/replacement`, {
        originalOrderId,
        items
      });
      return response.data.data;
    } catch (error: any) {
      logger.error(`Error creating replacement for order ${originalOrderId}:`, error.message);
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to create replacement order');
    }
  }
}
