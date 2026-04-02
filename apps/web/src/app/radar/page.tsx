'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
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

const STATUS_OPTIONS: { value: RumorStatus; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'unverified', label: 'Não Verificado' },
  { value: 'circulating', label: 'Circulando' },
  { value: 'likely', label: 'Provável' },
  { value: 'confirmed', label: 'Confirmado' },
];

const CONFIDENCE_OPTIONS: { value: ConfidenceLevel; label: string }[] = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
];

interface VerticalPickerProps<T extends string> {
  label: string;
  options: { value: T; label: string }[];
  selectedValue: T;
  onChange: (value: T) => void;
}

function VerticalPicker<T extends string>({ label, options, selectedValue, onChange }: VerticalPickerProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  const itemHeight = 48;

  const scrollToItem = useCallback((value: string) => {
    const index = options.findIndex(o => o.value === value);
    if (containerRef.current && index !== -1) {
      const targetScroll = index * itemHeight;
      containerRef.current.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }
  }, [options]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setIsScrolling(true);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
        const scrollTop = container.scrollTop;
        const centerIndex = Math.round(scrollTop / itemHeight);
        const validIndex = Math.max(0, Math.min(centerIndex, options.length - 1));
        const newValue = options[validIndex]?.value;
        if (newValue && newValue !== selectedValue) {
          onChange(newValue as T);
        }
      }, 100);
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [options, selectedValue, onChange]);

  useEffect(() => {
    scrollToItem(selectedValue);
  }, []);

  return (
    <div className="picker-wrapper">
      <span className="picker-label">{label}</span>
      <div className="picker-container" ref={containerRef}>
        {options.map((option) => (
          <div
            key={option.value}
            className={`picker-item ${selectedValue === option.value ? 'active' : ''}`}
            onClick={() => {
              scrollToItem(option.value);
              onChange(option.value as T);
            }}
          >
            {option.label}
          </div>
        ))}
      </div>
      <div className="picker-indicator" />
    </div>
  );
}

export default function Radar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<MediaType>('anime');
  const [selectedStatus, setSelectedStatus] = useState<RumorStatus>('all');
  const [selectedConfidence, setSelectedConfidence] = useState<ConfidenceLevel>('medium');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const filteredRumors = useMemo(() => {
    return MOCK_RUMORS.filter(rumor => {
      const matchesSearch = searchQuery === '' || 
        rumor.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rumor.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;
      
      if (rumor.mediaType !== selectedType) return false;
      if (selectedStatus !== 'all' && rumor.status !== selectedStatus) return false;
      if (rumor.confidence !== selectedConfidence) return false;
      return true;
    }).sort((a, b) => {
      if (sortBy === 'recent') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === 'reliable') {
        const confidenceOrder: Record<ConfidenceLevel, number> = { high: 3, medium: 2, low: 1 };
        return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
      }
      return b.sources - a.sources;
    });
  }, [searchQuery, selectedType, selectedStatus, selectedConfidence, sortBy]);

  const totalPages = Math.ceil(filteredRumors.length / itemsPerPage);
  const paginatedRumors = filteredRumors.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const stats = useMemo(() => {
    const filtered = MOCK_RUMORS.filter(r => 
      r.mediaType === selectedType && 
      (selectedStatus === 'all' || r.status === selectedStatus)
    );
    const total = filtered.length;
    const byStatus = {
      unverified: filtered.filter(r => r.status === 'unverified').length,
      circulating: filtered.filter(r => r.status === 'circulating').length,
      likely: filtered.filter(r => r.status === 'likely').length,
      confirmed: filtered.filter(r => r.status === 'confirmed').length,
    };
    return { total, byStatus };
  }, [selectedType, selectedStatus]);

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
      low: '#f87171',
      medium: '#facc15',
      high: '#4ade80',
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Radar Otaku</h1>
          <p className="text-text-secondary">
            Fique por dentro dos últimos rumores, anúncios e confirmações do mundo otaku.
          </p>
        </div>

        <div className="search-container">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Buscar rumores..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="pickers-row">
          <VerticalPicker
            label="Tipo"
            options={MEDIA_TYPES}
            selectedValue={selectedType}
            onChange={(v) => { setSelectedType(v as MediaType); setCurrentPage(1); }}
          />
          <VerticalPicker
            label="Status"
            options={STATUS_OPTIONS}
            selectedValue={selectedStatus}
            onChange={(v) => { setSelectedStatus(v as RumorStatus); setCurrentPage(1); }}
          />
          <VerticalPicker
            label="Confiança"
            options={CONFIDENCE_OPTIONS}
            selectedValue={selectedConfidence}
            onChange={(v) => { setSelectedConfidence(v as ConfidenceLevel); setCurrentPage(1); }}
          />
        </div>

        <div className="content-area">
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-number">{stats.total}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-card">
              <span className="stat-number" style={{ color: '#4ade80' }}>{stats.byStatus.confirmed}</span>
              <span className="stat-label">Confirmados</span>
            </div>
            <div className="stat-card">
              <span className="stat-number" style={{ color: '#60a5fa' }}>{stats.byStatus.likely}</span>
              <span className="stat-label">Prováveis</span>
            </div>
            <div className="stat-card">
              <span className="stat-number" style={{ color: '#facc15' }}>{stats.byStatus.circulating}</span>
              <span className="stat-label">Circulando</span>
            </div>
          </div>

          <div className="content-header">
            <span className="results-count">{filteredRumors.length} rumores encontrados</span>
            <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
              <option value="recent">Mais Recente</option>
              <option value="reliable">Mais Confiável</option>
              <option value="sources">Mais Fontes</option>
            </select>
          </div>

          <div className="rumors-grid">
            {paginatedRumors.map(rumor => (
              <div key={rumor.id} className="rumor-card">
                <div className="rumor-header">
                  <span className={`rumor-status ${getStatusColor(rumor.status)}`}>
                    {rumor.status === 'all' ? 'Todos' : 
                      rumor.status === 'unverified' ? 'Não Verificado' :
                      rumor.status === 'circulating' ? 'Circulando' :
                      rumor.status === 'likely' ? 'Provável' : 'Confirmado'}
                  </span>
                  <span className="rumor-confidence" style={{ color: getConfidenceColor(rumor.confidence) }}>
                    {rumor.confidence === 'low' ? 'Baixa' : rumor.confidence === 'medium' ? 'Média' : 'Alta'}
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

          {filteredRumors.length === 0 && (
            <div className="empty-state">
              <p>Nenhum rumor encontrado com os filtros selecionados.</p>
            </div>
          )}

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
      </section>

      <style jsx>{`
        .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
        .mb-6 { margin-bottom: 1.5rem; }
        .mb-2 { margin-bottom: 0.5rem; }

        .search-container {
          position: relative;
          margin-bottom: 1.5rem;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          width: 20px;
          height: 20px;
          color: var(--text-muted);
        }

        .search-input {
          width: 100%;
          padding: 1rem 1rem 1rem 3rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 12px;
          color: var(--text-primary);
          font-size: 1rem;
          font-family: inherit;
          transition: border-color 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: var(--accent);
        }

        .search-input::placeholder {
          color: var(--text-muted);
        }

        .pickers-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
        }

        @media (max-width: 640px) {
          .pickers-row {
            grid-template-columns: repeat(3, 1fr);
            gap: 0.5rem;
          }
        }

        .picker-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
        }

        .picker-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
          font-weight: 600;
        }

        .picker-container {
          height: 48px;
          overflow-y: scroll;
          scroll-snap-type: y mandatory;
          scrollbar-width: none;
          -ms-overflow-style: none;
          position: relative;
          width: 100%;
          mask-image: linear-gradient(to bottom, 
            transparent 0%, 
            black 20%, 
            black 80%, 
            transparent 100%
          );
          -webkit-mask-image: linear-gradient(to bottom, 
            transparent 0%, 
            black 20%, 
            black 80%, 
            transparent 100%
          );
        }

        .picker-container::-webkit-scrollbar {
          display: none;
        }

        .picker-item {
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          scroll-snap-align: start;
          color: var(--text-muted);
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border-radius: 8px;
        }

        .picker-item:hover {
          color: var(--text-secondary);
        }

        .picker-item.active {
          color: var(--accent);
          font-weight: 600;
          font-size: 1rem;
        }

        .picker-indicator {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: calc(100% - 1rem);
          height: 48px;
          border: 2px solid var(--accent);
          border-radius: 8px;
          pointer-events: none;
          opacity: 0.3;
        }

        .content-area {
          min-width: 0;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        @media (max-width: 640px) {
          .stats-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 0.5rem;
          }
        }

        .stat-card {
          background: var(--bg-secondary);
          border-radius: 10px;
          padding: 1rem 0.5rem;
          text-align: center;
        }

        .stat-number {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }

        .stat-label {
          font-size: 0.65rem;
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

        .sort-select {
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
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
        }

        .rumor-card {
          background: var(--bg-secondary);
          border-radius: 12px;
          padding: 1.25rem;
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

        .empty-state {
          text-align: center;
          padding: 3rem;
          color: var(--text-secondary);
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
        .text-text-secondary { color: var(--text-secondary); }
      `}</style>
    </main>
  );
}
