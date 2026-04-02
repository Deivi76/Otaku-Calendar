'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
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
      <main className="min-h-screen bg-[#050505]">
        <Header />
        <div className="container py-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-1 h-8 bg-[#ff4d00] rounded-full" />
              <h1 className="text-3xl font-bold text-white">Para Você</h1>
            </div>
            <p className="text-[#a1a1a1]">Recomendações personalizadas baseadas no seu perfil</p>
          </motion.div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <AnimeCard key={i} anime={{} as Anime} isLoading={true} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#050505]">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#ff4d00]/5 rounded-full blur-3xl" />
        </div>
        <Header />
        <div className="container py-8 relative z-10">
          <h1 className="text-3xl font-bold text-white mb-4">Para Você</h1>
          <div className="bg-[#121212] border border-[#262626] rounded-xl p-6 text-center">
            <p className="text-[#a1a1a1]">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-[#050505]">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#050505] via-[#0a0a0a] to-[#050505]" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#ff4d00]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>
      
      <Header />
      
      <div className="container py-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-3">
            <motion.div 
              className="w-1 h-10 bg-[#ff4d00] rounded-full"
              animate={{ 
                boxShadow: ['0 0 10px #ff4d00', '0 0 20px #ff4d00', '0 0 10px #ff4d00']
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <h1 className="text-3xl md:text-4xl font-bold text-white">Para Você</h1>
          </div>
          <p className="text-[#a1a1a1] text-lg">
            Recomendações personalizadas baseadas no seu histórico de visualizações e preferências
          </p>
        </motion.div>

        {recommendations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#121212] border border-[#262626] rounded-xl p-12 text-center"
          >
            <div className="text-6xl mb-4">🎬</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Nenhuma recomendação disponível
            </h2>
            <p className="text-[#a1a1a1] mb-6">
              Avalie alguns animes ou adicione favoritos para receber recomendações personalizadas
            </p>
            <motion.a
              href="/"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-block px-6 py-3 bg-[#ff4d00] text-white font-bold rounded-xl shadow-lg shadow-orange-500/30"
            >
              Explorar Animes
            </motion.a>
          </motion.div>
        ) : (
          <>
            {/* Match Score Legend */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6 flex flex-wrap gap-4 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 bg-[#ff4d00] rounded-lg text-white font-semibold text-xs">
                  Alta Correspondência
                </span>
                <span className="text-[#525252]">+70% de compatibilidade</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 bg-[#1a1a1a] rounded-lg text-white font-semibold text-xs border border-[#262626]">
                  Média Correspondência
                </span>
                <span className="text-[#525252]">40-70% de compatibilidade</span>
              </div>
            </motion.div>

            {/* Recommendations Grid */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
            >
              {recommendations.map((rec, index) => (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="relative"
                >
                  <AnimeCard anime={mapRecommendationToAnime(rec)} />
                  {/* Match Score Badge */}
                  <div className="absolute top-2 right-2 z-10">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold text-white ${
                      rec.match_score >= 0.7 
                        ? 'bg-[#ff4d00] shadow-lg shadow-orange-500/50' 
                        : rec.match_score >= 0.4 
                          ? 'bg-[#1a1a1a] border border-[#262626]' 
                          : 'bg-[#0a0a0a] border border-[#262626]'
                    }`}>
                      {Math.round(rec.match_score * 100)}%
                    </span>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* How it works */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-12 p-6 bg-[#121212] border border-[#262626] rounded-xl"
            >
              <h2 className="text-lg font-bold text-white mb-4">Como funcionam as recomendações?</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-[#ff4d00] font-semibold block mb-1">Correspondência de Gêneros (35%)</span>
                  <p className="text-[#a1a1a1]">
                    Animes de gêneros que você curte ou avaliou bem
                  </p>
                </div>
                <div>
                  <span className="text-[#ff4d00] font-semibold block mb-1">Avaliações Positivas (30%)</span>
                  <p className="text-[#a1a1a1]">
                    Similar aos animes que você avaliou com 4+ estrelas
                  </p>
                </div>
                <div>
                  <span className="text-[#ff4d00] font-semibold block mb-1">Popularidade (10%)</span>
                  <p className="text-[#a1a1a1]">
                    Animes bem avaliados pela comunidade
                  </p>
                </div>
                <div>
                  <span className="text-[#ff4d00] font-semibold block mb-1">Temporada (5%)</span>
                  <p className="text-[#a1a1a1]">
                    Das temporadas que você prefere
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </main>
  );
}