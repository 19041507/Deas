import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Deas Finance',
  description: 'Banco digital com API própria e Open Finance simulado.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
