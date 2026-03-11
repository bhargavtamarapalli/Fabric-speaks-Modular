import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCode } from './errors';
import { Role } from './types';
import pino from 'pino';

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

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.userId) {
    return next(new AppError(ErrorCode.JWT_INVALID, 'Authentication required'));
  }
  next();
};

export const requireRole = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
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

export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    logger.error({ code: err.code, msg: err.message, meta: err.meta });
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        meta: err.meta
      }
    });
  }

  logger.error({ err, msg: 'Unhandled exception' });
  return res.status(500).json({
    success: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'An unexpected error occurred'
    }
  });
};
