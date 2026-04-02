'use client';

import { useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { Header } from '@/components/Header';

const MOCK_ANIME = {
  id: '1',
  title: 'Dragon Ball DAIMA',
  title_japanese: 'ドラゴンボールDAIMA',
  images: {
    jpg: {
      image_url: 'https://cdn.myanimelist.net/images/anime/1805/141944.jpg',
      large_image_url: 'https://cdn.myanimelist.net/images/anime/1805/141944l.jpg',
    },
  },
  episodes: 0,
  status: 'Currently Airing',
  airing: true,
  score: 8.5,
  synopsis: 'A new Dragon Ball series featuring Goku and friends in a new adventure. Goku and his companions embark on a brand new adventure in the world of Demon Realm, where they must transform into smaller versions of themselves to face new enemies and discover the secrets of the mysterious new realm.',
  genres: [{ name: 'Action' }, { name: 'Adventure' }, { name: 'Comedy' }, { name: 'Fantasy' }],
  studios: [{ name: 'Toei Animation' }],
  type: 'TV',
  premiered: 'Fall 2024',
  duration: '24 min per ep',
};

const MOCK_EPISODES = [
  { number: 1, title: 'The New Adventure Begins', aired: '2024-10-11', watched: true },
  { number: 2, title: 'Goku Transforms', aired: '2024-10-18', watched: true },
  { number: 3, title: 'The Enemy Appears', aired: '2024-10-25', watched: false },
  { number: 4, title: 'Battle in the Dark', aired: '2024-11-01', watched: false },
  { number: 5, title: 'New Allies', aired: '2024-11-08', watched: false },
  { number: 6, title: 'The Secret Revealed', aired: '2024-11-15', watched: false },
];

// Episode Card Component
function EpisodeCard({ episode, onToggle }: { episode: typeof MOCK_EPISODES[0]; onToggle: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        group flex items-center justify-between p-4 rounded-xl border transition-all duration-300
        ${episode.watched 
          ? 'bg-[#0a0a0a] border-[#262626]' 
          : 'bg-[#121212] border-[#262626] hover:border-[#ff4d00]/50'
        }
      `}
    >
      <div className="flex items-center gap-4">
        <div className={`
          w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold
          ${episode.watched 
            ? 'bg-[#22c55e]/20 text-[#22c55e]' 
            : 'bg-[#1a1a1a] text-[#a1a1a1] group-hover:bg-[#ff4d00]/20 group-hover:text-[#ff4d00]'
          }
        `}>
          {episode.watched ? '✓' : episode.number}
        </div>
        <div>
          <h4 className={`text-sm font-semibold ${episode.watched ? 'text-[#525252]' : 'text-white'}`}>
            {episode.title}
          </h4>
          <p className="text-xs text-[#525252]">
            {new Date(episode.aired).toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onToggle}
        className={`
          px-4 py-2 rounded-lg text-xs font-semibold transition-all
          ${episode.watched 
            ? 'bg-[#22c55e]/20 text-[#22c55e] hover:bg-red-500/20 hover:text-red-500' 
            : 'bg-[#ff4d00] text-white hover:bg-[#ff6b3d]'
          }
        `}
      >
        {episode.watched ? 'Assistido' : 'Assistir'}
      </motion.button>
    </motion.div>
  );
}

export default function AnimePage({ params }: { params: { id: string } }) {
  const anime = MOCK_ANIME;
  const episodes = MOCK_EPISODES;
  const [watchedEpisodes, setWatchedEpisodes] = useState<number[]>(
    episodes.filter(e => e.watched).map(e => e.number)
  );
  const [isFavorite, setIsFavorite] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start']
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const toggleWatched = (number: number) => {
    setWatchedEpisodes(prev => 
      prev.includes(number) 
        ? prev.filter(n => n !== number)
        : [...prev, number]
    );
  };

  const progress = (watchedEpisodes.length / episodes.length) * 100;

  return (
    <main className="relative min-h-screen bg-[#050505]">
      <Header />

      {/* Hero Section */}
      <motion.div 
        ref={containerRef}
        className="relative h-[50vh] min-h-[400px] overflow-hidden"
      >
        {/* Background Image with Parallax */}
        <motion.div style={{ y }} className="absolute inset-0">
          <img
            src={anime.images.jpg.large_image_url}
            alt={anime.title}
            className="w-full h-full object-cover"
          />
        </motion.div>

        {/* Gradient Overlays */}
        <motion.div style={{ opacity }} className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/30 to-[#050505]" />

        {/* Content */}
        <div className="absolute inset-0 container flex items-end pb-8">
          <div className="flex gap-8">
            {/* Cover */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="hidden md:block"
            >
              <div className="relative">
                <img
                  src={anime.images.jpg.large_image_url}
                  alt={anime.title}
                  className="w-40 md:w-48 rounded-xl shadow-2xl"
                />
                <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-[#ff4d00] rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {anime.score}
                </div>
              </div>
            </motion.div>

            {/* Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex-1"
            >
              {/* Type Badge */}
              <span className="inline-block px-3 py-1 bg-[#ff4d00] text-white text-xs font-bold uppercase tracking-wider rounded-md mb-3">
                {anime.type}
              </span>

              {/* Title */}
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                {anime.title}
              </h1>
              <p className="text-[#a1a1a1] text-lg mb-4">{anime.title_japanese}</p>

              {/* Genres */}
              <div className="flex flex-wrap gap-2 mb-4">
                {anime.genres.map((g: any) => (
                  <span
                    key={g.name}
                    className="px-3 py-1 text-xs bg-[#121212] border border-[#262626] rounded-lg text-white/70"
                  >
                    {g.name}
                  </span>
                ))}
              </div>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-[#525252]">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {anime.studios.map((s: any) => s.name).join(', ')}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {anime.premiered}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {anime.duration}
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Synopsis & Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Synopsis */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#121212] border border-[#262626] rounded-xl p-6"
            >
              <h2 className="text-lg font-bold text-white mb-4">Synopsis</h2>
              <p className="text-[#a1a1a1] leading-relaxed">
                {anime.synopsis}
              </p>
            </motion.div>

            {/* Episodes */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#121212] border border-[#262626] rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Episódios</h2>
                <span className="text-sm text-[#525252]">
                  {watchedEpisodes.length}/{episodes.length} assistidos
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full h-2 bg-[#1a1a1a] rounded-full mb-6 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-gradient-to-r from-[#ff4d00] to-[#ff6b3d] rounded-full"
                />
              </div>

              {/* Episode List */}
              <div className="space-y-3">
                {episodes.map((ep, i) => (
                  <EpisodeCard
                    key={ep.number}
                    episode={{ ...ep, watched: watchedEpisodes.includes(ep.number) }}
                    onToggle={() => toggleWatched(ep.number)}
                  />
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right Column - Actions & Stats */}
          <div className="space-y-6">
            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[#121212] border border-[#262626] rounded-xl p-6"
            >
              <div className="space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsFavorite(!isFavorite)}
                  className={`
                    w-full py-3 rounded-xl font-bold text-sm transition-all
                    ${isFavorite 
                      ? 'bg-[#ff4d00] text-white shadow-lg shadow-orange-500/30' 
                      : 'bg-[#1a1a1a] text-white border border-[#262626] hover:border-[#ff4d00]/50'
                    }
                  `}
                >
                  {isFavorite ? '❤️ Favorito' : '🤍 Adicionar aos Favoritos'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 bg-[#ff4d00] text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/30"
                >
                  ▶ Começar a Assistir
                </motion.button>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[#121212] border border-[#262626] rounded-xl p-6"
            >
              <h3 className="text-sm font-bold text-[#525252] uppercase tracking-wider mb-4">Estatísticas</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[#a1a1a1]">Nota</span>
                  <span className="text-white font-bold text-xl">{anime.score}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#a1a1a1]">Status</span>
                  <span className="px-2 py-1 bg-[#22c55e]/20 text-[#22c55e] text-xs font-semibold rounded">
                    {anime.status}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#a1a1a1]">Episódios</span>
                  <span className="text-white font-semibold">{episodes.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#a1a1a1]">Progresso</span>
                  <span className="text-[#ff4d00] font-semibold">{Math.round(progress)}%</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
}