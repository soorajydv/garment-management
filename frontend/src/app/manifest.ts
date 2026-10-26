import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'S & S Textiles Factory OS',
    short_name: 'S&S Textiles',
    description: 'Order, production, billing and delivery management for S & S Textiles.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#f9f7f7',
    theme_color: '#112d4e',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
