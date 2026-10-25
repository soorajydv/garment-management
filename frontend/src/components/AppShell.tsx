'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { initials, roleLabel } from '@/lib/format';
import type { Permission } from '@/lib/types';
import { api } from '@/lib/api';
import { useTheme } from './ThemeProvider';
import { Icon, type IconName } from './Icon';

type NavItem = { href: string; label: string; icon: IconName; permission?: Permission };

const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: 'Workspace',
    items: [
      { href: '/dashboard', label: 'Overview', icon: 'dashboard', permission: 'dashboard.view' },
      { href: '/orders', label: 'Orders', icon: 'orders', permission: 'orders.view' },
      { href: '/production', label: 'Production board', icon: 'production', permission: 'orders.stage.complete' },
      { href: '/customers', label: 'Customers', icon: 'customers', permission: 'customers.view' },
      { href: '/inventory', label: 'Inventory', icon: 'inventory', permission: 'inventory.view' },
    ],
  },
  {
    label: 'Finance & insights',
    items: [
      { href: '/billing', label: 'Quotations & billing', icon: 'receipt', permission: 'payments.view' },
      { href: '/delivery', label: 'Delivery', icon: 'delivery', permission: 'orders.view' },
      { href: '/attendance', label: 'Attendance', icon: 'attendance', permission: 'attendance.view' },
      { href: '/reports', label: 'Reports', icon: 'chart', permission: 'reports.view' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { href: '/users', label: 'Users & access', icon: 'users', permission: 'users.manage' },
      { href: '/roles', label: 'Roles & permissions', icon: 'roles', permission: 'roles.manage' },
      { href: '/profile', label: 'My profile', icon: 'profile', permission: 'profile.manage' },
      { href: '/activity', label: 'Audit log', icon: 'activity', permission: 'audit.view' },
      { href: '/settings', label: 'Settings', icon: 'settings', permission: 'settings.view' },
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
  attendance: 'Attendance & check-in',
  reports: 'Business reports',
  users: 'Users & access',
  roles: 'Roles & permissions',
  profile: 'My profile',
  activity: 'Audit log',
  settings: 'Settings',
};

export function AppShell({ children }: { children: ReactNode }) {
  const { user, meta, settings, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; title: string; body: string; href: string }[]>([]);
  const { theme, toggleTheme } = useTheme();
  const section = pathname.split('/')[1] || 'dashboard';

  function toggleSidebar() {
    if (window.matchMedia('(max-width: 820px)').matches) setOpen(true);
    else setCollapsed((value) => !value);
  }

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    let active = true;
    api<{ notifications: { id: string; title: string; body: string; href: string }[] }>('/notifications')
      .then((data) => { if (active) setNotifications(data.notifications); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [pathname]);

  const visible = NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.permission || meta.permissions.includes(i.permission)) })).filter((g) => g.items.length);
  const title = user.role === 'customer' && section === 'orders' ? 'My orders' : TITLES[section] ?? 'S & S Textiles';

  return (
    <div className={`layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">S&amp;S</div>
          <div className="brand-copy">
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
                  <span className="nav-icon"><Icon name={item.icon} size={17} /></span>
                  <span className="nav-text">{user.role === 'customer' && item.href === '/orders' ? 'My orders' : item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        ))}
        <div className="side-bottom">
          <div className="side-user-copy"><strong>{user.customer?.name ?? roleLabel(user.role, meta.roles)}</strong>
          Signed in as {user.email}</div>
          <button className="btn small block side-signout" style={{ marginTop: 10, background: 'transparent', color: '#fff', borderColor: '#ffffff40' }} onClick={logout} title="Sign out">
            <Icon name="logout" size={14} /><span className="side-signout-label">Sign out</span>
          </button>
        </div>
      </aside>
      {open && <div className="modal-backdrop" style={{ zIndex: 45, background: '#0006' }} onClick={() => setOpen(false)} />}
      <main>
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="icon-btn sidebar-toggle" aria-label="Toggle sidebar" title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={toggleSidebar}><Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={19} /></button>
            <div>
              <div className="breadcrumb">S&amp;S TEXTILES / {title}</div>
              <div className="page-title">{title}</div>
            </div>
          </div>
          <div className="top-actions">
            <button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} /></button>
            <div className="notification-wrap">
              <button className="icon-btn" onClick={() => setNotificationsOpen((value) => !value)} aria-label="Open notifications" aria-expanded={notificationsOpen}><Icon name="bell" size={17} />{notifications.length > 0 && <span className="notification-dot">{notifications.length > 9 ? '9+' : notifications.length}</span>}</button>
              {notificationsOpen && <div className="notification-menu">
                <h3>Notifications</h3>
                {notifications.length ? notifications.map((notification) => <Link key={notification.id} href={notification.href} className="notification-item" onClick={() => setNotificationsOpen(false)}><strong>{notification.title}</strong><span>{notification.body}</span></Link>) : <div className="empty">You’re all caught up.</div>}
              </div>}
            </div>
            <div className="user-chip">
              <div className="who">
                {user.name}
                <small>{roleLabel(user.role, meta.roles)}</small>
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
