import { Router } from 'express';
import { InventoryItem } from '../models/Inventory';
import { Order } from '../models/Order';
import { currentUser } from '../middleware/auth';
import { getSettings } from '../models/Settings';
import { orderScope } from '../lib/workflow';

const router = Router();

router.get('/', async (req, res) => {
  const user = currentUser(req);
  const settings = await getSettings();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const soon = new Date(today);
  soon.setDate(soon.getDate() + settings.dueSoonDays + 1);
  const scope = orderScope(user);
  const notifications: { id: string; type: string; tone: string; title: string; body: string; href: string }[] = [];

  const approvalOrders = await Order.find({
    ...scope,
    stage: 'design',
    status: { $in: ['Awaiting approval', 'Changes requested'] },
  }).populate('customer', 'name').sort({ dueDate: 1 }).limit(8).lean();

  for (const order of approvalOrders) {
    const customer = order.customer as { name?: string };
    const customerCopy = user.role === 'customer' ? 'Artwork is ready for your review.' : `${customer?.name ?? 'Customer'} approval is needed.`;
    notifications.push({
      id: `approval-${String(order._id)}`,
      type: 'approval',
      tone: 'amber',
      title: `Artwork ${order.status === 'Changes requested' ? 'needs changes' : 'awaiting approval'}`,
      body: `${order.orderNo} · ${customerCopy}`,
      href: `/orders/${String(order._id)}`,
    });
  }

  const dueOrders = await Order.find({
    ...scope,
    stage: { $ne: 'delivered' },
    dueDate: { $lt: soon },
  }).populate('customer', 'name').sort({ dueDate: 1 }).limit(8).lean();

  for (const order of dueOrders) {
    const overdue = new Date(order.dueDate).getTime() < today.getTime();
    const customer = order.customer as { name?: string };
    notifications.push({
      id: `due-${String(order._id)}`,
      type: overdue ? 'overdue' : 'due',
      tone: overdue ? 'red' : 'amber',
      title: overdue ? 'Order is overdue' : 'Delivery due soon',
      body: `${order.orderNo} · ${customer?.name ?? 'Customer'} · ${new Date(order.dueDate).toLocaleDateString('en-GB')}`,
      href: `/orders/${String(order._id)}`,
    });
  }

  if (user.role !== 'customer') {
    const lowStock = await InventoryItem.find({ active: true, $expr: { $lt: ['$onHand', '$reorderLevel'] } }).sort({ onHand: 1 }).limit(6).lean();
    for (const item of lowStock) {
      notifications.push({ id: `stock-${String(item._id)}`, type: 'stock', tone: 'red', title: 'Material below reorder level', body: `${item.name} · ${item.onHand} ${item.unit} remaining`, href: '/inventory' });
    }
  }

  res.json({ notifications: notifications.slice(0, 18), count: notifications.length });
});

export default router;
