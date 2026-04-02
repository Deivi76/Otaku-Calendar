'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/Header';
import { useUserStats } from '@/hooks/useUserStats';
import type { CommunityStats } from '@/hooks/useUserStats';

type SupabaseClient = import('@supabase/supabase-js').SupabaseClient | null;

let supabaseClient: SupabaseClient = null;

function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return null;
    const { createClient } = require('@supabase/supabase-js');
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseClient;
}

// Stats Card Component
function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color = '#ff4d00',
  delay = 0 
}: { 
  title: string; 
  value: number | string; 
  subtitle?: string; 
  icon?: string;
  color?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-[#121212] rounded-xl p-5 border border-[#262626] hover:border-[#ff4d00]/30 transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-3">
        {icon && <span className="text-2xl">{icon}</span>}
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        </div>
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-[#a1a1a1]">{title}</div>
      {subtitle && <div className="text-xs text-[#525252] mt-1">{subtitle}</div>}
    </motion.div>
  );
}

// Streak Card Component
function StreakCard({ 
  currentStreak, 
  longestStreak, 
  lastWatchDate,
  loading 
}: { 
  currentStreak: number; 
  longestStreak: number; 
  lastWatchDate: string | null;
  loading?: boolean;
}) {
  const isOnFire = currentStreak >= 7;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        relative overflow-hidden rounded-2xl p-6 mb-6
        ${isOnFire 
          ? 'bg-gradient-to-br from-[#ff4d00]/20 to-[#ff6b3d]/10' 
          : 'bg-[#121212]'
        }
        border ${isOnFire ? 'border-[#ff4d00]/30' : 'border-[#262626]'}
      `}
    >
      {/* Fire animation for active streaks */}
      {isOnFire && (
        <div className="absolute top-4 right-4 text-4xl animate-pulse">🔥</div>
      )}
      
      <div className="flex items-center gap-6">
        <div className="text-center">
          <div className="text-5xl font-bold text-white mb-1">{currentStreak}</div>
          <div className="text-sm text-[#525252] uppercase tracking-wider">Dias Consecutivos</div>
        </div>
        
        <div className="h-16 w-px bg-[#262626]" />
        
        <div className="flex-1 grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#a1a1a1]">{longestStreak}</div>
            <div className="text-xs text-[#525252]">Recorde</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-medium text-white">
              {lastWatchDate ? new Date(lastWatchDate).toLocaleDateString('pt-BR') : '-'}
            </div>
            <div className="text-xs text-[#525252]">Último acesso</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Weekly Activity Component
function WeeklyActivity({ history, loading }: { history: any[]; loading?: boolean }) {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const maxValue = Math.max(...(history?.map(h => h.count) || [1]), 1);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-[#121212] rounded-xl p-5 border border-[#262626]"
    >
      <h3 className="text-lg font-bold text-white mb-4">Atividade da Semana</h3>
      <div className="flex items-end justify-between gap-2 h-32">
        {days.map((day, i) => {
          const dayData = history?.[i] || { count: 0 };
          const height = (dayData.count / maxValue) * 100;
          const isToday = new Date().getDay() === i;
          
          return (
            <div key={day} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-[#1a1a1a] rounded-lg relative overflow-hidden" style={{ height: '80px' }}>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 0.5, delay: 0.1 * i }}
                  className={`absolute bottom-0 left-0 right-0 rounded-lg ${isToday ? 'bg-[#ff4d00]' : 'bg-[#262626]'}`}
                />
              </div>
              <span className={`text-xs ${isToday ? 'text-[#ff4d00] font-bold' : 'text-[#525252]'}`}>
                {day}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// Genre Chart Component
function GenreChart({ 
  genres = [], 
  userGenres = [],
  loading 
}: { 
  genres: { name: string; count: number }[]; 
  userGenres: string[];
  loading?: boolean;
}) {
  const maxCount = Math.max(...(genres.map(g => g.count) || [1]), 1);
  
  const genreColors: Record<string, string> = {
    'Action': '#ef4444',
    'Adventure': '#f97316',
    'Comedy': '#eab308',
    'Drama': '#8b5cf6',
    'Fantasy': '#06b6d4',
    'Horror': '#dc2626',
    'Romance': '#ec4899',
    'Sci-Fi': '#3b82f6',
    'Slice of Life': '#22c55e',
    'Sports': '#f59e0b',
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-[#121212] rounded-xl p-5 border border-[#262626]"
    >
      <h3 className="text-lg font-bold text-white mb-4">Gêneros Mais Assistidos</h3>
      <div className="space-y-3">
        {genres.slice(0, 8).map((genre, i) => {
          const width = (genre.count / maxCount) * 100;
          const color = genreColors[genre.name] || '#ff4d00';
          const isUserFavorite = userGenres.includes(genre.name);
          
          return (
            <div key={genre.name} className="flex items-center gap-3">
              <span className="text-sm text-[#a1a1a1] w-24 truncate">{genre.name}</span>
              <div className="flex-1 h-6 bg-[#1a1a1a] rounded-md overflow-hidden relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 0.5, delay: 0.1 * i }}
                  className="h-full rounded-md"
                  style={{ 
                    background: `linear-gradient(90deg, ${color} 0%, ${color}80 100%)`
                  }}
                />
                {isUserFavorite && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">⭐</span>
                )}
              </div>
              <span className="text-sm text-[#525252] w-8 text-right">{genre.count}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

export default function StatsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  
  const {
    stats,
    history,
    community,
    summary,
    isLoading,
    error,
    refresh,
  } = useUserStats();

  useEffect(() => {
    const getUser = async () => {
      const supabase = getSupabase();
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();
  }, []);

  const handleLogin = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  const handleShareStats = async () => {
    if (!stats) return;

    const shareText = `
🎬 Meus Stats no Otaku Calendar

🔥 Sequência: ${stats.current_streak} dias consecutivos
📺 Episódios assistidos: ${stats.total_episodes_watched}
⏰ Tempo total: ${Math.floor(stats.total_minutes_watched / 60)}h ${stats.total_minutes_watched % 60}min
⭐ Gêneros favoritos: ${stats.favorite_genres?.slice(0, 3).join(', ') || 'Nenhum'}

#OtakuCalendar #Anime
    `.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Meus Stats - Otaku Calendar',
          text: shareText,
        });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      setShowShareModal(true);
      setTimeout(() => setShowShareModal(false), 2000);
    }
  };

  if (loading || isLoading) {
    return (
      <main className="min-h-screen bg-[#050505]">
        <Header />
        <div className="container flex items-center justify-center min-h-[60vh]">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-2 border-[#ff4d00]/30 border-t-[#ff4d00] rounded-full"
          />
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#050505]">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#ff4d00]/5 rounded-full blur-3xl" />
        </div>
        <Header />
        <div className="container flex items-center justify-center min-h-[60vh] relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md"
          >
            <div className="text-6xl mb-6">📊</div>
            <h2 className="text-3xl font-bold text-white mb-4">Estatísticas Pessoais</h2>
            <p className="text-[#a1a1a1] mb-8">
              Faça login para acompanhar seu progresso e estatísticas de anime.
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLogin}
              className="px-8 py-4 bg-[#ff4d00] text-white font-bold rounded-xl shadow-lg shadow-orange-500/30"
            >
              Entrar com Google
            </motion.button>
          </motion.div>
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

      <section className="container py-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <motion.div 
                className="w-1 h-8 bg-[#ff4d00] rounded-full"
                animate={{ 
                  boxShadow: ['0 0 10px #ff4d00', '0 0 20px #ff4d00', '0 0 10px #ff4d00']
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <h1 className="text-3xl font-bold text-white">Minhas Estatísticas</h1>
            </div>
            <p className="text-[#a1a1a1]">{user.email}</p>
          </div>
          
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={refresh}
              disabled={isLoading}
              className="w-10 h-10 rounded-xl bg-[#121212] border border-[#262626] flex items-center justify-center text-[#a1a1a1] hover:border-[#ff4d00] hover:text-[#ff4d00] transition-all"
            >
              <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleShareStats}
              className="flex items-center gap-2 px-5 py-3 bg-[#ff4d00] text-white font-bold rounded-xl shadow-lg shadow-orange-500/30"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Compartilhar
            </motion.button>
          </div>
        </motion.div>

        {/* Error Banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/30 rounded-xl mb-6"
          >
            <span className="text-red-400">⚠️ {error}</span>
            <button onClick={refresh} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm">
              Tentar novamente
            </button>
          </motion.div>
        )}

        {/* Streak Card */}
        <StreakCard
          currentStreak={stats?.current_streak || 0}
          longestStreak={stats?.longest_streak || 0}
          lastWatchDate={stats?.last_watch_date || null}
          loading={isLoading}
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            title="Episódios Assistidos"
            value={stats?.total_episodes_watched || 0}
            subtitle={`${Math.floor((stats?.total_minutes_watched || 0) / 60)}h de conteúdo`}
            icon="📺"
            color="#ff4d00"
            delay={0.1}
          />
          <StatCard
            title="Animes Assistidos"
            value={summary?.uniqueAnimesWatched || 0}
            subtitle="Animes únicos"
            icon="🎬"
            color="#8b5cf6"
            delay={0.2}
          />
          <StatCard
            title="Gêneros Favoritos"
            value={stats?.favorite_genres?.length || 0}
            subtitle={stats?.favorite_genres?.slice(0, 2).join(', ') || 'Nenhum'}
            icon="🎭"
            color="#22c55e"
            delay={0.3}
          />
        </div>

        {/* Weekly Activity */}
        <div className="mb-6">
          <WeeklyActivity history={history} loading={isLoading} />
        </div>

        {/* Genre Chart */}
        <div className="mb-6">
          <GenreChart
            genres={(community as CommunityStats)?.top_genres?.map(g => ({ name: g.genre, count: g.count })) || []}
            userGenres={stats?.favorite_genres || []}
            loading={isLoading}
          />
        </div>

        {/* Community Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="bg-[#121212] rounded-xl p-5 border border-[#262626]">
            <div className="text-sm text-[#525252] uppercase tracking-wider mb-2">Média da Comunidade</div>
            <div className="text-2xl font-bold text-white">
              {(community as CommunityStats)?.avg_episodes_watched || 0}
            </div>
            <div className="text-sm text-[#a1a1a1]">episódios por usuário</div>
          </div>
          <div className="bg-[#121212] rounded-xl p-5 border border-[#262626]">
            <div className="text-sm text-[#525252] uppercase tracking-wider mb-2">Usuários Ativos</div>
            <div className="text-2xl font-bold text-white">
              {(community as CommunityStats)?.total_users || 0}
            </div>
            <div className="text-sm text-[#a1a1a1]">na plataforma</div>
          </div>
        </motion.div>
      </section>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-[#121212] border border-[#262626] p-8 rounded-2xl text-center max-w-sm mx-4"
            >
              <div className="text-5xl mb-4">✅</div>
              <p className="text-white font-semibold">
                Estatísticas copiadas para a área de transferência!
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}