'use client';

import { useAnimeData } from '@/hooks/useAnimeData';
import { CommandMenu } from '@/components/CommandMenu';

export function CommandMenuProvider({ children }: { children: React.ReactNode }) {
  const { data } = useAnimeData();

  return (
    <>
      {children}
      <CommandMenu animeData={data} />
    </>
  );
}
