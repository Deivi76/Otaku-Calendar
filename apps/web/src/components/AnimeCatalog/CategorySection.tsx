'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { AnimeCard } from './AnimeCard';
import type { Anime } from './types';

interface CategorySectionProps {
  title: string;
  animeList: Anime[];
  categoryType?: string;
  onAnimeClick?: (anime: Anime) => void;
  isLoading?: boolean;
  maxItems?: number;
}

// Animation variants for staggered entrance
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function CategorySection({
  title,
  animeList,
  categoryType,
  onAnimeClick,
  isLoading,
  maxItems = 10,
}: CategorySectionProps) {
  const displayList = animeList.slice(0, maxItems);
  const hasMore = animeList.length > maxItems;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll capability
  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [animeList]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (isLoading) {
    return (
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-3">
          <span className="w-1 h-6 bg-otaku-accent rounded-full" />
          {title}
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[160px] md:w-[180px]">
              <AnimeCard
                anime={{} as Anime}
                isLoading={true}
              />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mb-12">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-3">
          <span className="w-1 h-6 bg-otaku-accent rounded-full" />
          {title}
          <span className="text-sm font-normal text-otaku-text-secondary ml-2">
            ({animeList.length})
          </span>
        </h2>
        <div className="flex items-center gap-2">
          {hasMore && (
            <button className="text-sm text-otaku-accent hover:text-otaku-accent-hover transition-colors font-medium">
              Ver todos
            </button>
          )}
        </div>
      </div>
      
      {/* Scroll Controls */}
      <div className="relative group">
        {/* Left Scroll Button */}
        <AnimatePresence>
          {canScrollLeft && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-otaku-bg-secondary/90 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-otaku-accent transition-colors -ml-2 shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Horizontal Scroll Container */}
        <motion.div
          ref={scrollRef}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide snap-x"
          style={{ scrollBehavior: 'smooth' }}
        >
          <AnimatePresence>
            {displayList.map((anime, index) => (
              <motion.div
                key={anime.id}
                variants={itemVariants}
                className="flex-shrink-0 w-[160px] md:w-[180px] snap-start"
              >
                <AnimeCard
                  anime={anime}
                  onClick={onAnimeClick}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          
          {/* "View All" Card */}
          {hasMore && (
            <motion.div
              variants={itemVariants}
              className="flex-shrink-0 w-[160px] md:w-[180px] snap-start"
            >
              <div className="aspect-[2/3] w-full rounded-xl bg-otaku-bg-secondary border-2 border-dashed border-otaku-border hover:border-otaku-accent transition-colors cursor-pointer flex flex-col items-center justify-center gap-3 group">
                <div className="w-12 h-12 rounded-full bg-otaku-bg-tertiary group-hover:bg-otaku-accent transition-colors flex items-center justify-center">
                  <svg className="w-6 h-6 text-otaku-text-secondary group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-otaku-text-secondary group-hover:text-white transition-colors">
                  Ver mais
                </span>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Right Scroll Button */}
        <AnimatePresence>
          {canScrollRight && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-otaku-bg-secondary/90 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-otaku-accent transition-colors -mr-2 shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
