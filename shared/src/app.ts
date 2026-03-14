import type { IncomingMessage, ServerResponse } from 'http';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import { globalErrorHandler } from './middleware';

interface AppOptions {
  serviceName: string;
  withCookies?: boolean;
  captureRawBody?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      rawBody?: string;
    }
  }
}

const attachRawBody = (
  req: IncomingMessage & { rawBody?: string },
  _res: ServerResponse,
  buffer: Buffer,
  encoding: BufferEncoding
): void => {
  req.rawBody = buffer.toString(encoding || 'utf8');
};

/**
 * Creates a base Express application with standard middleware and health check.
 */
export function createBaseApp(options: AppOptions): Express {
  const app = express();

  app.use(
    express.json(
      options.captureRawBody
        ? {
            verify: (req, res, buffer, encoding) => attachRawBody(req, res, buffer, encoding as BufferEncoding),
          }
        : undefined
    )
  );
  if (options.withCookies !== false) {
    app.use(cookieParser());
  }

  // Standard Health Check
  app.get('/health', (_req, res) => {
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
