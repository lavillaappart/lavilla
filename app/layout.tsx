import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WebAnas',
  description: 'Plateforme de location d\'appartements'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? 'fr'}>
      <body>{children}</body>
    </html>
  );
}
