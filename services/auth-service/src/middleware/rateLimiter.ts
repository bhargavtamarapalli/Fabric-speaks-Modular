import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '@fs/shared';
import { ErrorCode } from '@fs/shared';
import { AUTH_CONSTANTS } from '../config/constants';

/**
 * Rate Limiting for OTP Generation
 * RULE: Max 3 requests per mobile per 10 minutes
 * RULE: Max 5 requests per IP per 10 minutes
 */
export async function otpRateLimiter(req: Request, res: Response, next: NextFunction) {
  try {
    const redis = getRedisClient();
    const mobile = req.body.mobile || '';
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    
    const MOBILE_LIMIT = AUTH_CONSTANTS.MOBILE_LIMIT;
    const IP_LIMIT = AUTH_CONSTANTS.IP_LIMIT;
    const WINDOW_SECONDS = AUTH_CONSTANTS.RATE_LIMIT_WINDOW_SECONDS;

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
