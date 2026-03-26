'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

type MediaType = 'anime' | 'manga' | 'manhwa' | 'live_action' | 'film';
type RumorStatus = 'all' | 'unverified' | 'circulating' | 'likely' | 'confirmed';
type ConfidenceLevel = 'low' | 'medium' | 'high';
type SortBy = 'recent' | 'reliable' | 'sources';

interface Rumor {
  id: number;
  title: string;
  mediaType: MediaType;
  status: RumorStatus;
  confidence: ConfidenceLevel;
  sources: number;
  date: string;
  description: string;
  denied: boolean;
}

const MOCK_RUMORS: Rumor[] = [
  { id: 1, title: 'Naruto Sequel Announcement', mediaType: 'anime', status: 'circulating', confidence: 'medium', sources: 3, date: '2026-03-25', description: 'Rumores indicam que um sequel de Naruto está em desenvolvimento pela Studio Pierrot.', denied: false },
  { id: 2, title: 'New Dragon Ball Project', mediaType: 'anime', status: 'likely', confidence: 'high', sources: 5, date: '2026-03-24', description: 'Novo projeto Dragon Ball pode ser anunciado no próximo mês.', denied: false },
  { id: 3, title: 'One Piece Live Action S2', mediaType: 'live_action', status: 'confirmed', confidence: 'high', sources: 8, date: '2026-03-23', description: 'Netflix confirma segunda temporada de One Piece Live Action.', denied: false },
  { id: 4, title: 'Bleach: New Arc Adaptation', mediaType: 'anime', status: 'circulating', confidence: 'low', sources: 2, date: '2026-03-22', description: 'Possível adaptação do arco final do mangá.', denied: false },
  { id: 5, title: 'Solo Leveling Season 2', mediaType: 'anime', status: 'likely', confidence: 'medium', sources: 4, date: '2026-03-21', description: 'Segunda temporada de Solo Leveling em desenvolvimento.', denied: false },
  { id: 6, title: 'Tokyo Revengers Movie', mediaType: 'film', status: 'unverified', confidence: 'low', sources: 1, date: '2026-03-20', description: 'Novo filme live action em produção.', denied: false },
  { id: 7, title: 'Omniscient Reader Episode 2', mediaType: 'anime', status: 'confirmed', confidence: 'high', sources: 6, date: '2026-03-19', description: 'Segunda temporada confirmada para 2026.', denied: false },
  { id: 8, title: 'Tower of God Season 2', mediaType: 'anime', status: 'circulating', confidence: 'medium', sources: 3, date: '2026-03-18', description: 'Possível retorno de Tower of God.', denied: false },
  { id: 9, title: 'Lookism Manhwa Adaptation', mediaType: 'manhwa', status: 'unverified', confidence: 'low', sources: 2, date: '2026-03-17', description: 'Adaptação em negociação.', denied: false },
  { id: 10, title: 'Jujutsu Kaisen Movie', mediaType: 'anime', status: 'likely', confidence: 'high', sources: 4, date: '2026-03-16', description: 'Novo filme de Jujutsu Kaisen em produção.', denied: false },
  { id: 11, title: 'Chainsaw Man Sequel', mediaType: 'anime', status: 'circulating', confidence: 'medium', sources: 3, date: '2026-03-15', description: 'Sequel de Chainsaw Man confirmado.', denied: false },
  { id: 12, title: 'Spy x Family Season 3', mediaType: 'anime', status: 'confirmed', confidence: 'high', sources: 7, date: '2026-03-14', description: 'Terceira temporada confirmada.', denied: false },
];

const MEDIA_TYPES: { value: MediaType; label: string }[] = [
  { value: 'anime', label: 'Anime' },
  { value: 'manga', label: 'Manga' },
  { value: 'manhwa', label: 'Manhwa' },
  { value: 'live_action', label: 'Live Action' },
  { value: 'film', label: 'Filme' },
];

const STATUS_LABELS: Record<Exclude<RumorStatus, 'all'>, string> = {
  unverified: 'Não Verificado',
  circulating: 'Circulando',
  likely: 'Provável',
  confirmed: 'Confirmado',
};

const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
};

export default function Radar() {
  const [selectedTypes, setSelectedTypes] = useState<MediaType[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<RumorStatus>('all');
  const [selectedConfidence, setSelectedConfidence] = useState<ConfidenceLevel[]>([]);
  const [includeDenied, setIncludeDenied] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const toggleType = (type: MediaType) => {
    setSelectedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleConfidence = (level: ConfidenceLevel) => {
    setSelectedConfidence(prev => 
      prev.includes(level) ? prev.filter(c => c !== level) : [...prev, level]
    );
  };

  const filteredRumors = useMemo(() => {
    return MOCK_RUMORS.filter(rumor => {
      if (selectedTypes.length > 0 && !selectedTypes.includes(rumor.mediaType)) return false;
      if (selectedStatus !== 'all' && rumor.status !== selectedStatus) return false;
      if (selectedConfidence.length > 0 && !selectedConfidence.includes(rumor.confidence)) return false;
      if (!includeDenied && rumor.denied) return false;
      return true;
    }).sort((a, b) => {
      if (sortBy === 'recent') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === 'reliable') {
        const confidenceOrder = { high: 3, medium: 2, low: 1 };
        return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
      }
      return b.sources - a.sources;
    });
  }, [selectedTypes, selectedStatus, selectedConfidence, includeDenied, sortBy]);

  const totalPages = Math.ceil(filteredRumors.length / itemsPerPage);
  const paginatedRumors = filteredRumors.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const stats = useMemo(() => {
    const total = MOCK_RUMORS.length;
    const byStatus = {
      unverified: MOCK_RUMORS.filter(r => r.status === 'unverified').length,
      circulating: MOCK_RUMORS.filter(r => r.status === 'circulating').length,
      likely: MOCK_RUMORS.filter(r => r.status === 'likely').length,
      confirmed: MOCK_RUMORS.filter(r => r.status === 'confirmed').length,
    };
    const recentTrend = MOCK_RUMORS.filter(r => new Date(r.date) > new Date('2026-03-20')).length;
    return { total, byStatus, recentTrend };
  }, []);

  const getStatusColor = (status: RumorStatus) => {
    const colors: Record<RumorStatus, string> = {
      all: 'bg-gray-500',
      unverified: 'bg-gray-500',
      circulating: 'bg-yellow-500',
      likely: 'bg-blue-500',
      confirmed: 'bg-green-500',
    };
    return colors[status];
  };

  const getConfidenceColor = (confidence: ConfidenceLevel) => {
    const colors = {
      low: 'text-red-400',
      medium: 'text-yellow-400',
      high: 'text-green-400',
    };
    return colors[confidence];
  };

  return (
    <main className="container">
      <header className="header">
        <Link href="/" className="logo">Otaku Calendar</Link>
        <nav className="nav">
          <Link href="/">Calendário</Link>
          <Link href="/radar" className="text-accent">Radar Otaku</Link>
          <Link href="/favorites">Favoritos</Link>
          <button className="login-btn">Login</button>
        </nav>
      </header>

      <section className="py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Radar Otaku</h1>
          <p className="text-text-secondary">
            Fique por dentro dos últimos rumores, anúncios e confirmações do mundo otaku.
          </p>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {MEDIA_TYPES.map(type => (
            <button
              key={type.value}
              onClick={() => toggleType(type.value)}
              className={`filter-chip ${selectedTypes.includes(type.value) ? 'active' : ''}`}
            >
              {type.label}
            </button>
          ))}
        </div>

        <div className="grid-layout">
          <aside className="sidebar">
            <div className="sidebar-section">
              <h3 className="sidebar-title">Tipo de Mídia</h3>
              <div className="filter-list">
                {MEDIA_TYPES.map(type => (
                  <label key={type.value} className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type.value)}
                      onChange={() => toggleType(type.value)}
                    />
                    <span>{type.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="sidebar-section">
              <h3 className="sidebar-title">Status</h3>
              <div className="filter-list">
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <label key={value} className="filter-radio">
                    <input
                      type="radio"
                      name="status"
                      checked={selectedStatus === value}
                      onChange={() => setSelectedStatus(value as RumorStatus)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="sidebar-section">
              <h3 className="sidebar-title">Nível de Confiança</h3>
              <div className="filter-list">
                {Object.entries(CONFIDENCE_LABELS).map(([value, label]) => (
                  <label key={value} className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedConfidence.includes(value as ConfidenceLevel)}
                      onChange={() => toggleConfidence(value as ConfidenceLevel)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="sidebar-section">
              <label className="filter-toggle">
                <input
                  type="checkbox"
                  checked={includeDenied}
                  onChange={() => setIncludeDenied(!includeDenied)}
                />
                <span>Incluir rumores negados</span>
              </label>
            </div>
          </aside>

          <div className="main-content">
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-number">{stats.total}</span>
                <span className="stat-label">Total de Rumores</span>
              </div>
              <div className="stat-card">
                <span className="stat-number text-green-400">{stats.byStatus.confirmed}</span>
                <span className="stat-label">Confirmados</span>
              </div>
              <div className="stat-card">
                <span className="stat-number text-blue-400">{stats.byStatus.likely}</span>
                <span className="stat-label">Prováveis</span>
              </div>
              <div className="stat-card">
                <span className="stat-number text-yellow-400">{stats.byStatus.circulating}</span>
                <span className="stat-label">Circulando</span>
              </div>
              <div className="stat-card">
                <span className="stat-number text-gray-400">{stats.byStatus.unverified}</span>
                <span className="stat-label">Não Verificados</span>
              </div>
              <div className="stat-card">
                <span className={`stat-number ${stats.recentTrend > 5 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {stats.recentTrend > 5 ? '↑' : '→'}
                </span>
                <span className="stat-label">Tendência (7 dias)</span>
              </div>
            </div>

            <div className="content-header">
              <span className="results-count">{filteredRumors.length} rumores encontrados</span>
              <div className="sort-select">
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
                  <option value="recent">Mais Recente</option>
                  <option value="reliable">Mais Confiável</option>
                  <option value="sources">Mais Fontes</option>
                </select>
              </div>
            </div>

            <div className="rumors-grid">
              {paginatedRumors.map(rumor => (
                <div key={rumor.id} className="rumor-card">
                  <div className="rumor-header">
                    <span className={`rumor-status ${getStatusColor(rumor.status)}`}>
                      {rumor.status !== 'all' ? STATUS_LABELS[rumor.status] : rumor.status}
                    </span>
                    <span className={`rumor-confidence ${getConfidenceColor(rumor.confidence)}`}>
                      {CONFIDENCE_LABELS[rumor.confidence]}
                    </span>
                  </div>
                  <h3 className="rumor-title">{rumor.title}</h3>
                  <p className="rumor-description">{rumor.description}</p>
                  <div className="rumor-meta">
                    <span className="media-type-badge">{rumor.mediaType}</span>
                    <span className="rumor-date">{new Date(rumor.date).toLocaleDateString('pt-BR')}</span>
                    <span className="rumor-sources">{rumor.sources} fontes</span>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  Anterior
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`pagination-btn ${currentPage === i + 1 ? 'active' : ''}`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                >
                  Próxima
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <style jsx>{`
        .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
        .mb-8 { margin-bottom: 2rem; }
        .mb-6 { margin-bottom: 1.5rem; }
        .mb-2 { margin-bottom: 0.5rem; }
        .flex { display: flex; }
        .gap-2 { gap: 0.5rem; }
        .flex-wrap { flex-wrap: wrap; }
        
        .grid-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 2rem;
        }
        
        @media (max-width: 1024px) {
          .grid-layout {
            grid-template-columns: 1fr;
          }
        }
        
        .filter-chip {
          padding: 0.5rem 1rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 20px;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s;
          color: var(--text-secondary);
        }
        
        .filter-chip:hover {
          border-color: var(--accent);
        }
        
        .filter-chip.active {
          background: var(--accent);
          color: white;
          border-color: var(--accent);
        }
        
        .sidebar {
          background: var(--bg-secondary);
          border-radius: 12px;
          padding: 1.5rem;
          height: fit-content;
          position: sticky;
          top: 1rem;
        }
        
        .sidebar-section {
          margin-bottom: 1.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid var(--border);
        }
        
        .sidebar-section:last-child {
          margin-bottom: 0;
          padding-bottom: 0;
          border-bottom: none;
        }
        
        .sidebar-title {
          font-weight: 600;
          margin-bottom: 1rem;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
        }
        
        .filter-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .filter-checkbox, .filter-radio {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-size: 0.875rem;
          color: var(--text-primary);
        }
        
        .filter-checkbox input, .filter-radio input {
          accent-color: var(--accent);
          width: 16px;
          height: 16px;
        }
        
        .filter-toggle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-size: 0.875rem;
        }
        
        .filter-toggle input {
          accent-color: var(--accent);
          width: 16px;
          height: 16px;
        }
        
        .main-content {
          min-width: 0;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }
        
        .stat-card {
          background: var(--bg-secondary);
          border-radius: 12px;
          padding: 1.25rem;
          text-align: center;
        }
        
        .stat-number {
          display: block;
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }
        
        .stat-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .content-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        
        .results-count {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }
        
        .sort-select select {
          padding: 0.5rem 1rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-primary);
          cursor: pointer;
          font-size: 0.875rem;
        }
        
        .rumors-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
        }
        
        .rumor-card {
          background: var(--bg-secondary);
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid var(--border);
          transition: all 0.2s;
        }
        
        .rumor-card:hover {
          border-color: var(--accent);
          transform: translateY(-2px);
        }
        
        .rumor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }
        
        .rumor-status {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          color: white;
        }
        
        .rumor-confidence {
          font-size: 0.75rem;
          font-weight: 500;
        }
        
        .rumor-title {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: var(--text-primary);
        }
        
        .rumor-description {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-bottom: 1rem;
          line-height: 1.5;
        }
        
        .rumor-meta {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        
        .media-type-badge {
          padding: 0.125rem 0.5rem;
          background: var(--bg-tertiary);
          border-radius: 4px;
          text-transform: capitalize;
        }
        
        .rumor-date, .rumor-sources {
          color: var(--text-muted);
        }
        
        .pagination {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 2rem;
        }
        
        .pagination-btn {
          padding: 0.5rem 1rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-primary);
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s;
        }
        
        .pagination-btn:hover:not(:disabled) {
          border-color: var(--accent);
        }
        
        .pagination-btn.active {
          background: var(--accent);
          border-color: var(--accent);
          color: white;
        }
        
        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .text-accent { color: var(--accent); }
        .text-green-400 { color: #4ade80; }
        .text-blue-400 { color: #60a5fa; }
        .text-yellow-400 { color: #facc15; }
        .text-red-400 { color: #f87171; }
        .text-gray-400 { color: #9ca3af; }
        .text-text-secondary { color: var(--text-secondary); }
      `}</style>
    </main>
  );
}
