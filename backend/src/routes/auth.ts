import express from 'express';
import * as authController from '../controllers/authController';
import { authenticate, authorize } from '../middleware/auth';
import { validateLogin, validateUser, validatePinAuth } from '../middleware/validation';
import { validationResult } from 'express-validator';
import { auditLog } from '../middleware/audit';

const router = express.Router();

// Validation result handler
const handleValidation = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Public routes
router.post('/register', validateUser, handleValidation, authController.register);
router.post('/login', validateLogin, handleValidation, auditLog('LOGIN', 'System'), authController.login);

// Protected routes
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfile);
router.post('/verify-pin', authenticate, validatePinAuth, handleValidation, authController.verifyPin);
router.post('/set-pin', authenticate, authController.setPin);

// Admin only
router.get('/users', authenticate, authorize('Admin'), authController.getAllUsers);

export default router;
