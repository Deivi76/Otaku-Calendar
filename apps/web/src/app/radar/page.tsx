'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { Header } from '@/components/Header';

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

const MEDIA_TYPES: { value: MediaType; label: string; icon: string }[] = [
  { value: 'anime', label: 'Anime', icon: '🎬' },
  { value: 'manga', label: 'Manga', icon: '📚' },
  { value: 'manhwa', label: 'Manhwa', icon: '📖' },
  { value: 'live_action', label: 'Live Action', icon: '🎭' },
  { value: 'film', label: 'Filme', icon: '🎥' },
];

const STATUS_OPTIONS: { value: RumorStatus; label: string; color: string }[] = [
  { value: 'all', label: 'Todos', color: '#a1a1a1' },
  { value: 'unverified', label: 'Não Verificado', color: '#6b7280' },
  { value: 'circulating', label: 'Circulando', color: '#fbbf24' },
  { value: 'likely', label: 'Provável', color: '#60a5fa' },
  { value: 'confirmed', label: 'Confirmado', color: '#4ade80' },
];

const CONFIDENCE_OPTIONS: { value: ConfidenceLevel; label: string; color: string }[] = [
  { value: 'low', label: 'Baixa', color: '#f87171' },
  { value: 'medium', label: 'Média', color: '#facc15' },
  { value: 'high', label: 'Alta', color: '#4ade80' },
];

// Tab Filter Component
function FilterTabs<T extends string>({
  options,
  selectedValue,
  onChange,
}: {
  options: { value: T; label: string; icon?: string; color?: string }[];
  selectedValue: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {options.map((option) => {
        const isActive = selectedValue === option.value;
        return (
          <motion.button
            key={option.value}
            onClick={() => onChange(option.value as T)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
              transition-all duration-300 whitespace-nowrap
              ${isActive 
                ? 'bg-[#ff4d00] text-white shadow-lg shadow-orange-500/30' 
                : 'bg-[#121212] text-[#a1a1a1] border border-[#262626] hover:border-[#ff4d00]/50'
              }
            `}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {option.icon && <span>{option.icon}</span>}
            {option.label}
          </motion.button>
        );
      })}
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

  const getStatusInfo = (status: RumorStatus) => {
    return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
  };

  const getConfidenceInfo = (confidence: ConfidenceLevel) => {
    return CONFIDENCE_OPTIONS.find(c => c.value === confidence) || CONFIDENCE_OPTIONS[0];
  };

  return (
    <main className="relative min-h-screen bg-[#050505]">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#050505] via-[#0a0a0a] to-[#050505]" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#ff4d00]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>
      
      <Header showSearch />

      <section className="py-8 container relative z-10">
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
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              Radar Otaku
            </h1>
          </div>
          <p className="text-[#a1a1a1] text-lg">
            Fique por dentro dos últimos rumores, anúncios e confirmações do mundo otaku.
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative mb-6"
        >
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#525252]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="w-full pl-12 pr-4 py-4 bg-[#121212] border border-[#262626] rounded-xl text-white placeholder-[#525252] focus:border-[#ff4d00] focus:outline-none transition-colors"
            placeholder="Buscar rumores..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="mb-4">
            <span className="text-xs font-semibold text-[#525252] uppercase tracking-wider mb-2 block">Tipo de Mídia</span>
            <FilterTabs
              options={MEDIA_TYPES}
              selectedValue={selectedType}
              onChange={(v) => { setSelectedType(v as MediaType); setCurrentPage(1); }}
            />
          </div>
          
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <span className="text-xs font-semibold text-[#525252] uppercase tracking-wider mb-2 block">Status</span>
              <FilterTabs
                options={STATUS_OPTIONS}
                selectedValue={selectedStatus}
                onChange={(v) => { setSelectedStatus(v as RumorStatus); setCurrentPage(1); }}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <span className="text-xs font-semibold text-[#525252] uppercase tracking-wider mb-2 block">Confiança</span>
              <FilterTabs
                options={CONFIDENCE_OPTIONS}
                selectedValue={selectedConfidence}
                onChange={(v) => { setSelectedConfidence(v as ConfidenceLevel); setCurrentPage(1); }}
              />
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8"
        >
          <div className="bg-[#121212] rounded-xl p-4 border border-[#262626]">
            <div className="text-2xl font-bold text-white mb-1">{stats.total}</div>
            <div className="text-xs text-[#525252] uppercase tracking-wider">Total</div>
          </div>
          <div className="bg-[#121212] rounded-xl p-4 border border-[#262626]">
            <div className="text-2xl font-bold text-green-400 mb-1">{stats.byStatus.confirmed}</div>
            <div className="text-xs text-[#525252] uppercase tracking-wider">Confirmados</div>
          </div>
          <div className="bg-[#121212] rounded-xl p-4 border border-[#262626]">
            <div className="text-2xl font-bold text-blue-400 mb-1">{stats.byStatus.likely}</div>
            <div className="text-xs text-[#525252] uppercase tracking-wider">Prováveis</div>
          </div>
          <div className="bg-[#121212] rounded-xl p-4 border border-[#262626]">
            <div className="text-2xl font-bold text-yellow-400 mb-1">{stats.byStatus.circulating}</div>
            <div className="text-xs text-[#525252] uppercase tracking-wider">Circulando</div>
          </div>
        </motion.div>

        {/* Results Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-between mb-6"
        >
          <span className="text-[#a1a1a1]">
            {filteredRumors.length} rumores encontrados
          </span>
          <select 
            className="bg-[#121212] border border-[#262626] rounded-lg px-4 py-2 text-white text-sm focus:border-[#ff4d00] focus:outline-none"
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as SortBy)}
          >
            <option value="recent">Mais Recente</option>
            <option value="reliable">Mais Confiável</option>
            <option value="sources">Mais Fontes</option>
          </select>
        </motion.div>

        {/* Rumors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedRumors.map((rumor, index) => (
            <motion.div
              key={rumor.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="group bg-[#121212] rounded-xl p-5 border border-[#262626] hover:border-[#ff4d00]/50 transition-all duration-300 cursor-pointer">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <span 
                    className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md"
                    style={{ 
                      backgroundColor: `${getStatusInfo(rumor.status).color}20`,
                      color: getStatusInfo(rumor.status).color
                    }}
                  >
                    {getStatusInfo(rumor.status).label}
                  </span>
                  <span 
                    className="text-xs font-semibold"
                    style={{ color: getConfidenceInfo(rumor.confidence).color }}
                  >
                    {getConfidenceInfo(rumor.confidence).label}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#ff4d00] transition-colors">
                  {rumor.title}
                </h3>

                {/* Description */}
                <p className="text-[#a1a1a1] text-sm mb-4 line-clamp-2">
                  {rumor.description}
                </p>

                {/* Meta */}
                <div className="flex items-center gap-3 text-xs text-[#525252]">
                  <span className="px-2 py-0.5 bg-[#1a1a1a] rounded capitalize">
                    {rumor.mediaType.replace('_', ' ')}
                  </span>
                  <span>{new Date(rumor.date).toLocaleDateString('pt-BR')}</span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {rumor.sources}
                  </span>
                </div>

                {/* Hover Effect */}
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="absolute -inset-1 bg-[#ff4d00]/10 blur-xl" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredRumors.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-[#a1a1a1] text-lg">Nenhum rumor encontrado com os filtros selecionados.</p>
          </motion.div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex justify-center gap-2 mt-8"
          >
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-[#121212] border border-[#262626] rounded-lg text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#ff4d00] transition-colors"
            >
              Anterior
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-10 h-10 rounded-lg text-sm font-semibold transition-all ${
                  currentPage === i + 1 
                    ? 'bg-[#ff4d00] text-white' 
                    : 'bg-[#121212] border border-[#262626] text-white hover:border-[#ff4d00]'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-[#121212] border border-[#262626] rounded-lg text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#ff4d00] transition-colors"
            >
              Próxima
            </button>
          </motion.div>
        )}
      </section>
    </main>
  );
}