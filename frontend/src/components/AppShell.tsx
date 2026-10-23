'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { ROLE_LABELS, initials } from '@/lib/format';
import type { Role } from '@/lib/types';
import { api } from '@/lib/api';
import { useTheme } from './ThemeProvider';

type NavItem = { href: string; label: string; icon: string; roles: Role[] | 'all' };

const STAFF: Role[] = ['owner', 'design', 'printing', 'stitching', 'finishing', 'accounts'];
const PRODUCTION: Role[] = ['owner', 'design', 'printing', 'stitching', 'finishing'];

const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: 'Workspace',
    items: [
      { href: '/dashboard', label: 'Overview', icon: '▦', roles: 'all' },
      { href: '/orders', label: 'Orders', icon: '▤', roles: 'all' },
      { href: '/production', label: 'Production board', icon: '◫', roles: PRODUCTION },
      { href: '/customers', label: 'Customers', icon: '♙', roles: ['owner', 'accounts'] },
      { href: '/inventory', label: 'Inventory', icon: '▧', roles: STAFF.filter((r) => r !== 'accounts') },
    ],
  },
  {
    label: 'Finance & insights',
    items: [
      { href: '/billing', label: 'Quotations & billing', icon: '▱', roles: ['owner', 'accounts', 'customer'] },
      { href: '/delivery', label: 'Delivery', icon: '↗', roles: ['owner', 'accounts', 'finishing'] },
      { href: '/reports', label: 'Reports', icon: '▥', roles: ['owner', 'accounts'] },
    ],
  },
  {
    label: 'Administration',
    items: [
      { href: '/users', label: 'Users & access', icon: '♧', roles: ['owner'] },
      { href: '/activity', label: 'Audit log', icon: '☰', roles: ['owner'] },
      { href: '/settings', label: 'Settings', icon: '⚙', roles: 'all' },
    ],
  },
];

const TITLES: Record<string, string> = {
  dashboard: 'Factory overview',
  orders: 'Order management',
  production: 'Production board',
  customers: 'Customer directory',
  inventory: 'Inventory & materials',
  billing: 'Quotations & billing',
  delivery: 'Delivery & dispatch',
  reports: 'Business reports',
  users: 'Users & access',
  activity: 'Audit log',
  settings: 'Settings',
};

export function AppShell({ children }: { children: ReactNode }) {
  const { user, settings, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; title: string; body: string; href: string }[]>([]);
  const { theme, toggleTheme } = useTheme();
  const section = pathname.split('/')[1] || 'dashboard';

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    let active = true;
    api<{ notifications: { id: string; title: string; body: string; href: string }[] }>('/notifications')
      .then((data) => { if (active) setNotifications(data.notifications); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [pathname]);

  const visible = NAV.map((g) => ({ ...g, items: g.items.filter((i) => i.roles === 'all' || i.roles.includes(user.role)) })).filter((g) => g.items.length);
  const title = user.role === 'customer' && section === 'orders' ? 'My orders' : TITLES[section] ?? 'S & S Textiles';

  return (
    <div className="layout">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">S&amp;S</div>
          <div>
            <div className="brand-name">{settings.businessName.replace(/ PVT LTD$/i, '')}</div>
            <div className="brand-sub">{user.role === 'customer' ? 'CUSTOMER PORTAL' : 'FACTORY MANAGEMENT'}</div>
          </div>
        </div>
        {visible.map((group) => (
          <div key={group.label}>
            <div className="nav-label">{user.role === 'customer' && group.label === 'Administration' ? 'Account' : group.label}</div>
            <nav className="nav-group">
              {group.items.map((item) => (
                <Link key={item.href} href={item.href} className={`nav-btn ${pathname.startsWith(item.href) ? 'active' : ''}`}>
                  <span className="nav-icon" aria-hidden>{item.icon}</span>
                  {user.role === 'customer' && item.href === '/orders' ? 'My orders' : item.label}
                </Link>
              ))}
            </nav>
          </div>
        ))}
        <div className="side-bottom">
          <strong>{user.customer?.name ?? ROLE_LABELS[user.role]}</strong>
          Signed in as {user.email}
          <button className="btn small block" style={{ marginTop: 10, background: 'transparent', color: '#fff', borderColor: '#ffffff40' }} onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>
      {open && <div className="modal-backdrop" style={{ zIndex: 45, background: '#0006' }} onClick={() => setOpen(false)} />}
      <main>
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="icon-btn menu-toggle" aria-label="Open menu" onClick={() => setOpen(true)}>☰</button>
            <div>
              <div className="breadcrumb">S&amp;S TEXTILES / {title}</div>
              <div className="page-title">{title}</div>
            </div>
          </div>
          <div className="top-actions">
            <button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>{theme === 'dark' ? '☀' : '☾'}</button>
            <div className="notification-wrap">
              <button className="icon-btn" onClick={() => setNotificationsOpen((value) => !value)} aria-label="Open notifications" aria-expanded={notificationsOpen}>♢{notifications.length > 0 && <span className="notification-dot">{notifications.length > 9 ? '9+' : notifications.length}</span>}</button>
              {notificationsOpen && <div className="notification-menu">
                <h3>Notifications</h3>
                {notifications.length ? notifications.map((notification) => <Link key={notification.id} href={notification.href} className="notification-item" onClick={() => setNotificationsOpen(false)}><strong>{notification.title}</strong><span>{notification.body}</span></Link>) : <div className="empty">You’re all caught up.</div>}
              </div>}
            </div>
            <div className="user-chip">
              <div className="who">
                {user.name}
                <small>{ROLE_LABELS[user.role]}</small>
              </div>
              <div className="avatar">{initials(user.name)}</div>
            </div>
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
