import { Router } from 'express';
import { z } from 'zod';
import { getSettings, Settings } from '../models/Settings';
import { AuditLog } from '../models/AuditLog';
import { currentUser, requirePermission } from '../middleware/auth';
import {
  DELIVERY_METHODS, NECK_TYPES, PAYMENT_METHODS, PERMISSIONS, PRODUCT_CONFIGS, SIZES, SLEEVES, STAGE_LABELS, STAGES,
} from '../lib/constants';
import { listRoles, permissionsForUserRole } from '../lib/roles';
import { INVENTORY_CATEGORIES } from '../models/Inventory';
import { badRequest, escapeRegex, pagination, parse } from '../lib/http';
import { audit } from '../lib/audit';
import { avatarUpload, removeStoredFile, storedFilePath } from '../lib/uploads';

export const settingsRouter = Router();

const dto = (s: Record<string, any>) => ({
  businessName: s.businessName,
  logoUrl: s.logoStoredName ? '/api/settings/logo' : '',
  address: s.address,
  phone: s.phone,
  email: s.email,
  panNumber: s.panNumber,
  currency: s.currency,
  timezone: s.timezone,
  orderPrefix: s.orderPrefix,
  invoicePrefix: s.invoicePrefix,
  dueSoonDays: s.dueSoonDays,
  auditRetentionDays: s.auditRetentionDays,
  invoiceFooter: s.invoiceFooter,
});

settingsRouter.get('/', requirePermission('settings.view'), async (_req, res) => {
  res.json({ settings: dto((await getSettings()).toObject()) });
});

const prefix = z.string().trim().min(1).max(8).regex(/^[A-Z0-9]+$/, 'Use capital letters and numbers only');

settingsRouter.put('/', requirePermission('settings.manage'), async (req, res) => {
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
      auditRetentionDays: z.coerce.number().int().min(1).max(3650).optional(),
      invoiceFooter: z.string().trim().max(500).default(''),
    }),
    req.body,
  );
  await getSettings();
  const saved = await Settings.findByIdAndUpdate('global', body, { returnDocument: 'after' }).lean();
  await audit(user, 'settings.updated', 'Settings', 'global', 'Updated business settings');
  res.json({ settings: dto(saved!) });
});

settingsRouter.patch('/audit-retention', requirePermission('settings.manage'), async (req, res) => {
  const user = currentUser(req);
  const body = parse(z.object({ auditRetentionDays: z.coerce.number().int().min(1).max(3650) }), req.body);
  const saved = await Settings.findByIdAndUpdate('global', body, { returnDocument: 'after' }).lean();
  await audit(user, 'settings.audit_retention.updated', 'Settings', 'global', `Set audit-log retention to ${body.auditRetentionDays} days`);
  res.json({ auditRetentionDays: saved?.auditRetentionDays });
});

settingsRouter.get('/logo', requirePermission('settings.view'), async (_req, res) => {
  const settings = await getSettings();
  if (!settings.logoStoredName) { res.status(404).end(); return; }
  res.type(settings.logoMimeType ?? 'application/octet-stream').sendFile(storedFilePath(settings.logoStoredName), (err) => { if (err && !res.headersSent) res.status(404).end(); });
});

settingsRouter.patch('/business-logo', requirePermission('settings.manage'), avatarUpload.single('logo'), async (req, res) => {
  const user = currentUser(req);
  if (!req.file) throw badRequest('logo: Select an image to upload');
  const settings = await getSettings();
  const previous = settings.logoStoredName;
  settings.logoStoredName = req.file.filename;
  settings.logoMimeType = req.file.mimetype;
  await settings.save();
  removeStoredFile(previous);
  await audit(user, 'settings.business_logo_updated', 'Settings', 'global', 'Updated the business profile logo');
  res.json({ settings: dto(settings.toObject()) });
});

settingsRouter.delete('/business-logo', requirePermission('settings.manage'), async (req, res) => {
  const user = currentUser(req);
  const settings = await getSettings();
  const previous = settings.logoStoredName;
  settings.logoStoredName = null;
  settings.logoMimeType = null;
  await settings.save();
  removeStoredFile(previous);
  await audit(user, 'settings.business_logo_removed', 'Settings', 'global', 'Removed the business profile logo');
  res.json({ settings: dto(settings.toObject()) });
});

/** Static option lists so the frontend never hard-codes business vocabulary. */
export const metaRouter = Router();
metaRouter.get('/', async (req, res) => {
  const user = currentUser(req);
  res.json({
    roles: (await listRoles()).map((role) => ({ key: role.key, name: role.name, description: role.description ?? '', permissions: role.permissions ?? [], system: role.system })),
    stages: STAGES.map((s) => ({ key: s, label: STAGE_LABELS[s] })),
    productConfigs: PRODUCT_CONFIGS,
    neckTypes: NECK_TYPES,
    sleeves: SLEEVES,
    sizes: SIZES.filter(Boolean),
    paymentMethods: PAYMENT_METHODS,
    deliveryMethods: DELIVERY_METHODS,
    inventoryCategories: INVENTORY_CATEGORIES,
    permissions: await permissionsForUserRole(user.role),
    availablePermissions: PERMISSIONS,
  });
});

export const auditRouter = Router();
auditRouter.get('/', requirePermission('audit.view'), async (req, res) => {
  const { limit, skip, page } = pagination(req.query as Record<string, unknown>, 50);
  const query = req.query as Record<string, string | undefined>;
  const filter: Record<string, unknown> = {};
  if (query.action?.trim()) filter.action = query.action.trim();
  if (query.search?.trim()) {
    const rx = { $regex: escapeRegex(query.search.trim()), $options: 'i' };
    filter.$or = [
      { actorName: rx },
      { actorRole: rx },
      { action: rx },
      { entity: rx },
      { entityId: rx },
      { summary: rx },
    ];
  }
  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);
  res.json({
    logs: logs.map((l) => ({ id: String(l._id), actorName: l.actorName, actorRole: l.actorRole, action: l.action, entity: l.entity, entityId: l.entityId, summary: l.summary, at: l.createdAt })),
    total,
    page,
    limit,
    actions: await AuditLog.distinct('action'),
  });
});
