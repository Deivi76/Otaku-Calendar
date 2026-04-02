'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimeCard } from './AnimeCatalog/AnimeCard';
import type { Anime } from './AnimeCatalog/types';

interface Recommendation {
  id: string;
  mal_id: number;
  title: string;
  title_english: string;
  image_url: string;
  score: number;
  genres: string[];
  type: string;
  status: string;
  season: string;
  match_score: number;
  reasons: Array<{
    type: string;
    description: string;
  }>;
}

interface RecommendationCarouselProps {
  userId?: string;
  limit?: number;
  title?: string;
  onAnimeClick?: (anime: Anime) => void;
}

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

export function RecommendationCarousel({
  userId,
  limit = 10,
  title = 'Recomendado Para Você',
  onAnimeClick,
}: RecommendationCarouselProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        const params = new URLSearchParams();
        params.set('limit', limit.toString());
        if (userId) {
          params.set('user_id', userId);
        }

        const response = await fetch(`/api/recommendations?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch recommendations');
        }

        const data = await response.json();
        setRecommendations(data.recommendations || []);
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError('Failed to load recommendations');
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecommendations();
  }, [userId, limit]);

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
  }, [recommendations]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const mapRecommendationToAnime = (rec: Recommendation): Anime => ({
    id: rec.id,
    title: rec.title,
    titleEnglish: rec.title_english,
    image: rec.image_url,
    cover: rec.image_url,
    score: rec.score,
    genres: rec.genres,
    type: (rec.type?.toUpperCase() || 'TV') as Anime['type'],
    status: (rec.status === 'airing' || rec.status === 'finished' || rec.status === 'upcoming') 
      ? rec.status 
      : 'finished',
    season: rec.season as 'winter' | 'spring' | 'summer' | 'fall' | undefined,
  });

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
              <AnimeCard anime={{} as Anime} isLoading={true} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error || recommendations.length === 0) {
    return null;
  }

  return (
    <section className="mb-12">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-3">
          <span className="w-1 h-6 bg-otaku-accent rounded-full" />
          {title}
          <span className="text-sm font-normal text-otaku-text-secondary ml-2">
            ({recommendations.length})
          </span>
        </h2>
        <a
          href="/para-voce"
          className="text-sm text-otaku-accent hover:text-otaku-accent-hover transition-colors font-medium"
        >
          Ver todas
        </a>
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
            {recommendations.map((rec) => (
              <motion.div
                key={rec.id}
                variants={itemVariants}
                className="flex-shrink-0 w-[160px] md:w-[180px] snap-start relative"
              >
                <AnimeCard
                  anime={mapRecommendationToAnime(rec)}
                  onClick={onAnimeClick}
                />
                {/* Match Score Badge */}
                {rec.match_score > 0 && (
                  <div className="absolute top-2 right-2 bg-otaku-accent/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-medium text-white">
                    {Math.round(rec.match_score * 100)}%
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
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