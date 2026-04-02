'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AnimeCard } from '@/components/AnimeCatalog/AnimeCard';
import type { Anime } from '@/components/AnimeCatalog/types';

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

const pageVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function ParaVocePage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        const response = await fetch('/api/recommendations?limit=50');
        
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
  }, []);

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
      <motion.main 
        variants={pageVariants}
        initial="hidden"
        animate="visible"
        className="min-h-screen container py-8"
      >
        <motion.div variants={itemVariants} className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <span className="w-1 h-8 bg-otaku-accent rounded-full" />
            Para Você
          </h1>
          <p className="text-otaku-text-secondary mt-2">
            Recomendações personalizadas baseadas no seu perfil
          </p>
        </motion.div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <AnimeCard key={i} anime={{} as Anime} isLoading={true} />
          ))}
        </div>
      </motion.main>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen container py-8">
        <h1 className="text-3xl font-bold text-white mb-4">Para Você</h1>
        <div className="bg-otaku-bg-secondary rounded-lg p-6 text-center">
          <p className="text-otaku-text-secondary">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <motion.main 
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen container py-8"
    >
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <span className="w-1 h-8 bg-otaku-accent rounded-full" />
          Para Você
        </h1>
        <p className="text-otaku-text-secondary mt-2">
          Recomendações personalizadas baseadas no seu histórico de visualizações e preferências
        </p>
      </motion.div>

      {recommendations.length === 0 ? (
        <div className="bg-otaku-bg-secondary rounded-lg p-12 text-center">
          <div className="text-4xl mb-4">🎬</div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Nenhuma recomendação disponível
          </h2>
          <p className="text-otaku-text-secondary">
            Avalie alguns animes ou adicione favoritos para receber recomendações personalizadas
          </p>
          <a 
            href="/" 
            className="inline-block mt-6 px-6 py-3 bg-otaku-accent text-white rounded-lg font-medium hover:bg-otaku-accent-hover transition-colors"
          >
            Explorar Animes
          </a>
        </div>
      ) : (
        <>
          {/* Match Score Legend */}
          <motion.div variants={itemVariants} className="mb-6 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-otaku-accent rounded text-white font-medium">
                Alta Correspondência
              </span>
              <span className="text-otaku-text-secondary">
                +70% de compatibilidade
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-otaku-bg-tertiary rounded text-white font-medium">
                Média Correspondência
              </span>
              <span className="text-otaku-text-secondary">
                40-70% de compatibilidade
              </span>
            </div>
          </motion.div>

          {/* Recommendations Grid */}
          <motion.div 
            variants={itemVariants}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
          >
            {recommendations.map((rec) => (
              <div key={rec.id} className="relative">
                <AnimeCard anime={mapRecommendationToAnime(rec)} />
                {/* Match Score Badge */}
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-1 rounded-md text-xs font-medium text-white ${
                    rec.match_score >= 0.7 
                      ? 'bg-otaku-accent' 
                      : rec.match_score >= 0.4 
                        ? 'bg-otaku-bg-tertiary' 
                        : 'bg-otaku-border'
                  }`}>
                    {Math.round(rec.match_score * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Reasons Explanation */}
          <motion.div variants={itemVariants} className="mt-12 p-6 bg-otaku-bg-secondary rounded-lg">
            <h2 className="text-lg font-semibold text-white mb-4">Como funcionam as recomendações?</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-otaku-accent font-medium">Correspondência de Gêneros (35%)</span>
                <p className="text-otaku-text-secondary mt-1">
                  Animes de gêneros que vocêuga ou avaliou bem
                </p>
              </div>
              <div>
                <span className="text-otaku-accent font-medium">Avaliações Positivas (30%)</span>
                <p className="text-otaku-text-secondary mt-1">
                  Similar aos animes que você avaliou com 4+ estrelas
                </p>
              </div>
              <div>
                <span className="text-otaku-accent font-medium">Popularidade (10%)</span>
                <p className="text-otaku-text-secondary mt-1">
                  Animes bem avaliados pela comunidade
                </p>
              </div>
              <div>
                <span className="text-otaku-accent font-medium">Temporada (5%)</span>
                <p className="text-otaku-text-secondary mt-1">
                  Das temporadas que você prefere
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </motion.main>
  );
}