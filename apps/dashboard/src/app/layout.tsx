import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth-context';
import { SITE_URL } from '@/lib/site';
import './globals.css';

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
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
