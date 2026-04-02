'use client';

import { motion } from 'framer-motion';
import type { Anime } from './types';

interface AnimeCardProps {
  anime: Anime;
  onClick?: (anime: Anime) => void;
  isLoading?: boolean;
}

const typeColors: Record<string, string> = {
  TV: 'bg-blue-600',
  MOVIE: 'bg-yellow-600',
  OVA: 'bg-purple-600',
  ONA: 'bg-green-600',
  SPECIAL: 'bg-pink-600',
  MUSIC: 'bg-red-600',
};

const statusLabels: Record<string, string> = {
  airing: 'Em lançamento',
  finished: 'Finalizado',
  upcoming: 'Em breve',
};

// Animation variants - simplified without custom bezier
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4,
    },
  },
  hover: {
    y: -8,
    transition: {
      duration: 0.3,
    },
  },
};

export function AnimeCard({ anime, onClick, isLoading }: AnimeCardProps) {
  const handleClick = () => {
    if (onClick && !isLoading) {
      onClick(anime);
    }
  };

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-xl bg-otaku-bg-tertiary animate-pulse">
        <div className="aspect-[2/3] w-full" />
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
          <div className="h-4 bg-white/20 rounded w-3/4 mb-2" />
          <div className="h-3 bg-white/10 rounded w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      className="relative overflow-hidden rounded-xl cursor-pointer group"
      onClick={handleClick}
    >
      <div className="aspect-[2/3] w-full relative">
        <motion.img
          src={anime.image || '/placeholder-anime.jpg'}
          alt={anime.titleEnglish || anime.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        
        {/* Type Badge */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          whileHover={{ opacity: 1, x: 0 }}
          className="absolute top-3 right-3"
        >
          <span
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${
              typeColors[anime.type] || 'bg-gray-600'
            }`}
          >
            {anime.type}
          </span>
        </motion.div>

        {/* Status Badge */}
        {anime.status && anime.status !== 'finished' && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            whileHover={{ opacity: 1, x: 0 }}
            className="absolute top-3 left-3"
          >
            <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-otaku-accent text-white">
              {statusLabels[anime.status]}
            </span>
          </motion.div>
        )}

        {/* Hover Overlay with Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileHover={{ opacity: 1, y: 0 }}
          className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/95 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300"
        >
          {anime.synopsis && (
            <p className="text-xs text-white/80 line-clamp-3 mb-3 leading-relaxed">
              {anime.synopsis}
            </p>
          )}
          <div className="flex items-center justify-between">
            {anime.score && (
              <div className="flex items-center gap-1">
                <span className="text-otaku-warning">★</span>
                <span className="text-sm font-semibold text-white">{anime.score}</span>
              </div>
            )}
            {anime.episodes && (
              <span className="text-xs text-white/60">
                {anime.episodes} ep.
              </span>
            )}
          </div>
        </motion.div>

        {/* Title & Meta (always visible at bottom) */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-sm font-semibold text-white line-clamp-2 leading-snug">
            {anime.titleEnglish || anime.title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            {anime.year && (
              <p className="text-xs text-white/60">{anime.year}</p>
            )}
            {anime.season && (
              <p className="text-xs text-white/60 capitalize">• {anime.season}</p>
            )}
          </div>
        </div>
      </div>

      {/* Hover glow effect */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 rounded-xl ring-1 ring-white/20" />
        <div className="absolute -inset-2 bg-otaku-accent/20 blur-xl" />
      </div>
    </motion.div>
  );
}
