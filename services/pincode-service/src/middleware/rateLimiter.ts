import { Request, Response, NextFunction } from 'express';
import { getRedisClient, ErrorCode, logger } from '@fs/shared';

export async function pincodeRateLimiter(req: Request, res: Response, next: NextFunction) {
    try {
        const redis = getRedisClient();
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        const key = `pincode_rate_ip:${ip}`;
        
        const IP_LIMIT = 100;
        const WINDOW_SECONDS = 15 * 60; // 15 minutes

        const ipCount = await redis.incr(key);
        if (ipCount === 1) {
            await redis.expire(key, WINDOW_SECONDS);
        }

        if (ipCount > IP_LIMIT) {
            const ttl = await redis.ttl(key);
            return res.status(429).json({
                success: false,
                errorCode: ErrorCode.RATE_LIMIT_EXCEEDED,
                message: 'Too many requests from this IP address',
                retryAfter: Math.max(ttl, 0),
            });
        }

        next();
    } catch (error) {
        logger.error(`Rate limiter error: ${error}`);
        next(); // Fail open
    }
}
