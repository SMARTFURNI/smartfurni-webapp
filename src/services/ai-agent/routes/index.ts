import { Router } from 'express';
import emailRoutes from './email.routes';
import zaloRoutes from './zalo.routes';
import scoringRoutes from './scoring.routes';
import tasksRoutes from './tasks.routes';
import statsRoutes from './stats.routes';
import { authMiddleware } from '../middleware/auth.middleware';
import { rateLimitMiddleware } from '../middleware/rateLimit.middleware';

const router = Router();

// Apply authentication and rate limiting to all AI Agent routes
router.use(authMiddleware);
router.use(rateLimitMiddleware);

// Mount routes
router.use('/email', emailRoutes);
router.use('/zalo', zaloRoutes);
router.use('/scoring', scoringRoutes);
router.use('/tasks', tasksRoutes);
router.use('/stats', statsRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AI Agent',
    timestamp: new Date().toISOString(),
  });
});

export default router;

