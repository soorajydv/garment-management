import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../../middleware/auth';
import {
  changePasswordController,
  deleteAccountController,
  loginController,
  logoutController,
  meController,
  updateProfileController,
} from './auth.controller';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Please try again in a few minutes.' },
});

router.post('/login', loginLimiter, loginController);
router.post('/logout', logoutController);
router.get('/me', requireAuth, meController);
router.patch('/profile', requireAuth, updateProfileController);
router.delete('/account', requireAuth, deleteAccountController);
router.post('/change-password', requireAuth, changePasswordController);

export default router;
