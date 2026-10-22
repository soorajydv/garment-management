import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../config/env';
import { User } from '../models/User';
import { Customer } from '../models/Customer';
import { AUTH_COOKIE, currentUser, requireAuth, signToken } from '../middleware/auth';
import { HttpError, badRequest, parse } from '../lib/http';
import { audit } from '../lib/audit';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Please try again in a few minutes.' },
});

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.isProd,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = parse(
    z.object({ email: z.string().trim().toLowerCase().min(3), password: z.string().min(1) }),
    req.body,
  );
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'Incorrect email or password');
  }
  if (!user.active) throw new HttpError(403, 'This account has been deactivated');
  user.lastLoginAt = new Date();
  await user.save();
  const token = signToken(String(user._id));
  res.cookie(AUTH_COOKIE, token, cookieOptions);
  await audit(
    { id: String(user._id), name: user.name, email: user.email, role: user.role as never, customerId: null },
    'auth.login', 'User', String(user._id), `${user.name} signed in`,
  );
  res.json({ token, user: await profile(String(user._id)) });
});

router.post('/logout', (_req, res) => {
  res.clearCookie(AUTH_COOKIE, { ...cookieOptions, maxAge: undefined });
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: await profile(currentUser(req).id) });
});

router.post('/change-password', requireAuth, async (req, res) => {
  const me = currentUser(req);
  const { currentPassword, newPassword } = parse(
    z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8, 'Use at least 8 characters') }),
    req.body,
  );
  const user = await User.findById(me.id).select('+passwordHash');
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) throw badRequest('Current password is incorrect');
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  await audit(me, 'auth.password_changed', 'User', me.id, `${me.name} changed their password`);
  res.json({ ok: true });
});

async function profile(userId: string) {
  const user = await User.findById(userId).lean();
  if (!user) throw new HttpError(401, 'Account not found');
  const customer = user.customer ? await Customer.findById(user.customer).select('name').lean() : null;
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    customer: customer ? { id: String(customer._id), name: customer.name } : null,
  };
}

export default router;
