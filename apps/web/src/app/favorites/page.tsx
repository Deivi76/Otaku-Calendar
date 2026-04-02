'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { Header } from '@/components/Header';

type SortOption = 'recent' | 'oldest' | 'az' | 'za';
type FavoriteType = 'anime' | 'episode' | 'rumor';

interface FavoriteAnime {
  id: string;
  anime: string;
  coverUrl?: string;
  created_at: string;
}

interface FavoriteEpisode {
  id: string;
  episodeId: string;
  anime: string;
  episode: number;
  date: string;
  watched: boolean;
}

interface FavoriteRumor {
  id: string;
  title: string;
  media_type: string;
  status: string;
  confidence_score?: number;
  first_seen_at: string;
}

const MOCK_ANIME_COVER = 'https://placehold.co/200x300/252525/a0a0a0?text=No+Cover';

let supabaseClient: SupabaseClient | null = null;

const getSupabase = (): SupabaseClient | null => {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return null;
    supabaseClient = createSupabaseClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseClient;
};

// Tab Button Component
function TabButton({ 
  active, 
  onClick, 
  icon, 
  label, 
  count 
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: string; 
  label: string; 
  count: number;
}) {
  return (
    <motion.button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
        transition-all duration-300 whitespace-nowrap
        ${active 
          ? 'bg-[#ff4d00] text-white shadow-lg shadow-orange-500/30' 
          : 'bg-[#121212] text-[#a1a1a1] border border-[#262626] hover:border-[#ff4d00]/50'
        }
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <span>{icon}</span>
      <span>{label}</span>
      <span className={`px-2 py-0.5 rounded-full text-xs ${active ? 'bg-white/20' : 'bg-[#1a1a1a]'}`}>
        {count}
      </span>
    </motion.button>
  );
}

// Favorite Card Component
function FavoriteCard({ 
  item, 
  type, 
  onRemove 
}: { 
  item: any; 
  type: FavoriteType; 
  onRemove: () => void;
}) {
  const title = type === 'rumor' ? item.title : (item.anime || item.title);
  const cover = item.coverUrl || MOCK_ANIME_COVER;
  const date = type === 'rumor' ? item.first_seen_at : item.created_at;
  
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      confirmed: '#22c55e',
      likely: '#3b82f6',
      circulating: '#eab308',
      unverified: '#6b7280',
      denied: '#ef4444',
    };
    return colors[status] || '#6b7280';
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      className="relative group"
    >
      <div className="bg-[#121212] rounded-xl overflow-hidden border border-[#262626] hover:border-[#ff4d00]/30 transition-all duration-300">
        {/* Cover */}
        <div className="relative aspect-[2/3] overflow-hidden">
          <img
            src={cover}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
          
          {/* Status badge for rumors */}
          {type === 'rumor' && item.status && (
            <span 
              className="absolute top-2 left-2 px-2 py-1 text-[10px] font-bold uppercase rounded"
              style={{ 
                backgroundColor: getStatusColor(item.status),
                color: 'white'
              }}
            >
              {item.status}
            </span>
          )}
          
          {/* Episode badge */}
          {type === 'episode' && (
            <span className="absolute bottom-2 right-2 px-2 py-1 text-xs font-bold bg-[#ff4d00] text-white rounded">
              EP {item.episode}
            </span>
          )}
          
          {/* Remove button */}
          <motion.button
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            onClick={onRemove}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white text-sm hover:bg-red-500 transition-colors"
          >
            ✕
          </motion.button>
        </div>
        
        {/* Info */}
        <div className="p-3">
          <h3 className="text-sm font-bold text-white line-clamp-2 mb-1">
            {title}
          </h3>
          <p className="text-xs text-[#525252]">
            {type === 'anime' && new Date(date).toLocaleDateString('pt-BR')}
            {type === 'episode' && new Date(item.date).toLocaleDateString('pt-BR')}
            {type === 'rumor' && `${item.media_type} • ${item.confidence_score ? `${Math.round(item.confidence_score * 100)}%` : 'N/A'}`}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function Favorites() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FavoriteType>('anime');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [animes, setAnimes] = useState<FavoriteAnime[]>([]);
  const [episodes, setEpisodes] = useState<FavoriteEpisode[]>([]);
  const [rumors, setRumors] = useState<FavoriteRumor[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const fetchAnimes = useCallback(async () => {
    if (!user) return;
    const supabase = getSupabase();
    if (!supabase) return;
    setDataLoading(true);
    const { data, error: fetchError } = await supabase
      .from('user_favorites')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setAnimes([]);
    } else {
      setAnimes((data || []) as FavoriteAnime[]);
    }
    setDataLoading(false);
  }, [user]);

  const fetchEpisodes = useCallback(async () => {
    if (!user) return;
    const supabase = getSupabase();
    if (!supabase) return;
    setDataLoading(true);
    const { data: progress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('watched', false);

    if (progress && progress.length > 0) {
      const episodesData: FavoriteEpisode[] = progress.map((p: any) => ({
        id: p.id,
        episodeId: p.episode_id,
        anime: 'Anime',
        episode: 1,
        date: new Date().toISOString(),
        watched: false,
      }));
      setEpisodes(episodesData);
    } else {
      setEpisodes([]);
    }
    setDataLoading(false);
  }, [user]);

  const fetchRumors = useCallback(async () => {
    setRumors([]);
    setDataLoading(false);
  }, []);

  useEffect(() => {
    if (user && !loading) {
      if (activeTab === 'anime') fetchAnimes();
      else if (activeTab === 'episode') fetchEpisodes();
      else if (activeTab === 'rumor') fetchRumors();
    }
  }, [user, loading, activeTab, fetchAnimes, fetchEpisodes, fetchRumors]);

  const handleRemoveFavorite = async (id: string, type: FavoriteType) => {
    if (!user) return;
    const supabase = getSupabase();
    if (!supabase) return;

    if (type === 'anime') {
      await supabase.from('user_favorites').delete().eq('id', id).eq('user_id', user.id);
      setAnimes(prev => prev.filter(a => a.id !== id));
    } else if (type === 'episode') {
      await supabase.from('user_progress').delete().eq('id', id).eq('user_id', user.id);
      setEpisodes(prev => prev.filter(e => e.id !== id));
    }
  };

  const filteredData = useMemo(() => {
    let data: any[] = [];
    if (activeTab === 'anime') data = animes;
    else if (activeTab === 'episode') data = episodes;
    else if (activeTab === 'rumor') data = rumors;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      data = data.filter(item => {
        if (activeTab === 'anime') return item.anime?.toLowerCase().includes(query);
        if (activeTab === 'episode') return item.anime?.toLowerCase().includes(query);
        if (activeTab === 'rumor') return item.title?.toLowerCase().includes(query);
        return true;
      });
    }

    return data.sort((a, b) => {
      if (sortBy === 'recent') {
        const dateA = activeTab === 'rumor' ? a.first_seen_at : a.created_at;
        const dateB = activeTab === 'rumor' ? b.first_seen_at : b.created_at;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      }
      if (sortBy === 'oldest') {
        const dateA = activeTab === 'rumor' ? a.first_seen_at : a.created_at;
        const dateB = activeTab === 'rumor' ? b.first_seen_at : b.created_at;
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      }
      if (sortBy === 'az') {
        const nameA = activeTab === 'rumor' ? a.title : (a.anime || '');
        const nameB = activeTab === 'rumor' ? b.title : (b.anime || '');
        return (nameA || '').localeCompare(nameB || '');
      }
      if (sortBy === 'za') {
        const nameA = activeTab === 'rumor' ? a.title : (a.anime || '');
        const nameB = activeTab === 'rumor' ? b.title : (b.anime || '');
        return (nameB || '').localeCompare(nameA || '');
      }
      return 0;
    });
  }, [activeTab, animes, episodes, rumors, searchQuery, sortBy]);

  const getTabCount = (type: FavoriteType) => {
    if (type === 'anime') return animes.length;
    if (type === 'episode') return episodes.length;
    if (type === 'rumor') return rumors.length;
    return 0;
  };

  const handleLogin = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  if (loading) {
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
            <div className="text-6xl mb-6">🔒</div>
            <h2 className="text-3xl font-bold text-white mb-4">Login Necessário</h2>
            <p className="text-[#a1a1a1] mb-8">
              Você precisa estar logado para ver seus favoritos.
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
            <h1 className="text-3xl md:text-4xl font-bold text-white">Meus Favoritos</h1>
          </div>
          <p className="text-[#a1a1a1]">{user.email}</p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-3 overflow-x-auto pb-4 mb-6 scrollbar-hide"
        >
          <TabButton
            active={activeTab === 'anime'}
            onClick={() => setActiveTab('anime')}
            icon="🎬"
            label="Animes"
            count={getTabCount('anime')}
          />
          <TabButton
            active={activeTab === 'episode'}
            onClick={() => setActiveTab('episode')}
            icon="📺"
            label="Episódios"
            count={getTabCount('episode')}
          />
          <TabButton
            active={activeTab === 'rumor'}
            onClick={() => setActiveTab('rumor')}
            icon="🧪"
            label="Rumores"
            count={getTabCount('rumor')}
          />
        </motion.div>

        {/* Toolbar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 mb-8"
        >
          <div className="relative flex-1">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#525252]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              className="w-full pl-12 pr-4 py-3 bg-[#121212] border border-[#262626] rounded-xl text-white placeholder-[#525252] focus:border-[#ff4d00] focus:outline-none transition-colors"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select 
            className="bg-[#121212] border border-[#262626] rounded-xl px-4 py-3 text-white focus:border-[#ff4d00] focus:outline-none"
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as SortOption)}
          >
            <option value="recent">Mais recente</option>
            <option value="oldest">Mais antigo</option>
            <option value="az">A - Z</option>
            <option value="za">Z - A</option>
          </select>
        </motion.div>

        {/* Content */}
        {dataLoading ? (
          <div className="flex justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-10 h-10 border-2 border-[#ff4d00]/30 border-t-[#ff4d00] rounded-full"
            />
          </div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-[#a1a1a1]">Erro ao carregar favoritos: {error}</p>
          </motion.div>
        ) : filteredData.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="text-6xl mb-4">⭐</div>
            <h3 className="text-2xl font-bold text-white mb-2">Nenhum favorito ainda</h3>
            <p className="text-[#a1a1a1] max-w-sm mx-auto">
              {activeTab === 'anime' && 'Adicione animes aos favoritos na página de detalhes.'}
              {activeTab === 'episode' && 'Marque episódios para assistir depois.'}
              {activeTab === 'rumor' && 'Os rumores aparecerão aqui quando houverem.'}
            </p>
          </motion.div>
        ) : (
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { 
                opacity: 1,
                transition: { staggerChildren: 0.05 }
              }
            }}
          >
            {filteredData.map((item) => (
              <motion.div
                key={item.id}
                variants={{
                  hidden: { opacity: 0, scale: 0.8 },
                  visible: { opacity: 1, scale: 1 }
                }}
              >
                <FavoriteCard
                  item={item}
                  type={activeTab}
                  onRemove={() => handleRemoveFavorite(item.id, activeTab)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>
    </main>
  );
}