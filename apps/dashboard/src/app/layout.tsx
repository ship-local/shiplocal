import type { Metadata } from 'next';
import { IBM_Plex_Mono, Source_Sans_3, Syne } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { SITE_URL } from '@/lib/site';
import './globals.css';

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
});

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-source-sans',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'ShipLocal',
    template: '%s',
  },
  description:
    'Open-source localhost tunneling platform — share local apps over HTTPS, self-host, or use ShipLocal Cloud.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${sourceSans.variable} ${ibmPlexMono.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
