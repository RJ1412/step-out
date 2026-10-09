import type { Metadata, Viewport } from 'next';
import { Newsreader } from 'next/font/google';
import './globals.css';

const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-serif',
});

export const metadata: Metadata = {
  title: 'Step Out — Get outside in under a minute',
  description: 'Plan an outing in under a minute, then put your phone away. Local weather, real trails, voice notes.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#f7f4ed',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={newsreader.variable}>
      <body className="antialiased min-h-screen bg-[#f7f4ed] text-[#1c1b18]">
        {children}
      </body>
    </html>
  );
}
