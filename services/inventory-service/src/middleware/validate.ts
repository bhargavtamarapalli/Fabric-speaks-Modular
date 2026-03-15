import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { AppError, ErrorCode, logger } from '@fs/shared';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(new AppError(ErrorCode.VALIDATION_ERROR, 'Validation failed', { errors: error.errors }));
      }
      return next(error);
    }
  };
};

export const validateBody = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(new AppError(ErrorCode.VALIDATION_ERROR, 'Validation failed', { errors: error.errors }));
      }
      return next(error);
    }
  };
};
