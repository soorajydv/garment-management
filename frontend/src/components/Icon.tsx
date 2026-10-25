import type { SVGProps } from 'react';

export type IconName =
  | 'activity' | 'alert' | 'arrowUp' | 'attendance' | 'bell' | 'box' | 'chart' | 'check' | 'chevronLeft' | 'chevronRight' | 'customers' | 'dashboard'
  | 'delivery' | 'inventory' | 'menu' | 'moon' | 'orders' | 'production' | 'receipt'
  | 'profile' | 'roles' | 'settings' | 'sidebar' | 'sun' | 'users' | 'logout';

const PATHS: Record<IconName, React.ReactNode> = {
  activity: <><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="7" cy="6" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="17" cy="18" r="1" /></>,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></>,
  arrowUp: <><path d="M12 19V5M6 11l6-6 6 6" /></>,
  attendance: <><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  box: <><path d="m4 7 8-4 8 4-8 4-8-4Z" /><path d="M4 7v10l8 4 8-4V7M12 11v10" /></>,
  chart: <><path d="M4 19V5M4 19h16" /><path d="m7 15 3-4 3 2 5-7" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  chevronLeft: <path d="m15 6-6 6 6 6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  customers: <><path d="M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" /><circle cx="9.5" cy="7" r="3" /><path d="M17 11a3 3 0 1 0-1-5.8M21 20v-1a4 4 0 0 0-3-3.9" /></>,
  dashboard: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
  delivery: <><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z" /><circle cx="7" cy="19" r="2" /><circle cx="17" cy="19" r="2" /></>,
  inventory: <><path d="m4 7 8-4 8 4-8 4-8-4ZM4 12l8 4 8-4M4 17l8 4 8-4" /></>,
  logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M21 3v18" /></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  moon: <path d="M20 15.3A8 8 0 0 1 8.7 4 8 8 0 1 0 20 15.3Z" />,
  orders: <><path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  production: <><path d="M4 5h6v14H4zM14 5h6v14h-6z" /><path d="M10 9h4M10 15h4" /></>,
  profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  receipt: <><path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  roles: <><path d="M12 3 20 6v5c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6l8-3Z" /><path d="m9 12 2 2 4-4" /></>,
  settings: <><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /><path d="m19.4 15 .1.1a2 2 0 1 1-2.8 2.8l-.1-.1a2 2 0 0 0-3.4 1.4v.3a2 2 0 1 1-4 0v-.2A2 2 0 0 0 5.8 18l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A2 2 0 0 0 1.6 12a2 2 0 1 1 4 0A2 2 0 0 0 7 8.6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A2 2 0 0 0 12 4.4a2 2 0 1 1 4 0v.2A2 2 0 0 0 19.4 6l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A2 2 0 0 0 23.6 12a2 2 0 1 1-4 0 2 2 0 0 0-3.4 3Z" /></>,
  sidebar: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M14 9l3 3-3 3" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
};

export function Icon({ name, size = 18, strokeWidth = 1.8, ...props }: { name: IconName; size?: number; strokeWidth?: number } & Omit<SVGProps<SVGSVGElement>, 'name'>) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>{PATHS[name]}</svg>;
}
