import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AppError, ErrorCode, logger } from '@fs/shared';

// Shiprocket IP whitelist (documented in Shiprocket API docs)
const SHIPROCKET_IP_WHITELIST = [
  '103.145.45.0/24',
  '103.145.46.0/24',
  '103.145.47.0/24',
];

/**
 * Validates Shiprocket webhook signature using HMAC-SHA256
 */
export const validateShiprocketWebhookSignature = (req: Request, res: Response, next: NextFunction) => {
  const signature = req.headers['x-shiprocket-signature'] as string;
  const shiprocketSecret = process.env.SHIPROCKET_WEBHOOK_SECRET;

  if (!shiprocketSecret) {
    logger.error('SHIPROCKET_WEBHOOK_SECRET not configured');
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Webhook secret not configured');
  }

  if (!signature) {
    logger.warn('Webhook request missing X-Shiprocket-Signature header');
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Missing signature header');
  }

  const bodyString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', shiprocketSecret)
    .update(bodyString)
    .digest('hex');

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid webhook signature');
  }

  next();
};

const ipToInt = (ip: string) => {
  return ip.split('.').reduce((int, oct) => (int << 8) + parseInt(oct, 10), 0) >>> 0;
};

const isIPInRange = (ip: string, cidr: string) => {
  const [range, bits] = cidr.split('/');
  if (!range || !bits) return false;
  const mask = ~(Math.pow(2, 32 - parseInt(bits, 10)) - 1);
  return (ipToInt(ip) & mask) === (ipToInt(range) & mask);
};

/**
 * Validates source IP is from Shiprocket approved range
 */
export const validateShiprocketSourceIP = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = (req.ip || req.connection.remoteAddress || '0.0.0.0') as string;
  
  const ip = clientIP.startsWith('::ffff:') ? clientIP.substring(7) : clientIP;

  const isWhitelisted = SHIPROCKET_IP_WHITELIST.some(cidr => isIPInRange(ip, cidr));
  
  if (!isWhitelisted && process.env.APP_ENV === 'production') {
    logger.warn('Webhook source IP not whitelisted', { ip });
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Webhook source IP not whitelisted');
  }

  next();
};
