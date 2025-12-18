import { Router } from 'express';
import { interpretLabs, scanLabs } from '../controllers/aiController';
import { authenticate as authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/interpret-labs', authMiddleware, interpretLabs);
router.post('/scan-labs', authMiddleware, scanLabs);

export default router;
