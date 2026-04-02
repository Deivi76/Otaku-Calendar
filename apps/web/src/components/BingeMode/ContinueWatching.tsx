'use client';

import { motion } from 'framer-motion';
import { useWatchProgress, type WatchProgress } from '@/hooks/useWatchProgress';
import { useMemo, useEffect, useState } from 'react';
import type { Anime } from '@/components/AnimeCatalog/types';

interface ContinueWatchingProps {
  onAnimeClick: (anime: Anime) => void;
  isLoading?: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function ProgressBadge({ progress }: { progress: WatchProgress }) {
  const percentage = progress.duration_seconds > 0 
    ? Math.round((progress.timestamp_seconds / progress.duration_seconds) * 100)
    : 0;

  const statusColors: Record<string, string> = {
    watching: 'bg-[#ff4d00]',
    completed: 'bg-green-600',
    paused: 'bg-yellow-600',
  };

  const statusLabels: Record<string, string> = {
    watching: 'Assistindo',
    completed: 'Completo',
    paused: 'Pausado',
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
      <div className="flex items-center justify-between text-xs text-white mb-1">
        <span className={`px-2 py-0.5 rounded-full ${statusColors[progress.status]}`}>
          {statusLabels[progress.status]}
        </span>
        <span>{percentage}%</span>
      </div>
        <div className="h-1 bg-white/30 rounded-full overflow-hidden">
        <div 
          className="h-full bg-[#ff4d00] rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function ContinueWatchingCard({ 
  progress, 
  onClick 
}: { 
  progress: WatchProgress;
  onClick: () => void;
}) {
  return (
    <motion.button
      variants={itemVariants}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative flex-shrink-0 w-40 sm:w-48 group"
    >
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-card">
        <div className="absolute inset-0 bg-[#121212] flex items-center justify-center">
          <span className="text-4xl">🎬</span>
        </div>
        
        <ProgressBadge progress={progress} />

        <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 rounded-lg text-white text-xs font-bold">
          EP {progress.episode_number}
        </div>
      </div>
      
      <p className="mt-2 text-sm text-[#a1a1a1] text-left line-clamp-2 group-hover:text-[#ff4d00] transition-colors">
        Anime #{progress.anime_id}
      </p>
    </motion.button>
  );
}

export function ContinueWatching({ onAnimeClick, isLoading }: ContinueWatchingProps) {
  const { progress, isLoading: progressLoading } = useWatchProgress();
  
  const animeIds = useMemo(() => {
    const ids = new Set<number>();
    progress.forEach((p: WatchProgress) => ids.add(p.anime_id));
    return Array.from(ids).slice(0, 10);
  }, [progress]);

  const [animeMap, setAnimeMap] = useState<Map<number, { title: string; image?: string }>>(new Map());

  // Fetch anime info for the progress items
  useEffect(() => {
    async function fetchAnimeInfo() {
      const map = new Map<number, { title: string; image?: string }>();
      
      for (const animeId of animeIds) {
        try {
          const { getFromIndexedDB } = await import('@/hooks/useIndexedDB');
          const cached = await getFromIndexedDB<Array<{
            mal_id: number;
            title: string;
            title_english?: string;
            images?: { jpg?: { image_url?: string; large_image_url?: string } };
          }>>('anime_catalog');

          if (cached?.data) {
            const anime = cached.data.find(a => a.mal_id === animeId);
            if (anime) {
              map.set(animeId, {
                title: anime.title_english || anime.title,
                image: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
              });
            }
          }
        } catch {
          // Skip this anime
        }
      }
      
      setAnimeMap(map);
    }

    if (animeIds.length > 0) {
      fetchAnimeInfo();
    }
  }, [animeIds]);

  if (progressLoading || isLoading || progress.length === 0) {
    return null;
  }

  return (
    <motion.section 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="container py-8"
    >
      <div className="flex items-center gap-3 mb-6">
        <motion.div 
          className="w-1 h-8 bg-[#ff4d00] rounded-full"
          animate={{ 
            boxShadow: ['0 0 10px #ff4d00', '0 0 20px #ff4d00', '0 0 10px #ff4d00']
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <h2 className="text-2xl md:text-3xl font-bold text-white">
          Continuar Assistindo
        </h2>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {progress.slice(0, 10).map((item: WatchProgress) => {
          const animeInfo = animeMap.get(item.anime_id);
          
          return (
            <ContinueWatchingCard
              key={item.id}
              progress={item}
              onClick={() => {
                onAnimeClick({
                  id: String(item.anime_id),
                  title: animeInfo?.title || `Anime #${item.anime_id}`,
                  titleEnglish: animeInfo?.title,
                  type: 'TV',
                  status: 'airing',
                  genres: [],
                  image: animeInfo?.image,
                  cover: animeInfo?.image,
                });
              }}
            />
          );
        })}
      </div>
    </motion.section>
  );
}

export default ContinueWatching;
