import type { Request, Response } from 'express';
import { env } from '../../config/env';
import { AUTH_COOKIE, currentUser } from '../../middleware/auth';
import { parse } from '../../lib/http';
import { changePasswordSchema, deleteAccountSchema, loginSchema, profileSchema } from './auth.validation';
import { changePassword, deleteAccount, getProfile, login, updateProfile } from './auth.service';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.isProd,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export async function loginController(req: Request, res: Response) {
  const { email, password } = parse(loginSchema, req.body);
  const result = await login(email, password);
  res.cookie(AUTH_COOKIE, result.token, cookieOptions);
  res.json(result);
}

export function logoutController(_req: Request, res: Response) {
  res.clearCookie(AUTH_COOKIE, { ...cookieOptions, maxAge: undefined });
  res.json({ ok: true });
}

export async function meController(req: Request, res: Response) {
  res.json({ user: await getProfile(currentUser(req).id) });
}

export async function changePasswordController(req: Request, res: Response) {
  const me = currentUser(req);
  const { currentPassword, newPassword } = parse(changePasswordSchema, req.body);
  await changePassword(me.id, me, currentPassword, newPassword);
  res.json({ ok: true });
}

export async function updateProfileController(req: Request, res: Response) {
  const me = currentUser(req);
  const { name, phone } = parse(profileSchema, req.body);
  res.json({ user: await updateProfile(me.id, me, name, phone) });
}

export async function deleteAccountController(req: Request, res: Response) {
  const me = currentUser(req);
  const { password } = parse(deleteAccountSchema, req.body);
  await deleteAccount(me.id, me, password);
  res.clearCookie(AUTH_COOKIE, { ...cookieOptions, maxAge: undefined });
  res.json({ ok: true });
}
