'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import type { FavoriteAnime, FavoriteEpisode, FavoriteRumor, FavoriteType } from './types';

type SortOption = 'recent' | 'oldest' | 'az' | 'za';

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
    setError(null);
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
    setError(null);

    const { data: progress, error: progressError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('watched', false);

    if (progressError) {
      setError(progressError.message);
      setEpisodes([]);
    } else if (progress && progress.length > 0) {
      const episodeIds = progress.map((p: any) => p.episode_id);
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .in('id', episodeIds);

      if (eventsError) {
        setError(eventsError.message);
        setEpisodes([]);
      } else {
        const episodesData: FavoriteEpisode[] = (events || []).map((event: any) => ({
          id: progress.find((p: any) => p.episode_id === event.id)?.id || '',
          episodeId: event.id,
          anime: event.anime,
          episode: event.episode || 0,
          date: event.date?.toString() || '',
          watched: false,
        }));
        setEpisodes(episodesData);
      }
    } else {
      setEpisodes([]);
    }
    setDataLoading(false);
  }, [user]);

  const fetchRumors = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    setDataLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('rumors')
      .select('*')
      .order('first_seen_at', { ascending: false })
      .limit(50);

    if (fetchError) {
      setError(fetchError.message);
      setRumors([]);
    } else {
      setRumors((data || []) as FavoriteRumor[]);
    }
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
        const nameA = activeTab === 'rumor' ? a.title : (activeTab === 'anime' ? a.anime : a.anime);
        const nameB = activeTab === 'rumor' ? b.title : (activeTab === 'anime' ? b.anime : b.anime);
        return (nameA || '').localeCompare(nameB || '');
      }
      if (sortBy === 'za') {
        const nameA = activeTab === 'rumor' ? a.title : (activeTab === 'anime' ? a.anime : a.anime);
        const nameB = activeTab === 'rumor' ? b.title : (activeTab === 'anime' ? b.anime : b.anime);
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
      <main className="container">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Carregando...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="container">
        <header className="header">
          <Link href="/" className="logo">Otaku Calendar</Link>
          <nav className="nav">
            <Link href="/">Calendário</Link>
            <Link href="/radar">Radar Otaku</Link>
            <Link href="/favorites" className="text-accent">Favoritos</Link>
          </nav>
        </header>
        <div className="login-prompt">
          <div className="login-icon">🔒</div>
          <h2>Login Necessário</h2>
          <p>Você precisa estar logado para ver seus favoritos.</p>
          <button className="login-btn" onClick={handleLogin}>
            Entrar com Google
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <header className="header">
        <Link href="/" className="logo">Otaku Calendar</Link>
        <nav className="nav">
          <Link href="/">Calendário</Link>
          <Link href="/radar">Radar Otaku</Link>
          <Link href="/favorites" className="text-accent">Favoritos</Link>
        </nav>
      </header>

      <section className="favorites-section">
        <div className="favorites-header">
          <h1>Meus Favoritos</h1>
          <p className="user-email">{user.email}</p>
        </div>

        <div className="tabs-container">
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'anime' ? 'active' : ''}`}
              onClick={() => setActiveTab('anime')}
            >
              🎬 Animes <span className="tab-count">{getTabCount('anime')}</span>
            </button>
            <button
              className={`tab ${activeTab === 'episode' ? 'active' : ''}`}
              onClick={() => setActiveTab('episode')}
            >
              📺 Episódios <span className="tab-count">{getTabCount('episode')}</span>
            </button>
            <button
              className={`tab ${activeTab === 'rumor' ? 'active' : ''}`}
              onClick={() => setActiveTab('rumor')}
            >
              🧪 Rumores <span className="tab-count">{getTabCount('rumor')}</span>
            </button>
          </div>
        </div>

        <div className="toolbar">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="sort-box">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}>
              <option value="recent">Mais recente</option>
              <option value="oldest">Mais antigo</option>
              <option value="az">A - Z</option>
              <option value="za">Z - A</option>
            </select>
          </div>
        </div>

        {dataLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
          </div>
        ) : error ? (
          <div className="empty-state">
            <div className="empty-icon">⚠️</div>
            <p>Erro ao carregar favoritos: {error}</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">⭐</div>
            <h3>Nenhum favorito ainda</h3>
            <p>
              {activeTab === 'anime' && 'Adicione animes aos favoritos na página de detalhes.'}
              {activeTab === 'episode' && 'Marque episódios para assistir depois.'}
              {activeTab === 'rumor' && 'Os rumores aparecerão aqui quando houverem.'}
            </p>
          </div>
        ) : (
          <div className="favorites-grid">
            {filteredData.map((item) => (
              <div key={item.id} className={`favorite-card ${activeTab}`}>
                <div className="card-cover">
                  <img
                    src={item.coverUrl || MOCK_ANIME_COVER}
                    alt={activeTab === 'rumor' ? item.title : (item.anime || item.title)}
                  />
                  {activeTab === 'rumor' && (
                    <span className={`rumor-status status-${item.status}`}>
                      {item.status}
                    </span>
                  )}
                  {activeTab === 'episode' && (
                    <span className="episode-badge">EP {item.episode}</span>
                  )}
                </div>
                <div className="card-info">
                  <h3 className="card-title">
                    {activeTab === 'rumor' ? item.title : (item.anime || item.title)}
                  </h3>
                  {activeTab === 'anime' && (
                    <p className="card-date">
                      Adicionado em {new Date(item.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                  {activeTab === 'episode' && (
                    <p className="card-date">
                      {new Date(item.date).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                  {activeTab === 'rumor' && (
                    <p className="card-meta">
                      {item.media_type} • {item.confidence_score ? `${Math.round(item.confidence_score * 100)}%` : 'N/A'}
                    </p>
                  )}
                </div>
                <button
                  className="remove-btn"
                  onClick={() => handleRemoveFavorite(item.id, activeTab)}
                  title="Remover"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <style jsx>{`
        .loading-screen {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          gap: 1rem;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--bg-tertiary);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .login-prompt {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          text-align: center;
          gap: 1rem;
        }

        .login-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .login-prompt h2 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }

        .login-prompt p {
          color: var(--text-secondary);
          margin-bottom: 1.5rem;
        }

        .favorites-section {
          padding: 1.5rem 0;
        }

        .favorites-header {
          margin-bottom: 1.5rem;
        }

        .favorites-header h1 {
          font-size: 1.75rem;
          margin-bottom: 0.25rem;
        }

        .user-email {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .tabs-container {
          margin-bottom: 1rem;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .tabs {
          display: flex;
          gap: 0.5rem;
          min-width: max-content;
        }

        .tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 24px;
          color: var(--text-secondary);
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .tab:hover {
          border-color: var(--accent);
          color: var(--text-primary);
        }

        .tab.active {
          background: var(--accent);
          border-color: var(--accent);
          color: white;
        }

        .tab-count {
          font-size: 0.75rem;
          padding: 0.125rem 0.5rem;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 12px;
        }

        .tab:not(.active) .tab-count {
          background: var(--bg-tertiary);
        }

        .toolbar {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .search-box {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
        }

        .search-icon {
          font-size: 0.875rem;
          opacity: 0.6;
        }

        .search-box input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 0.9rem;
          outline: none;
        }

        .search-box input::placeholder {
          color: var(--text-muted);
        }

        .sort-box select {
          padding: 0.625rem 1rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 0.9rem;
          cursor: pointer;
          min-width: 140px;
        }

        .sort-box select:focus {
          outline: none;
          border-color: var(--accent);
        }

        .loading-container {
          display: flex;
          justify-content: center;
          padding: 3rem 0;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 1rem;
          text-align: center;
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .empty-state h3 {
          font-size: 1.25rem;
          margin-bottom: 0.5rem;
        }

        .empty-state p {
          color: var(--text-secondary);
          max-width: 300px;
        }

        .favorites-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        @media (min-width: 640px) {
          .favorites-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .favorites-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 1.25rem;
          }
        }

        .favorite-card {
          position: relative;
          background: var(--bg-secondary);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s;
        }

        .favorite-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }

        .card-cover {
          position: relative;
          aspect-ratio: 2/3;
          overflow: hidden;
        }

        .card-cover img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .rumor-status {
          position: absolute;
          top: 0.5rem;
          left: 0.5rem;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.65rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-confirmed { background: #22c55e; color: white; }
        .status-likely { background: #3b82f6; color: white; }
        .status-circulating { background: #eab308; color: black; }
        .status-unverified { background: #6b7280; color: white; }
        .status-denied { background: #ef4444; color: white; }

        .episode-badge {
          position: absolute;
          bottom: 0.5rem;
          right: 0.5rem;
          padding: 0.25rem 0.5rem;
          background: var(--accent);
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
          color: white;
        }

        .card-info {
          padding: 0.75rem;
        }

        .card-title {
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .card-date, .card-meta {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .remove-btn {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.6);
          border: none;
          border-radius: 50%;
          color: white;
          font-size: 0.75rem;
          cursor: pointer;
          opacity: 0;
          transition: all 0.2s;
        }

        .favorite-card:hover .remove-btn {
          opacity: 1;
        }

        .remove-btn:hover {
          background: #ef4444;
        }

        .text-accent { color: var(--accent); }
      `}</style>
    </main>
  );
}
