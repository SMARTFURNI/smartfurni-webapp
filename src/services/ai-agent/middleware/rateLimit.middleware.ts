import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

/**
 * Simple In-Memory Rate Limiter
 * For production, use Redis or a dedicated rate limiting service
 */
class RateLimiter {
  private store: RateLimitStore = {};
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 3600000, maxRequests: number = 1000) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  private getKey(req: Request): string {
    // Use user ID if available, otherwise use IP address
    const userId = (req as any).user?.id;
    return userId || req.ip || 'unknown';
  }

  private cleanup(): void {
    const now = Date.now();
    for (const key in this.store) {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    }
  }

  isAllowed(req: Request): boolean {
    const key = this.getKey(req);
    const now = Date.now();

    if (!this.store[key]) {
      this.store[key] = {
        count: 1,
        resetTime: now + this.windowMs,
      };
      return true;
    }

    const entry = this.store[key];

    if (now > entry.resetTime) {
      // Reset window
      entry.count = 1;
      entry.resetTime = now + this.windowMs;
      return true;
    }

    entry.count++;
    return entry.count <= this.maxRequests;
  }

  getRemaining(req: Request): number {
    const key = this.getKey(req);
    if (!this.store[key]) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - this.store[key].count);
  }
}

// Create rate limiter instance
const limiter = new RateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS || '3600000'),
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000')
);

/**
 * Rate Limiting Middleware
 */
export const rateLimitMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!limiter.isAllowed(req)) {
    logger.warn('Rate limit exceeded', {
      userId: (req as any).user?.id,
      ip: req.ip,
      path: req.path,
    });

    res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again later.',
    });
    return;
  }

  // Add rate limit info to response headers
  res.setHeader('X-RateLimit-Remaining', limiter.getRemaining(req));
  res.setHeader('X-RateLimit-Limit', 1000);

  next();
};

/**
 * Endpoint-specific Rate Limiter
 */
export const createEndpointRateLimiter = (
  windowMs: number,
  maxRequests: number
) => {
  const endpointLimiter = new RateLimiter(windowMs, maxRequests);

  return (req: Request, res: Response, next: NextFunction) => {
    if (!endpointLimiter.isAllowed(req)) {
      logger.warn('Endpoint rate limit exceeded', {
        endpoint: req.path,
        userId: (req as any).user?.id,
      });

      res.status(429).json({
        success: false,
        error: 'Too many requests to this endpoint',
      });
      return;
    }

    res.setHeader('X-RateLimit-Remaining', endpointLimiter.getRemaining(req));
    next();
  };
};

