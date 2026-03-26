'use client';

import { useState, useEffect, useCallback } from 'react';

export interface TrendingRumor {
  id: string;
  title: string;
  anime: string;
  description?: string;
  confidence: 'low' | 'medium' | 'high';
  sources: number;
  engagement: number;
  trend: 'up' | 'down' | 'stable';
  status: 'unverified' | 'confirmed' | 'debunked';
  createdAt: string;
}

export interface TrendingRumorsProps {
  limit?: number;
  refreshInterval?: number;
  showRefreshButton?: boolean;
}

const MOCK_TRENDING_RUMORS: TrendingRumor[] = [
  {
    id: '1',
    title: 'Novo Projeto Dragon Ball',
    anime: 'Dragon Ball',
    description: 'Novo projeto de anime baseado em DB foi especulado para 2026',
    confidence: 'medium',
    sources: 8,
    engagement: 15420,
    trend: 'up',
    status: 'unverified',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    title: 'Sequência de Naruto',
    anime: 'Naruto',
    description: 'Possível anúncio de sequência do manga de Masashi Kishimoto',
    confidence: 'low',
    sources: 12,
    engagement: 28350,
    trend: 'up',
    status: 'unverified',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    title: 'Novo Projeto JJK',
    anime: 'Jujutsu Kaisen',
    description: 'Gege Akutami pode anunciar novo projeto em breve',
    confidence: 'high',
    sources: 5,
    engagement: 9870,
    trend: 'stable',
    status: 'unverified',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    title: 'Adaptação Live Action One Piece',
    anime: 'One Piece',
    description: 'Netflix pode estar desenvolvendo nova temporada',
    confidence: 'high',
    sources: 15,
    engagement: 45200,
    trend: 'up',
    status: 'confirmed',
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '5',
    title: 'Bleach: Novo Arco',
    anime: 'Bleach',
    description: 'Tite Kubo pode revelar novo arco do manga',
    confidence: 'medium',
    sources: 6,
    engagement: 11200,
    trend: 'down',
    status: 'unverified',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

function isNewRumor(createdAt: string): boolean {
  const hoursSince = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  return hoursSince < 6;
}

function getConfidenceColor(confidence: string): string {
  switch (confidence) {
    case 'high': return 'var(--success)';
    case 'medium': return 'var(--warning)';
    case 'low': return 'var(--text-muted)';
    default: return 'var(--text-secondary)';
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'confirmed': return 'var(--success)';
    case 'debunked': return 'var(--error)';
    case 'unverified': return 'var(--rumor)';
    default: return 'var(--text-secondary)';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'confirmed': return 'Confirmado';
    case 'debunked': return 'Desmentido';
    case 'unverified': return 'Não verificado';
    default: return status;
  }
}

function TrendIndicator({ trend }: { trend: string }) {
  if (trend === 'up') {
    return <span style={{ color: 'var(--success)' }}>↑</span>;
  }
  if (trend === 'down') {
    return <span style={{ color: 'var(--error)' }}>↓</span>;
  }
  return <span style={{ color: 'var(--text-muted)' }}>→</span>;
}

function MiniRumorCard({ 
  rumor, 
  rank, 
  isExpanded, 
  onToggle 
}: { 
  rumor: TrendingRumor; 
  rank: number; 
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div 
      className="trending-rumor-card"
      onClick={onToggle}
      style={{
        padding: '0.75rem',
        marginBottom: '0.5rem',
        background: 'var(--bg-tertiary)',
        borderRadius: '8px',
        cursor: 'pointer',
        borderLeft: rank <= 3 ? `3px solid var(--accent)` : '3px solid var(--border)',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <span style={{ 
          fontWeight: 700, 
          fontSize: '1rem',
          color: rank <= 3 ? 'var(--accent)' : 'var(--text-secondary)',
          minWidth: '24px',
        }}>
          {rank}
        </span>
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              {rumor.title}
            </span>
            {isNewRumor(rumor.createdAt) && (
              <span style={{
                fontSize: '0.6rem',
                padding: '0.15rem 0.4rem',
                background: 'var(--success)',
                color: 'white',
                borderRadius: '4px',
                fontWeight: 600,
              }}>
                NOVO
              </span>
            )}
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
          }}>
            <span>{rumor.anime}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <TrendIndicator trend={rumor.trend} />
            </span>
            <span style={{ color: getConfidenceColor(rumor.confidence) }}>
              {rumor.confidence}
            </span>
            <span>{rumor.sources} fontes</span>
          </div>
          
          {isExpanded && (
            <div style={{ 
              marginTop: '0.75rem', 
              paddingTop: '0.75rem', 
              borderTop: '1px solid var(--border)' 
            }}>
              <p style={{ 
                fontSize: '0.8rem', 
                color: 'var(--text-secondary)', 
                marginBottom: '0.5rem',
                lineHeight: 1.5,
              }}>
                {rumor.description}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  fontSize: '0.7rem',
                  padding: '0.2rem 0.5rem',
                  background: `${getStatusColor(rumor.status)}20`,
                  color: getStatusColor(rumor.status),
                  borderRadius: '4px',
                }}>
                  {getStatusLabel(rumor.status)}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {rumor.engagement.toLocaleString()} engajamentos
                </span>
              </div>
            </div>
          )}
        </div>
        
        <span style={{ 
          fontSize: '0.7rem', 
          color: isExpanded ? 'var(--accent)' : 'var(--text-muted)',
          transition: 'transform 0.2s',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>
          ▼
        </span>
      </div>
    </div>
  );
}

export default function TrendingRumors({ 
  limit = 5, 
  refreshInterval = 60000,
  showRefreshButton = true,
}: TrendingRumorsProps) {
  const [rumors, setRumors] = useState<TrendingRumor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRumors = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    }
    
    try {
      const response = await fetch(`/api/rumors?sort=trending&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch rumors');
      }
      
      const data = await response.json();
      setRumors(data.rumors || []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.warn('API unavailable, using mock data:', err);
      setRumors(MOCK_TRENDING_RUMORS.slice(0, limit));
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchRumors();
  }, [fetchRumors]);

  useEffect(() => {
    if (refreshInterval <= 0) return;
    
    const interval = setInterval(() => {
      fetchRumors();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [refreshInterval, fetchRumors]);

  const handleRefresh = () => {
    fetchRumors(true);
  };

  const handleToggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  if (loading) {
    return (
      <div style={{ 
        padding: '1.5rem', 
        background: 'var(--bg-secondary)', 
        borderRadius: '12px' 
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          color: 'var(--text-secondary)',
        }}>
          <span style={{ 
            width: '16px', 
            height: '16px', 
            border: '2px solid var(--text-muted)',
            borderTopColor: 'var(--accent)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          Carregando rumores em alta...
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      padding: '1rem',
      background: 'var(--bg-secondary)',
      borderRadius: '12px',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
      }}>
        <h3 style={{
          fontSize: '1rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <span>🔥</span>
          Rumores em Alta
        </h3>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {lastUpdated && (
            <span style={{ 
              fontSize: '0.7rem', 
              color: 'var(--text-muted)' 
            }}>
              {lastUpdated.toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          )}
          
          {showRefreshButton && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              style={{
                padding: '0.4rem 0.6rem',
                background: 'var(--bg-tertiary)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                transition: 'all 0.2s',
                opacity: isRefreshing ? 0.5 : 1,
              }}
            >
              <span style={{
                display: 'inline-block',
                animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
              }}>
                ⟳
              </span>
              {isRefreshing ? 'Atualizando...' : 'Atualizar'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{
          padding: '0.75rem',
          background: 'rgba(239, 68, 68, 0.1)',
          borderRadius: '8px',
          color: 'var(--error)',
          fontSize: '0.8rem',
          marginBottom: '1rem',
        }}>
          {error}
        </div>
      )}

      <div className="trending-rumors-list">
        {rumors.map((rumor, index) => (
          <MiniRumorCard
            key={rumor.id}
            rumor={rumor}
            rank={index + 1}
            isExpanded={expandedId === rumor.id}
            onToggle={() => handleToggleExpand(rumor.id)}
          />
        ))}
      </div>

      {rumors.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          color: 'var(--text-muted)',
          fontSize: '0.9rem',
        }}>
          Nenhum rumor em alta no momento
        </div>
      )}
    </div>
  );
}