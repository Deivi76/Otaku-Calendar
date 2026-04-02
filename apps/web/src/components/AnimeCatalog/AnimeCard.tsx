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

export function AnimeCard({ anime, onClick, isLoading }: AnimeCardProps) {
  const handleClick = () => {
    if (onClick && !isLoading) {
      onClick(anime);
    }
  };

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-xl bg-[#121212] animate-pulse group">
        <div className="aspect-[2/3] w-full relative">
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <div className="h-4 bg-[#262626] rounded w-3/4 mb-2" />
            <div className="h-3 bg-[#1a1a1a] rounded w-1/2" />
          </div>
        </div>
        {/* Skeleton shimmer */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-xl cursor-pointer group"
      onClick={handleClick}
    >
      <div className="aspect-[2/3] w-full relative">
        <motion.img
          src={anime.image || '/placeholder-anime.jpg'}
          alt={anime.titleEnglish || anime.title}
          className="w-full h-full object-cover"
          loading="lazy"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.5 }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        
        {/* Type Badge - Top Right */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileHover={{ opacity: 1, x: 0 }}
          className="absolute top-3 right-3"
        >
          <span
            className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${
              typeColors[anime.type] || 'bg-gray-600'
            } text-white`}
          >
            {anime.type}
          </span>
        </motion.div>

        {/* Status Badge - Top Left */}
        {anime.status && anime.status !== 'finished' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileHover={{ opacity: 1, x: 0 }}
            className="absolute top-3 left-3"
          >
            <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md bg-[#ff4d00] text-white">
              {statusLabels[anime.status]}
            </span>
          </motion.div>
        )}

        {/* Hover Overlay with Details */}
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          whileHover={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/95 via-black/90 to-transparent translate-y-full group-hover:translate-y-0"
        >
          {anime.synopsis && (
            <p className="text-xs text-white/80 line-clamp-3 mb-3 leading-relaxed">
              {anime.synopsis}
            </p>
          )}
          <div className="flex items-center justify-between">
            {anime.score && (
              <div className="flex items-center gap-1">
                <span className="text-yellow-400">★</span>
                <span className="text-sm font-bold text-white">{anime.score}</span>
              </div>
            )}
            {anime.episodes && (
              <span className="text-xs text-white/60">
                {anime.episodes} ep.
              </span>
            )}
          </div>
        </motion.div>

        {/* Title & Meta - Always visible at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug">
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
      <motion.div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
      >
        <div className="absolute inset-0 rounded-xl ring-1 ring-white/20" />
        <div className="absolute -inset-2 bg-[#ff4d00]/20 blur-xl" />
      </motion.div>

      {/* Corner accent on hover */}
      <motion.div
        className="absolute top-0 right-0 w-12 h-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, transparent 50%, rgba(255, 77, 0, 0.3) 50%)'
        }}
      />
    </motion.div>
  );
}