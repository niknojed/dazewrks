import type { Metadata, Viewport } from 'next';
import { Courier_Prime, Instrument_Sans, Newsreader } from 'next/font/google';
import './globals.css';

const ui = Instrument_Sans({ subsets: ['latin'], variable: '--font-ui', display: 'swap' });
const newsreader = Newsreader({ subsets: ['latin'], variable: '--font-newsreader', style: ['normal', 'italic'], display: 'swap' });
const courier = Courier_Prime({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-courier', display: 'swap' });

export const metadata: Metadata = {
  title: 'Notebook',
  description: 'Daily notes, scripts, songs and stories.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#121110' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <body className={`${ui.variable} ${newsreader.variable} ${courier.variable}`}>{children}</body>
    </html>
  );
}
