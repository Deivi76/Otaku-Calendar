'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  StatsCard,
  StreakCard,
  ComparisonCard,
  GenreChart,
  WeeklyActivity,
  SummaryCard,
} from '@/components/StatsCard';
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
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(shareText);
      setShowShareModal(true);
      setTimeout(() => setShowShareModal(false), 2000);
    }
  };

  if (loading || isLoading) {
    return (
      <main className="container">
        <header className="header">
          <Link href="/" className="logo">Otaku Calendar</Link>
          <nav className="nav">
            <Link href="/">Calendário</Link>
            <Link href="/radar">Radar Otaku</Link>
            <Link href="/favorites">Favoritos</Link>
          </nav>
        </header>
        <div className="stats-loading">
          <div className="loading-spinner"></div>
          <p>Carregando estatísticas...</p>
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
            <Link href="/favorites">Favoritos</Link>
          </nav>
        </header>
        <div className="login-prompt">
          <div className="login-icon">📊</div>
          <h2>Estatísticas Pessoais</h2>
          <p>Faça login para acompanhar seu progresso e estatísticas de anime.</p>
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
          <Link href="/favorites">Favoritos</Link>
        </nav>
      </header>

      <section className="stats-section">
        <div className="stats-header">
          <div>
            <h1>Minhas Estatísticas</h1>
            <p className="user-email">{user.email}</p>
          </div>
          <div className="header-actions">
            <button className="refresh-btn" onClick={refresh} disabled={isLoading}>
              <span className={isLoading ? 'spinning' : ''}>↻</span>
            </button>
            <button className="share-btn" onClick={handleShareStats}>
              📤 Compartilhar
            </button>
          </div>
        </div>

        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
            <button onClick={refresh}>Tentar novamente</button>
          </div>
        )}

        {/* Streak Card - Full Width */}
        <div className="streak-section">
          <StreakCard
            currentStreak={stats?.current_streak || 0}
            longestStreak={stats?.longest_streak || 0}
            lastWatchDate={stats?.last_watch_date || null}
            loading={isLoading}
          />
        </div>

        {/* Summary Cards */}
        <div className="summary-grid">
          <SummaryCard
            stats={stats}
            community={community}
            summary={summary}
            loading={isLoading}
          />
        </div>

        {/* Main Stats Grid */}
        <div className="stats-grid">
          <StatsCard
            title="Episódios Assistidos"
            value={stats?.total_episodes_watched || 0}
            subtitle={`${Math.floor((stats?.total_minutes_watched || 0) / 60)}h ${(stats?.total_minutes_watched || 0) % 60}min de conteúdo`}
            icon="📺"
            variant="accent"
            loading={isLoading}
          />
          <StatsCard
            title="Animes Assistidos"
            value={summary.uniqueAnimesWatched || 0}
            subtitle="Animes únicos completados"
            icon="🎬"
            loading={isLoading}
          />
          <StatsCard
            title="Gêneros Favoritos"
            value={stats?.favorite_genres?.length || 0}
            subtitle={stats?.favorite_genres?.slice(0, 2).join(', ') || 'Nenhum'}
            icon="🎭"
            variant="success"
            loading={isLoading}
          />
        </div>

        {/* Weekly Activity */}
        <div className="activity-section">
          <WeeklyActivity history={history} loading={isLoading} />
        </div>

        {/* Genre Distribution */}
        <div className="genre-section">
          <GenreChart
            genres={(community as CommunityStats)?.top_genres || []}
            userGenres={stats?.favorite_genres || []}
            loading={isLoading}
          />
        </div>

        {/* Community Comparison */}
        <div className="comparison-section">
          <h2 className="section-title">Comparação com a Comunidade</h2>
          <div className="comparison-grid">
            <ComparisonCard
              userValue={stats?.total_episodes_watched || 0}
              communityValue={(community as CommunityStats)?.avg_episodes_watched || 0}
              label="Episódios assistidos"
              loading={isLoading}
            />
            <ComparisonCard
              userValue={stats?.current_streak || 0}
              communityValue={(community as CommunityStats)?.avg_streak || 0}
              label="Dias de sequência"
              loading={isLoading}
            />
          </div>
        </div>

        {/* Community Info */}
        <div className="community-section">
          <StatsCard
            title="Comunidade"
            value={(community as CommunityStats)?.total_users || 0}
            subtitle="usuários ativos"
            icon="👥"
            variant="default"
            loading={isLoading}
          />
        </div>
      </section>

      {/* Share Success Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-backdrop"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="modal-content"
            >
              <span className="modal-icon">✅</span>
              <p>Estatísticas copiadas para a área de transferência!</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .stats-loading {
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

        .stats-section {
          padding: 1.5rem 0;
        }

        .stats-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .stats-header h1 {
          font-size: 1.75rem;
          margin-bottom: 0.25rem;
        }

        .user-email {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
        }

        .refresh-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 1.25rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .refresh-btn:hover {
          border-color: var(--accent);
          color: var(--accent);
        }

        .refresh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .refresh-btn .spinning {
          animation: spin 1s linear infinite;
        }

        .share-btn {
          padding: 0.625rem 1rem;
          background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .share-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(255, 107, 53, 0.3);
        }

        .error-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          margin-bottom: 1rem;
          color: var(--error);
        }

        .error-banner button {
          padding: 0.375rem 0.75rem;
          background: var(--error);
          border: none;
          border-radius: 4px;
          color: white;
          font-size: 0.875rem;
          cursor: pointer;
        }

        .streak-section {
          margin-bottom: 1.5rem;
        }

        .summary-grid {
          margin-bottom: 1.5rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }

        .activity-section,
        .genre-section {
          margin-bottom: 1.5rem;
        }

        .comparison-section {
          margin-bottom: 1.5rem;
        }

        .section-title {
          font-size: 1.25rem;
          margin-bottom: 1rem;
        }

        .comparison-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        @media (max-width: 640px) {
          .comparison-grid {
            grid-template-columns: 1fr;
          }
        }

        .community-section {
          margin-bottom: 2rem;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: var(--bg-secondary);
          padding: 1.5rem 2rem;
          border-radius: 12px;
          text-align: center;
        }

        .modal-icon {
          font-size: 2rem;
          display: block;
          margin-bottom: 0.5rem;
        }
      `}</style>
    </main>
  );
}
