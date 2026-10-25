import { Router } from 'express';
import { InventoryItem } from '../models/Inventory';
import { Order } from '../models/Order';
import { currentUser, type AuthUser } from '../middleware/auth';
import { getSettings } from '../models/Settings';
import { orderScope } from '../lib/workflow';
import { Attendance } from '../features/attendance/attendance.model';
import { NotificationRead } from '../models/NotificationRead';

type Notification = { id: string; type: string; tone: string; title: string; body: string; href: string };

async function buildNotifications(user: AuthUser): Promise<Notification[]> {
  const settings = await getSettings();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const soon = new Date(today);
  soon.setDate(soon.getDate() + settings.dueSoonDays + 1);
  const scope = orderScope(user);
  const notifications: Notification[] = [];

  const approvalOrders = await Order.find({ ...scope, stage: 'design', status: { $in: ['Awaiting approval', 'Changes requested'] } })
    .populate('customer', 'name').sort({ dueDate: 1 }).limit(8).lean();
  for (const order of approvalOrders) {
    const customer = order.customer as { name?: string };
    const customerCopy = user.role === 'customer' ? 'Artwork is ready for your review.' : `${customer?.name ?? 'Customer'} approval is needed.`;
    notifications.push({ id: `approval-${String(order._id)}`, type: 'approval', tone: 'amber', title: `Artwork ${order.status === 'Changes requested' ? 'needs changes' : 'awaiting approval'}`, body: `${order.orderNo} · ${customerCopy}`, href: `/orders/${String(order._id)}` });
  }

  const dueOrders = await Order.find({ ...scope, stage: { $ne: 'delivered' }, dueDate: { $lt: soon } })
    .populate('customer', 'name').sort({ dueDate: 1 }).limit(8).lean();
  for (const order of dueOrders) {
    const overdue = new Date(order.dueDate).getTime() < today.getTime();
    const customer = order.customer as { name?: string };
    notifications.push({ id: `due-${String(order._id)}`, type: overdue ? 'overdue' : 'due', tone: overdue ? 'red' : 'amber', title: overdue ? 'Order is overdue' : 'Delivery due soon', body: `${order.orderNo} · ${customer?.name ?? 'Customer'} · ${new Date(order.dueDate).toLocaleDateString('en-GB')}`, href: `/orders/${String(order._id)}` });
  }

  if (user.role !== 'customer') {
    const lowStock = await InventoryItem.find({ active: true, $expr: { $lt: ['$onHand', '$reorderLevel'] } }).sort({ onHand: 1 }).limit(6).lean();
    for (const item of lowStock) notifications.push({ id: `stock-${String(item._id)}`, type: 'stock', tone: 'red', title: 'Material below reorder level', body: `${item.name} · ${item.onHand} ${item.unit} remaining`, href: '/inventory' });
  }

  if (user.permissions.includes('attendance.approve')) {
    const pendingCheckIns = await Attendance.find({ status: 'pending' }).populate('user', 'name').sort({ checkInAt: 1 }).limit(8).lean();
    for (const record of pendingCheckIns) {
      const employee = record.user as { name?: string };
      notifications.push({ id: `attendance-${String(record._id)}`, type: 'attendance', tone: 'amber', title: 'Check-in approval needed', body: `${employee?.name ?? 'Employee'} requested check-in approval`, href: '/attendance' });
    }
  }
  return notifications.slice(0, 18);
}

async function withReadState(userId: string, notifications: Notification[]) {
  const reads = await NotificationRead.find({ userId, notificationId: { $in: notifications.map((notification) => notification.id) } }).lean();
  const readIds = new Set(reads.map((read) => read.notificationId));
  return notifications.map((notification) => ({ ...notification, read: readIds.has(notification.id) }));
}

const router = Router();

router.get('/', async (req, res) => {
  const user = currentUser(req);
  const notifications = await withReadState(user.id, await buildNotifications(user));
  res.json({ notifications, count: notifications.filter((notification) => !notification.read).length });
});

router.post('/read-all', async (req, res) => {
  const user = currentUser(req);
  const notifications = await buildNotifications(user);
  if (notifications.length) {
    await NotificationRead.bulkWrite(notifications.map((notification) => ({ updateOne: { filter: { userId: user.id, notificationId: notification.id }, update: { $set: { readAt: new Date() } }, upsert: true } })));
  }
  res.json({ ok: true, count: notifications.length });
});

router.post('/:id/read', async (req, res) => {
  const user = currentUser(req);
  const notifications = await buildNotifications(user);
  if (!notifications.some((notification) => notification.id === req.params.id)) {
    res.status(404).json({ error: 'Notification not found' });
    return;
  }
  await NotificationRead.updateOne({ userId: user.id, notificationId: req.params.id }, { $set: { readAt: new Date() } }, { upsert: true });
  res.json({ ok: true });
});

export default router;
