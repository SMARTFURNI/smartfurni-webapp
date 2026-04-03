import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Extended Express Request with user info
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'admin' | 'manager' | 'sales' | 'support';
    isAdmin: boolean;
  };
}

/**
 * Authentication Middleware
 * Verifies JWT token and user permissions
 */
export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      logger.warn('No token provided', { path: req.path });
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: No token provided',
      });
    }

    // TODO: Verify JWT token
    // For now, we'll accept any token
    // In production, implement proper JWT verification

    // TODO: Extract user info from token
    // This should be implemented with actual JWT verification
    req.user = {
      id: 'user_placeholder',
      email: 'user@example.com',
      role: 'admin',
      isAdmin: true,
    };

    logger.debug('User authenticated', {
      userId: req.user.id,
      role: req.user.role,
    });

    next();
  } catch (error) {
    logger.error('Authentication failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
  }
};

/**
 * Admin-only Middleware
 * Restricts access to admin users only
 */
export const adminOnlyMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.isAdmin) {
    logger.warn('Unauthorized access attempt', {
      userId: req.user?.id,
      path: req.path,
    });
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Admin access required',
    });
  }
  next();
};

/**
 * Role-based Access Control Middleware
 */
export const roleBasedAccessMiddleware = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      logger.warn('Unauthorized role access attempt', {
        userId: req.user?.id,
        userRole: req.user?.role,
        allowedRoles,
        path: req.path,
      });
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Insufficient permissions',
      });
    }
    next();
  };
};

