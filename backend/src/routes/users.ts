import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User';
import { Customer } from '../models/Customer';
import { currentUser, requireRole } from '../middleware/auth';
import { ROLES } from '../lib/constants';
import { assertObjectId, badRequest, notFound, parse } from '../lib/http';
import { audit } from '../lib/audit';

const router = Router();
router.use(requireRole('owner'));

const toDto = (u: Record<string, any>) => ({
  id: String(u._id),
  name: u.name,
  email: u.email,
  role: u.role,
  phone: u.phone ?? '',
  active: u.active,
  customer: u.customer && typeof u.customer === 'object' && 'name' in u.customer
    ? { id: String(u.customer._id), name: u.customer.name }
    : null,
  lastLoginAt: u.lastLoginAt,
  createdAt: u.createdAt,
});

async function checkCustomerLink(role: string, customer: string | null | undefined) {
  if (role !== 'customer') return null;
  if (!customer) throw badRequest('customer: Customer accounts must be linked to a customer record');
  assertObjectId(customer, 'Customer');
  if (!(await Customer.exists({ _id: customer }))) throw badRequest('customer: Customer record not found');
  return customer;
}

router.get('/', async (_req, res) => {
  const users = await User.find().populate('customer', 'name').sort({ role: 1, name: 1 }).lean();
  res.json({ users: users.map(toDto) });
});

const createSchema = z.object({
  name: z.string().trim().min(2),
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8, 'Use at least 8 characters'),
  role: z.enum(ROLES),
  phone: z.string().trim().max(30).optional().default(''),
  customer: z.string().nullish(),
});

router.post('/', async (req, res) => {
  const me = currentUser(req);
  const body = parse(createSchema, req.body);
  const customer = await checkCustomerLink(body.role, body.customer);
  const user = await User.create({
    name: body.name,
    email: body.email,
    phone: body.phone,
    role: body.role,
    customer,
    passwordHash: await bcrypt.hash(body.password, 10),
  });
  await audit(me, 'user.created', 'User', String(user._id), `Created ${body.role} account for ${body.name}`);
  const saved = await User.findById(user._id).populate('customer', 'name').lean();
  res.status(201).json({ user: toDto(saved!) });
});

const updateSchema = z.object({
  name: z.string().trim().min(2).optional(),
  role: z.enum(ROLES).optional(),
  phone: z.string().trim().max(30).optional(),
  active: z.boolean().optional(),
  customer: z.string().nullish(),
});

router.patch('/:id', async (req, res) => {
  const me = currentUser(req);
  const id = assertObjectId(req.params.id, 'User');
  const body = parse(updateSchema, req.body);
  const user = await User.findById(id);
  if (!user) throw notFound('User not found');
  if (id === me.id && (body.active === false || (body.role && body.role !== 'owner'))) {
    throw badRequest('You cannot deactivate or demote your own owner account');
  }
  const role = body.role ?? user.role;
  const customerInput = body.customer === undefined ? (user.customer ? String(user.customer) : null) : body.customer;
  const customer = await checkCustomerLink(role, customerInput);
  if (body.name !== undefined) user.name = body.name;
  if (body.phone !== undefined) user.phone = body.phone;
  if (body.active !== undefined) user.active = body.active;
  user.role = role;
  user.set('customer', customer);
  await user.save();
  await audit(me, 'user.updated', 'User', id, `Updated ${user.name} (${role}${user.active ? '' : ', deactivated'})`);
  const saved = await User.findById(id).populate('customer', 'name').lean();
  res.json({ user: toDto(saved!) });
});

router.post('/:id/reset-password', async (req, res) => {
  const me = currentUser(req);
  const id = assertObjectId(req.params.id, 'User');
  const { password } = parse(z.object({ password: z.string().min(8, 'Use at least 8 characters') }), req.body);
  const user = await User.findById(id);
  if (!user) throw notFound('User not found');
  user.passwordHash = await bcrypt.hash(password, 10);
  await user.save();
  await audit(me, 'user.password_reset', 'User', id, `Reset password for ${user.name}`);
  res.json({ ok: true });
});

export default router;
