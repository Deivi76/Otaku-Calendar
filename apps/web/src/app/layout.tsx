import type { Metadata } from 'next';
import './globals.css';
import { CommandMenuProvider } from '@/components/CommandMenuProvider';

export const metadata: Metadata = {
  title: 'Otaku Calendar - Seu calendário de animes',
  description: 'Calendário de lançamentos de animes, rumores e anúncios',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <CommandMenuProvider>{children}</CommandMenuProvider>
      </body>
    </html>
  );
}
