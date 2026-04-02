'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import type { Anime } from './types';

interface HeroBannerProps {
  anime?: Anime;
  onWatchClick?: () => void;
  onInfoClick?: () => void;
}

// Animation variants for staggered reveal
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

const imageVariants = {
  hidden: { scale: 1.2, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

export function HeroBanner({ anime, onWatchClick, onInfoClick }: HeroBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  
  const y = useTransform(scrollY, [0, 500], [0, 150]);
  const opacity = useTransform(scrollY, [0, 400], [1, 0]);
  const scale = useTransform(scrollY, [0, 500], [1, 1.1]);

  if (!anime) {
    return (
      <div className="relative w-full h-[60vh] min-h-[500px] bg-otaku-bg-secondary overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 bg-gradient-to-t from-otaku-bg via-otaku-bg-secondary/50 to-transparent"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 border-4 border-otaku-accent/30 border-t-otaku-accent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      className="relative w-full h-[60vh] min-h-[500px] overflow-hidden"
    >
      {/* Background Image */}
      <motion.div
        style={{ y, scale }}
        className="absolute inset-0"
      >
        <motion.img
          src={anime.cover || anime.image || '/placeholder-banner.jpg'}
          alt={anime.titleEnglish || anime.title}
          variants={imageVariants}
          initial="hidden"
          animate="visible"
          className="w-full h-full object-cover"
        />
      </motion.div>

      {/* Overlay Gradient */}
      <motion.div
        style={{ opacity }}
        className="absolute inset-0 bg-gradient-to-r from-otaku-bg/90 via-otaku-bg/60 to-transparent"
      />
      
      <motion.div
        className="absolute inset-0 bg-gradient-to-t from-otaku-bg via-transparent to-transparent"
      />

      {/* Content */}
      <div className="relative z-10 container h-full flex flex-col justify-end pb-16">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-2xl"
        >
          {/* Type Badge */}
          <motion.div variants={itemVariants} className="flex items-center gap-3 mb-4">
            {anime.type && (
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-otaku-accent text-white uppercase tracking-wider">
                {anime.type}
              </span>
            )}
            {anime.score && (
              <span className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-otaku-warning/20 text-otaku-warning">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {anime.score}
              </span>
            )}
          </motion.div>

          {/* Title */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight"
            style={{ textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}
          >
            {anime.titleEnglish || anime.title}
          </motion.h1>

          {/* Genres */}
          {anime.genres && anime.genres.length > 0 && (
            <motion.div variants={itemVariants} className="flex flex-wrap gap-2 mb-4">
              {anime.genres.slice(0, 4).map((genre) => (
                <span
                  key={genre}
                  className="px-3 py-1 text-xs rounded-full bg-white/10 text-white/80 backdrop-blur-sm border border-white/20"
                >
                  {genre}
                </span>
              ))}
            </motion.div>
          )}

          {/* Synopsis */}
          {anime.synopsis && (
            <motion.p
              variants={itemVariants}
              className="text-white/70 text-sm md:text-base max-w-xl line-clamp-2 md:line-clamp-3 mb-6 leading-relaxed"
            >
              {anime.synopsis}
            </motion.p>
          )}

          {/* Action Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap gap-4"
          >
            <motion.button
              onClick={onWatchClick}
              className="group flex items-center gap-2 px-8 py-3 bg-otaku-accent hover:bg-otaku-accent-hover text-white font-semibold rounded-xl transition-all"
              whileHover={{ scale: 1.05, boxShadow: '0 10px 30px rgba(255, 107, 53, 0.4)' }}
              whileTap={{ scale: 0.98 }}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              Assistir
            </motion.button>
            <motion.button
              onClick={onInfoClick}
              className="group flex items-center gap-2 px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl backdrop-blur-sm border border-white/20 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Mais Info
            </motion.button>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-6 h-10 rounded-full border-2 border-white/30 flex justify-center pt-2"
        >
          <motion.div
            animate={{ opacity: [1, 0], y: [0, 10] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-1.5 h-1.5 rounded-full bg-white/60"
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
