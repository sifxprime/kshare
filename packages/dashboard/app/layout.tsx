import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-grotesk',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'KShare — Share localhost instantly',
  description: 'One command gives you a public HTTPS link to your localhost app. No deploy. No config. Links expire in 24h.',
  keywords: ['localhost tunnel', 'ngrok alternative', 'kshare', 'kodelyth', 'share localhost'],
  authors: [{ name: 'KODELYTH' }],
  openGraph: {
    title: 'KShare by KODELYTH',
    description: 'Share localhost instantly. Public HTTPS link in seconds.',
    type: 'website',
    url: 'https://kodelyth.net',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <body>{children}</body>
    </html>
  );
}
