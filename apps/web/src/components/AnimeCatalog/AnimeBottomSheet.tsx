'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { useRouter } from 'next/navigation';
import type { Anime } from './types';

interface AnimeBottomSheetProps {
  anime: Anime | null;
  isOpen: boolean;
  onClose: () => void;
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

// Animation variants - simplified
const sheetVariants = {
  hidden: { y: '100%', opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: {
      damping: 25,
      stiffness: 300,
    },
  },
  exit: { 
    y: '100%', 
    opacity: 0,
  },
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const contentVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      delay: 0.1,
      duration: 0.4,
    },
  },
};

export function AnimeBottomSheet({ anime, isOpen, onClose }: AnimeBottomSheetProps) {
  const router = useRouter();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [dragY, setDragY] = useState(0);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 100) {
      onClose();
    }
    setDragY(0);
  };

  const handleDrag = (_: unknown, info: PanInfo) => {
    setDragY(info.offset.y);
  };

  const handleNavigateToDetails = () => {
    if (anime?.id) {
      router.push(`/anime/${anime.id}`);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && anime && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Bottom Sheet */}
          <motion.div
            ref={sheetRef}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            className="absolute bottom-0 left-0 right-0 z-50 bg-otaku-bg-secondary rounded-t-3xl max-h-[90vh] overflow-y-auto shadow-bottom-sheet"
            style={{
              transform: `translateY(${dragY}px)`,
            }}
          >
            {/* Drag Handle */}
            <div className="sticky top-0 z-10 bg-otaku-bg-secondary pt-4 pb-2">
              <div className="w-12 h-1.5 bg-otaku-text-muted rounded-full mx-auto" />
            </div>
            
            {/* Content */}
            <motion.div variants={contentVariants} initial="hidden" animate="visible" className="px-4 pb-8 md:px-8 md:pb-8">
              <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                {/* Image */}
                <div className="flex-shrink-0 w-full md:w-64 mx-auto md:mx-0">
                  <motion.img
                    src={anime.image || '/placeholder-anime.jpg'}
                    alt={anime.titleEnglish || anime.title}
                    className="w-full aspect-[2/3] object-cover rounded-xl shadow-card"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  />
                </div>

                {/* Details */}
                <div className="flex-1">
                  {/* Title */}
                  <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="text-2xl md:text-3xl font-bold text-otaku-text mb-3"
                  >
                    {anime.titleEnglish || anime.title}
                  </motion.h1>

                  {/* Badges */}
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-wrap gap-2 mb-4"
                  >
                    {anime.type && (
                      <span
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
                          typeColors[anime.type] || 'bg-gray-600'
                        } text-white`}
                      >
                        {anime.type}
                      </span>
                    )}
                    {anime.status && (
                      <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-otaku-bg-tertiary text-otaku-text-secondary">
                        {statusLabels[anime.status]}
                      </span>
                    )}
                  </motion.div>

                  {/* Stats Grid */}
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5"
                  >
                    {anime.episodes && (
                      <div className="bg-otaku-bg-tertiary p-3 rounded-xl">
                        <p className="text-xs text-otaku-text-muted mb-1">Episódios</p>
                        <p className="font-bold text-lg">{anime.episodes}</p>
                      </div>
                    )}
                    {anime.score && (
                      <div className="bg-otaku-bg-tertiary p-3 rounded-xl">
                        <p className="text-xs text-otaku-text-muted mb-1">Nota</p>
                        <p className="font-bold text-lg flex items-center gap-1">
                          <span className="text-otaku-warning">★</span>
                          {anime.score}
                        </p>
                      </div>
                    )}
                    {anime.year && (
                      <div className="bg-otaku-bg-tertiary p-3 rounded-xl">
                        <p className="text-xs text-otaku-text-muted mb-1">Ano</p>
                        <p className="font-bold text-lg">{anime.year}</p>
                      </div>
                    )}
                    {anime.season && (
                      <div className="bg-otaku-bg-tertiary p-3 rounded-xl">
                        <p className="text-xs text-otaku-text-muted mb-1">Temporada</p>
                        <p className="font-bold text-lg capitalize">{anime.season}</p>
                      </div>
                    )}
                  </motion.div>

                  {/* Genres */}
                  {anime.genres && anime.genres.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex flex-wrap gap-2 mb-5"
                    >
                      {anime.genres.map((genre) => (
                        <span
                          key={genre}
                          className="px-4 py-1.5 text-xs rounded-full bg-otaku-accent/15 text-otaku-accent font-medium"
                        >
                          {genre}
                        </span>
                      ))}
                    </motion.div>
                  )}

                  {/* Synopsis */}
                  {anime.synopsis && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                      className="mb-5"
                    >
                      <h3 className="font-semibold mb-2 text-otaku-text">Sinopse</h3>
                      <p className="text-sm text-otaku-text-secondary leading-relaxed">
                        {anime.synopsis}
                      </p>
                    </motion.div>
                  )}

                  {/* Studios */}
                  {anime.studios && anime.studios.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="mb-5"
                    >
                      <p className="text-sm text-otaku-text-muted">
                        Estúdios:{' '}
                        <span className="text-otaku-text-secondary">
                          {anime.studios.join(', ')}
                        </span>
                      </p>
                    </motion.div>
                  )}

                  {/* Action Buttons */}
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    className="flex flex-col sm:flex-row gap-3 mt-6"
                  >
                    <motion.button
                      onClick={handleNavigateToDetails}
                      className="flex-1 py-4 px-6 bg-otaku-accent hover:bg-otaku-accent-hover text-white font-semibold rounded-xl transition-all"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Assistir
                    </motion.button>
                    <motion.button
                      className="py-4 px-6 bg-otaku-bg-tertiary hover:bg-otaku-border text-otaku-text font-semibold rounded-xl transition-all"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      + Adicionar à lista
                    </motion.button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
