import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '@fs/shared';
import { AppError, ErrorCode } from '@fs/shared';

/**
 * Rate Limiting for OTP Generation
 * RULE: Max 3 requests per mobile per 10 minutes
 * RULE: Max 5 requests per IP per 10 minutes
 * 
 * Configuration: These values can be overridden via environment variables:
 * - OTP_MOBILE_LIMIT: Max OTP requests per mobile number (default: 3)
 * - OTP_IP_LIMIT: Max OTP requests per IP address (default: 5)
 * - OTP_WINDOW_SECONDS: Rate limit window in seconds (default: 600)
 */
export async function otpRateLimiter(req: Request, res: Response, next: NextFunction) {
  try {
    const redis = getRedisClient();
    const mobile = req.body.mobile || '';
    const ip = req.ip || req.connection.remoteAddress || 'unknown';

    // Allow configuration via environment variables with sensible defaults
    const MOBILE_LIMIT = parseInt(process.env.OTP_MOBILE_LIMIT || '3', 10);
    const IP_LIMIT = parseInt(process.env.OTP_IP_LIMIT || '5', 10);
    const WINDOW_SECONDS = parseInt(process.env.OTP_WINDOW_SECONDS || '600', 10);

    // Check mobile-based rate limit
    const mobileKey = `otp_rate:${mobile}`;
    const mobileCount = await redis.incr(mobileKey);
    if (mobileCount === 1) {
      await redis.expire(mobileKey, WINDOW_SECONDS);
    }

    if (mobileCount > MOBILE_LIMIT) {
      const ttl = await redis.ttl(mobileKey);
      return res.status(429).json({
        success: false,
        errorCode: ErrorCode.OTP_RATE_LIMIT_MOBILE,
        message: 'Too many OTP requests from this mobile number',
        retryAfter: Math.max(ttl, 0),
      });
    }

    // Check IP-based rate limit
    const ipKey = `otp_rate_ip:${ip}`;
    const ipCount = await redis.incr(ipKey);
    if (ipCount === 1) {
      await redis.expire(ipKey, WINDOW_SECONDS);
    }

    if (ipCount > IP_LIMIT) {
      const ttl = await redis.ttl(ipKey);
      return res.status(429).json({
        success: false,
        errorCode: ErrorCode.OTP_RATE_LIMIT_IP,
        message: 'Too many OTP requests from this IP address',
        retryAfter: Math.max(ttl, 0),
      });
    }

    next();
  } catch (error) {
    // If Redis fails, allow request to proceed (fail open)
    console.error('Rate limiter error:', error);
    next();
  }
}
