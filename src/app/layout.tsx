import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PWARegister } from '@/components/layout/PWARegister';

export const metadata: Metadata = {
  title: '마이핑 컴패니언 미니게임',
  description: '핑들과 함께하는 미니게임 천국!',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '핑게임',
  },
  icons: {
    icon: [
      { url: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
      { url: '/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/icon-192.svg' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#FFD6E5',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
