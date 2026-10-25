import { Router } from 'express';
import { z } from 'zod';
import { InventoryItem, StockMovement, INVENTORY_CATEGORIES } from '../models/Inventory';
import { Order } from '../models/Order';
import { currentUser, requireAnyPermission, requirePermission } from '../middleware/auth';
import { assertObjectId, badRequest, conflict, notFound, parse } from '../lib/http';
import { audit } from '../lib/audit';

const router = Router();
router.use(requirePermission('inventory.view'));

const itemDto = (i: Record<string, any>) => ({
  id: String(i._id),
  name: i.name,
  sku: i.sku,
  category: i.category,
  unit: i.unit,
  onHand: i.onHand,
  reorderLevel: i.reorderLevel,
  active: i.active,
  lowStock: i.onHand < i.reorderLevel,
  updatedAt: i.updatedAt,
});

const movementDto = (m: Record<string, any>) => ({
  id: String(m._id),
  item: m.item && typeof m.item === 'object' && 'name' in m.item ? { id: String(m.item._id), name: m.item.name, sku: m.item.sku, unit: m.item.unit } : { id: String(m.item) },
  type: m.type,
  change: m.change,
  balanceAfter: m.balanceAfter,
  order: m.order && typeof m.order === 'object' && 'orderNo' in m.order ? { id: String(m.order._id), orderNo: m.order.orderNo } : null,
  note: m.note,
  byName: m.byName,
  createdAt: m.createdAt,
});

router.get('/items', async (req, res) => {
  const includeInactive = req.query.all === '1';
  const items = await InventoryItem.find(includeInactive ? {} : { active: true }).sort({ category: 1, name: 1 }).lean();
  res.json({ items: items.map(itemDto) });
});

const itemSchema = z.object({
  name: z.string().trim().min(2),
  sku: z.string().trim().min(2).max(30).regex(/^[A-Za-z0-9-_]+$/, 'Use letters, numbers and dashes only'),
  category: z.enum(INVENTORY_CATEGORIES).default('Other'),
  unit: z.string().trim().min(1).max(20),
  reorderLevel: z.coerce.number().min(0).default(0),
  openingStock: z.coerce.number().min(0).optional().default(0),
});

router.post('/items', requirePermission('inventory.manage'), async (req, res) => {
  const user = currentUser(req);
  const body = parse(itemSchema, req.body);
  const item = await InventoryItem.create({ ...body, onHand: body.openingStock });
  if (body.openingStock > 0) {
    await StockMovement.create({ item: item._id, type: 'in', change: body.openingStock, balanceAfter: body.openingStock, note: 'Opening stock', by: user.id, byName: user.name });
  }
  await audit(user, 'inventory.item_created', 'InventoryItem', String(item._id), `Added material ${item.name} (${item.sku})`);
  res.status(201).json({ item: itemDto(item.toObject()) });
});

router.patch('/items/:id', requirePermission('inventory.manage'), async (req, res) => {
  const user = currentUser(req);
  const id = assertObjectId(req.params.id, 'Item');
  const body = parse(itemSchema.omit({ openingStock: true }).partial().extend({ active: z.boolean().optional() }), req.body);
  const item = await InventoryItem.findByIdAndUpdate(id, body, { returnDocument: 'after', runValidators: true }).lean();
  if (!item) throw notFound('Item not found');
  await audit(user, 'inventory.item_updated', 'InventoryItem', id, `Updated material ${item.name}`);
  res.json({ item: itemDto(item) });
});

const movementSchema = z.object({
  type: z.enum(['in', 'out', 'adjust']),
  /** For in/out: quantity moved. For adjust: the counted quantity on hand. */
  quantity: z.coerce.number().min(0),
  note: z.string().trim().max(300).optional().default(''),
  orderNo: z.string().trim().optional(),
});

router.post('/items/:id/movements', requireAnyPermission('inventory.move', 'inventory.adjust'), async (req, res) => {
  const user = currentUser(req);
  const id = assertObjectId(req.params.id, 'Item');
  const body = parse(movementSchema, req.body);
  if (body.type !== 'adjust' && body.quantity <= 0) throw badRequest('quantity: Enter a quantity greater than zero');
  if (body.type === 'adjust' && !user.permissions.includes('inventory.adjust')) throw conflict('You do not have permission to make stock count adjustments');
  if (body.type === 'adjust' && !body.note) throw badRequest('note: Give a reason for the adjustment');

  let orderId = null;
  if (body.orderNo) {
    const order = await Order.findOne({ orderNo: body.orderNo.toUpperCase() }).select('_id').lean();
    if (!order) throw badRequest(`orderNo: Order ${body.orderNo} not found`);
    orderId = order._id;
  }

  const existing = await InventoryItem.findById(id).lean();
  if (!existing) throw notFound('Item not found');

  let updated;
  if (body.type === 'adjust') {
    updated = await InventoryItem.findByIdAndUpdate(id, { $set: { onHand: body.quantity } }, { returnDocument: 'after' }).lean();
  } else {
    const change = body.type === 'in' ? body.quantity : -body.quantity;
    // Conditional update prevents stock from going negative under concurrent issues.
    const guard = body.type === 'out' ? { onHand: { $gte: body.quantity } } : {};
    updated = await InventoryItem.findOneAndUpdate({ _id: id, ...guard }, { $inc: { onHand: change } }, { returnDocument: 'after' }).lean();
    if (!updated) throw conflict(`Only ${existing.onHand} ${existing.unit} available`);
  }
  const change = body.type === 'adjust' ? body.quantity - existing.onHand : body.type === 'in' ? body.quantity : -body.quantity;
  const movement = await StockMovement.create({
    item: id, type: body.type, change, balanceAfter: updated!.onHand, order: orderId, note: body.note, by: user.id, byName: user.name,
  });
  await audit(user, `inventory.stock_${body.type}`, 'InventoryItem', id, `${body.type.toUpperCase()} ${change > 0 ? '+' : ''}${change} ${existing.unit} ${existing.name}`);
  res.status(201).json({ item: itemDto(updated!), movement: movementDto(movement.toObject()) });
});

router.get('/movements', async (req, res) => {
  const filter: Record<string, unknown> = {};
  if (typeof req.query.item === 'string') filter.item = assertObjectId(req.query.item, 'Item');
  const movements = await StockMovement.find(filter)
    .populate('item', 'name sku unit')
    .populate('order', 'orderNo')
    .sort({ createdAt: -1 })
    .limit(Math.min(200, Number(req.query.limit) || 50))
    .lean();
  res.json({ movements: movements.map(movementDto) });
});

export default router;
