import Redis, { RedisOptions } from 'ioredis';

let redisClient: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    const options: RedisOptions = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
      maxRetriesPerRequest: null,
      // Add authentication or TLS settings here if required in production
    };

    redisClient = new Redis(options);

    redisClient.on('error', (err) => {
      console.error('Redis Client Error', err);
    });
  }
  return redisClient;
};
