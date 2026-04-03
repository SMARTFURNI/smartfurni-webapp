import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Custom Error Class
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Global Error Handler Middleware
 */
export const errorHandlerMiddleware = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let code = 'INTERNAL_ERROR';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code || 'APP_ERROR';
  } else if (err instanceof SyntaxError) {
    statusCode = 400;
    message = 'Invalid JSON';
    code = 'INVALID_JSON';
  } else if (err instanceof TypeError) {
    statusCode = 400;
    message = err.message;
    code = 'TYPE_ERROR';
  }

  logger.error('Request error', {
    statusCode,
    message,
    code,
    path: req.path,
    method: req.method,
    userId: (req as any).user?.id,
    stack: err.stack,
  });

  res.status(statusCode).json({
    success: false,
    error: message,
    code,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * 404 Not Found Handler
 */
export const notFoundMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.warn('Route not found', {
    path: req.path,
    method: req.method,
    userId: (req as any).user?.id,
  });

  res.status(404).json({
    success: false,
    error: 'Route not found',
    code: 'NOT_FOUND',
  });
};

/**
 * Request Validation Error Handler
 */
export const validationErrorHandler = (
  errors: any[],
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const formattedErrors = errors.map((error) => ({
    field: error.param,
    message: error.msg,
  }));

  logger.warn('Validation error', {
    path: req.path,
    errors: formattedErrors,
    userId: (req as any).user?.id,
  });

  res.status(400).json({
    success: false,
    error: 'Validation failed',
    code: 'VALIDATION_ERROR',
    details: formattedErrors,
  });
};

/**
 * Async Error Wrapper
 * Wraps async route handlers to catch errors
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

