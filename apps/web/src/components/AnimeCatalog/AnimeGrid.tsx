'use client';

import { motion } from 'framer-motion';
import { AnimeCard } from './AnimeCard';
import { SkeletonCard } from './SkeletonCard';
import type { Anime } from './types';

interface AnimeGridProps {
  animeList: Anime[];
  onAnimeClick?: (anime: Anime) => void;
  isLoading?: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export function AnimeGrid({ animeList, onAnimeClick, isLoading }: AnimeGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-5 lg:gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-5 lg:gap-4"
    >
      {animeList.map((anime) => (
        <AnimeCard
          key={anime.id}
          anime={anime}
          onClick={onAnimeClick}
        />
      ))}
    </motion.div>
  );
}
