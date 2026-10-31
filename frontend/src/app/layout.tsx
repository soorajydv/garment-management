import type { Metadata } from 'next';
import { ToastProvider } from '@/components/Toast';
import { ThemeProvider } from '@/components/ThemeProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'S & S Textiles — Factory OS',
  description: 'Order, production, billing and delivery management for S & S Textiles',
  applicationName: 'S & S Textiles Factory OS',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'S&S Textiles', statusBarStyle: 'default' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <body>
        <ThemeProvider><ToastProvider>{children}</ToastProvider></ThemeProvider>
      </body>
    </html>
  );
}
