import { env } from '../config/env';
import { logger } from '@fs/shared';

// Mocking Shiprocket Reverse Pickup
export class ShiprocketService {
  async createReversePickup(returnId: string, orderId: string): Promise<{ pickup_date: Date; awb_code: string }> {
    // In a real application, you'd exchange auth token using env.SHIPROCKET_EMAIL
    // and call Shiprocket API endpoint for reverse pickup.
    
    logger.info(`[Shiprocket] Creating reverse pickup for return ${returnId} (Order: ${orderId})`);
    
    // Simulating API latency
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock response: scheduling pickup for 2 days from now
    const pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + 2);
    
    const mockAwb = `FS-RET-${Math.floor(Math.random() * 1000000)}`;

    logger.info(`[Shiprocket] Pickup scheduled on ${pickupDate.toISOString()} with AWB ${mockAwb}`);

    return {
      pickup_date: pickupDate,
      awb_code: mockAwb
    };
  }
}
