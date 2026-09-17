import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WebAnas',
  description: 'Plataforma de alquiler de apartamentos'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
