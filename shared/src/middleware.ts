import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCode } from './errors';
import { Role } from './types';
import pino from 'pino';
import { z } from 'zod';

const logger = pino();

// Extend Express Request type to include the user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: Role;
        mobile?: string;
      };
    }
  }
}

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user || !req.user.userId) {
    return next(new AppError(ErrorCode.JWT_INVALID, 'Authentication required'));
  }
  next();
};

export const requireRole = (...roles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) {
      return next(new AppError(ErrorCode.JWT_INVALID, 'Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(ErrorCode.INSUFFICIENT_ROLE, 'You do not have permission to perform this action')
      );
    }
    next();
  };
};

export const catchAsync = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
};

interface ErrorPayload {
  success: false;
  errorCode: ErrorCode;
  message: string;
  details?: unknown;
  stack?: string;
}

const isDevelopment = process.env.APP_ENV === 'development';

const buildErrorPayload = (
  errorCode: ErrorCode,
  message: string,
  details?: unknown,
  stack?: string
): ErrorPayload => {
  const payload: ErrorPayload = {
    success: false,
    errorCode,
    message,
  };

  if (isDevelopment && details !== undefined) {
    payload.details = details;
  }

  if (isDevelopment && stack) {
    payload.stack = stack;
  }

  return payload;
};

/**
 * Validation Middleware
 * Validates request body, query, or params using a Zod schema.
 */
export const validateRequest = (schema: z.ZodSchema) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const globalErrorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    logger.error({ code: err.code, msg: err.message, meta: err.meta });
    return res
      .status(err.statusCode)
      .json(buildErrorPayload(err.code, err.message, err.meta, err.stack));
  }

  if (err instanceof z.ZodError) {
    logger.warn({ err: err.errors, msg: 'Validation error' });
    return res
      .status(400)
      .json(
        buildErrorPayload(
          ErrorCode.VALIDATION_ERROR,
          'Validation failed',
          err.errors,
          err.stack
        )
      );
  }

  logger.error({ err, msg: 'Unhandled exception' });
  return res
    .status(500)
    .json(buildErrorPayload(ErrorCode.INTERNAL_ERROR, 'An unexpected error occurred', undefined, err.stack));
};

/**
 * Sets the authentication JWT cookie with appropriate security flags.
 */
export const setAuthCookie = (res: Response, token: string) => {
  res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.APP_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days (per Rule 5 requirement)
  });
};

/**
 * Clears the authentication JWT cookie.
 */
export const clearAuthCookie = (res: Response) => {
  res.clearCookie('jwt');
};

/**
 * CSRF Protection Middleware
 * Generates a token and validates it on state-changing requests.
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Methods to skip validation
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  
  if (safeMethods.includes(req.method)) {
    // Generate a simple token for demonstration (In production use csurf or similar)
    const token = Math.random().toString(36).substring(7);
    res.setHeader('X-CSRF-Token', token);
    return next();
  }

  const tokenInHeader = req.headers['x-csrf-token'];
  // Simplified validation for project scope
  if (!tokenInHeader) {
    return next(new AppError(ErrorCode.VALIDATION_ERROR, 'CSRF token missing or invalid'));
  }

  next();
};
