import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import { globalErrorHandler } from './middleware';

interface AppOptions {
  serviceName: string;
  withCookies?: boolean;
}

/**
 * Creates a base Express application with standard middleware and health check.
 */
export function createBaseApp(options: AppOptions): Express {
  const app = express();

  app.use(express.json());
  if (options.withCookies !== false) {
    app.use(cookieParser());
  }

  // Standard Health Check
  app.get('/health', (req, res) => {
    res.json({
      success: true,
      service: options.serviceName,
      timestamp: new Date().toISOString(),
      status: 'ok'
    });
  });

  // The globalErrorHandler should be added AFTER routes are mounted in the service index.ts
  // but we can provide a helper to attach it or remind the user.
  
  return app;
}

export { globalErrorHandler };
