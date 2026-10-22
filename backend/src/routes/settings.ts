import { Router } from 'express';
import { z } from 'zod';
import { getSettings, Settings } from '../models/Settings';
import { AuditLog } from '../models/AuditLog';
import { currentUser, requireRole } from '../middleware/auth';
import {
  DELIVERY_METHODS, NECK_TYPES, PAYMENT_METHODS, PRODUCT_CONFIGS, ROLES, SIZES, SLEEVES, STAGE_LABELS, STAGES,
} from '../lib/constants';
import { INVENTORY_CATEGORIES } from '../models/Inventory';
import { pagination, parse } from '../lib/http';
import { audit } from '../lib/audit';

export const settingsRouter = Router();

const dto = (s: Record<string, any>) => ({
  businessName: s.businessName,
  address: s.address,
  phone: s.phone,
  email: s.email,
  panNumber: s.panNumber,
  currency: s.currency,
  timezone: s.timezone,
  orderPrefix: s.orderPrefix,
  invoicePrefix: s.invoicePrefix,
  dueSoonDays: s.dueSoonDays,
  invoiceFooter: s.invoiceFooter,
});

settingsRouter.get('/', async (_req, res) => {
  res.json({ settings: dto((await getSettings()).toObject()) });
});

const prefix = z.string().trim().min(1).max(8).regex(/^[A-Z0-9]+$/, 'Use capital letters and numbers only');

settingsRouter.put('/', requireRole('owner'), async (req, res) => {
  const user = currentUser(req);
  const body = parse(
    z.object({
      businessName: z.string().trim().min(2).max(120),
      address: z.string().trim().max(300).default(''),
      phone: z.string().trim().max(60).default(''),
      email: z.string().trim().max(120).default(''),
      panNumber: z.string().trim().max(30).default(''),
      orderPrefix: prefix,
      invoicePrefix: prefix,
      dueSoonDays: z.coerce.number().int().min(1).max(30),
      invoiceFooter: z.string().trim().max(500).default(''),
    }),
    req.body,
  );
  await getSettings();
  const saved = await Settings.findByIdAndUpdate('global', body, { returnDocument: 'after' }).lean();
  await audit(user, 'settings.updated', 'Settings', 'global', 'Updated business settings');
  res.json({ settings: dto(saved!) });
});

/** Static option lists so the frontend never hard-codes business vocabulary. */
export const metaRouter = Router();
metaRouter.get('/', (_req, res) => {
  res.json({
    roles: ROLES,
    stages: STAGES.map((s) => ({ key: s, label: STAGE_LABELS[s] })),
    productConfigs: PRODUCT_CONFIGS,
    neckTypes: NECK_TYPES,
    sleeves: SLEEVES,
    sizes: SIZES.filter(Boolean),
    paymentMethods: PAYMENT_METHODS,
    deliveryMethods: DELIVERY_METHODS,
    inventoryCategories: INVENTORY_CATEGORIES,
  });
});

export const auditRouter = Router();
auditRouter.get('/', requireRole('owner'), async (req, res) => {
  const { limit, skip, page } = pagination(req.query as Record<string, unknown>, 50);
  const [logs, total] = await Promise.all([
    AuditLog.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(),
  ]);
  res.json({
    logs: logs.map((l) => ({ id: String(l._id), actorName: l.actorName, actorRole: l.actorRole, action: l.action, entity: l.entity, entityId: l.entityId, summary: l.summary, at: l.createdAt })),
    total,
    page,
    limit,
  });
});
