'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HeroBanner, 
  CategorySection, 
  SkeletonCard,
  AnimeBottomSheet,
  EmptyState,
  type Anime,
  type AnimeType
} from '@/components/AnimeCatalog';
import { RecommendationCarousel } from '@/components/RecommendationCarousel';
import { ContinueWatching } from '@/components/BingeMode';
import { useAnimeData, useAnimeSchedule, type AnimeSchedule, type ScheduledAnime, type AnimeData } from '@/hooks';

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const DAY_MAP: Record<number, keyof AnimeSchedule> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday'
};

const CATEGORY_TITLES: Record<string, string> = {
  em_alta: 'Em Alta',
  lancamentos: 'Lançamentos da Temporada',
  episodios: 'Episódios Recentes',
  filmes: 'Filmes de Anime',
  series: 'Séries de TV',
  donghua: 'Donghua (Chinês)',
  manhwa: 'Manhwa (Coreano)',
  live_action: 'Live Actions',
  shonen: 'Shonen',
  shojo: 'Shojo',
  isekai: 'Isekai',
  mecha: 'Mecha',
  japanese: 'Animes Japonês'
};

// Safe type casting helper
const safeType = (type: string | undefined): AnimeType => {
  const validTypes: AnimeType[] = ['TV', 'MOVIE', 'OVA', 'ONA', 'SPECIAL', 'MUSIC'];
  return validTypes.includes(type as AnimeType) ? type as AnimeType : 'TV';
};

const safeStatus = (status: string | undefined): 'airing' | 'finished' | 'upcoming' => {
  const validStatuses: ('airing' | 'finished' | 'upcoming')[] = ['airing', 'finished', 'upcoming'];
  return validStatuses.includes(status as 'airing' | 'finished' | 'upcoming') ? status as 'airing' | 'finished' | 'upcoming' : 'finished';
};

function mapAnimeDataToAnime(animeData: AnimeData): Anime {
  if (!animeData) return null as unknown as Anime;
  return {
    id: String(animeData.mal_id),
    title: animeData.title,
    titleEnglish: animeData.title_english,
    description: animeData.synopsis,
    image: animeData.images?.jpg?.large_image_url || animeData.images?.jpg?.image_url,
    cover: animeData.images?.jpg?.large_image_url || animeData.images?.jpg?.image_url,
    type: safeType(animeData.type),
    episodes: animeData.episodes,
    score: animeData.score,
    status: safeStatus(animeData.status),
    year: undefined,
    season: undefined,
    genres: animeData.genres?.map((g) => g.name) || [],
    synopsis: animeData.synopsis,
    url: undefined
  };
}

// Page variants for staggered animation
const pageVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function Home() {
  const { data: animeData, source, isLoading } = useAnimeData();
  const { schedule, isLoading: scheduleLoading } = useAnimeSchedule();
  
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const today = new Date().getDay();
  
  const mappedAnimeData = useMemo((): Anime[] => {
    if (!animeData) return [];
    return animeData.map(mapAnimeDataToAnime).filter((a): a is Anime => Boolean(a));
  }, [animeData]);

  const featuredAnime = mappedAnimeData[0];

  const filteredAnimes = useMemo(() => {
    const animes = mappedAnimeData;
    return {
      em_alta: animes.slice(0, 10),
      lancamentos: animes.filter((a) => a.status === 'airing').slice(0, 10),
      episodios: animes.slice(5, 15),
      filmes: animes.filter((a) => a.type === 'MOVIE').slice(0, 10),
      series: animes.filter((a) => a.type === 'TV').slice(0, 10),
      donghua: animes.slice(10, 20),
      manhwa: animes.slice(15, 25),
      live_action: animes.slice(20, 30),
      shonen: animes.filter((a) => a.genres?.includes('Shounen')).slice(0, 10),
      shojo: animes.filter((a) => a.genres?.includes('Shoujo')).slice(0, 10),
      isekai: animes.filter((a) => a.genres?.includes('Isekai')).slice(0, 10),
      mecha: animes.filter((a) => a.genres?.includes('Mecha')).slice(0, 10),
      japanese: animes.slice(0, 10),
    };
  }, [mappedAnimeData]);

  const getEventsForDay = (dayIndex: number): ScheduledAnime[] => {
    if (!schedule) return [];
    const dayKey = DAY_MAP[dayIndex];
    return schedule[dayKey] || [];
  };

  const handleAnimeClick = (anime: Anime) => {
    setSelectedAnime(anime);
    setIsBottomSheetOpen(true);
  };

  const handleBottomSheetClose = () => {
    setIsBottomSheetOpen(false);
    setSelectedAnime(null);
  };

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <motion.main 
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen"
    >
      {/* Header */}
      <motion.header variants={sectionVariants} className="header">
        <div className="container flex items-center justify-between">
          <Link href="/" className="logo flex items-center gap-2">
            <span className="text-2xl">🎬</span>
            <span className="hidden sm:inline">Otaku Calendar</span>
            <span className="sm:hidden">OC</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm font-medium hover:text-otaku-accent transition-colors">
              Calendário
            </Link>
            <Link href="/radar" className="text-sm font-medium hover:text-otaku-accent transition-colors">
              Radar Otaku
            </Link>
            <Link href="/favorites" className="text-sm font-medium hover:text-otaku-accent transition-colors">
              Favoritos
            </Link>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
              className="flex items-center gap-2 px-3 py-1.5 bg-otaku-bg-tertiary rounded-lg border border-otaku-border hover:border-otaku-accent transition-colors"
            >
              <svg className="w-4 h-4 text-otaku-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" strokeWidth="2" />
                <path strokeWidth="2" strokeLinecap="round" d="m21 21-4.3-4.3" />
              </svg>
              <span className="text-sm text-otaku-text-secondary">Buscar</span>
              <kbd className="hidden lg:inline-flex px-1.5 py-0.5 text-xs bg-otaku-bg-secondary rounded border border-otaku-border">
                ⌘K
              </kbd>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="login-btn"
            >
              Login
            </motion.button>
          </nav>

          {/* Mobile Menu Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="md:hidden p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </motion.button>
        </div>

          {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-otaku-border mt-4"
            >
              <div className="container py-4 flex flex-col gap-4">
                <Link href="/" className="text-sm font-medium hover:text-otaku-accent transition-colors">
                  Calendário
                </Link>
                <Link href="/radar" className="text-sm font-medium hover:text-otaku-accent transition-colors">
                  Radar Otaku
                </Link>
                <Link href="/favorites" className="text-sm font-medium hover:text-otaku-accent transition-colors">
                  Favoritos
                </Link>
                <button 
                  onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
                  className="flex items-center gap-2 px-3 py-2 bg-otaku-bg-tertiary rounded-lg border border-otaku-border"
                >
                  <svg className="w-4 h-4 text-otaku-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" strokeWidth="2" />
                    <path strokeWidth="2" strokeLinecap="round" d="m21 21-4.3-4.3" />
                  </svg>
                  <span className="text-sm text-otaku-text-secondary">Buscar (⌘K)</span>
                </button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  className="login-btn w-full justify-center"
                >
                  Login
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Calendar Section */}
      <motion.section variants={sectionVariants} className="container py-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-1 h-8 bg-otaku-accent rounded-full" />
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Calendário Semanal
          </h1>
        </div>
        
        <div className="week-grid overflow-x-auto">
          {DAYS.map((day, index) => (
            <motion.div
              key={day}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="day-column min-w-[140px] md:min-w-0"
            >
              <div className={`day-header ${index === today ? 'today' : ''}`}>
                {day}
              </div>
              <div className="day-content min-h-[120px]">
                {scheduleLoading ? (
                  <div className="space-y-2">
                    <SkeletonCard />
                  </div>
                ) : (
                  getEventsForDay(index).map((event, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ scale: 1.02 }}
                      className="episode-card"
                    >
                      <div className="episode-title">{event.title}</div>
                      {event.time && (
                        <div className="episode-number">{event.time}</div>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Continue Watching Section */}
      <ContinueWatching onAnimeClick={handleAnimeClick} isLoading={isLoading} />

      {/* Offline Banner */}
      <motion.div variants={sectionVariants}>
        {/* This would be rendered if source === 'indexeddb' */}
      </motion.div>

      {isLoading ? (
        <div className="container">
          <section className="mb-12">
            <SkeletonCard withDetails />
          </section>
          <CategorySection
            title="Em Alta"
            animeList={[]}
            isLoading={true}
            onAnimeClick={handleAnimeClick}
          />
          <CategorySection
            title="Lançamentos da Temporada"
            animeList={[]}
            isLoading={true}
            onAnimeClick={handleAnimeClick}
          />
          <CategorySection
            title="Episódios Recentes"
            animeList={[]}
            isLoading={true}
            onAnimeClick={handleAnimeClick}
          />
          <CategorySection
            title="Filmes de Anime"
            animeList={[]}
            isLoading={true}
            onAnimeClick={handleAnimeClick}
          />
          <CategorySection
            title="Séries de TV"
            animeList={[]}
            isLoading={true}
            onAnimeClick={handleAnimeClick}
          />
        </div>
      ) : !mappedAnimeData.length ? (
        <div className="container">
          <EmptyState />
        </div>
      ) : (
        <>
          {/* Hero Banner */}
          <motion.div variants={sectionVariants}>
            <HeroBanner 
              anime={featuredAnime}
              onInfoClick={() => handleAnimeClick(featuredAnime)}
            />
          </motion.div>

          {/* Personalized Recommendations */}
          <div className="container">
            <RecommendationCarousel
              title="Para Você"
              limit={12}
              onAnimeClick={handleAnimeClick}
            />
          </div>

          {/* Category Sections */}
          <div className="container pb-16">
            <CategorySection
              title="Em Alta"
              animeList={filteredAnimes.em_alta}
              onAnimeClick={handleAnimeClick}
            />

            <CategorySection
              title="Lançamentos da Temporada"
              animeList={filteredAnimes.lancamentos}
              onAnimeClick={handleAnimeClick}
            />

            <CategorySection
              title="Episódios Recentes"
              animeList={filteredAnimes.episodios}
              onAnimeClick={handleAnimeClick}
            />

            <CategorySection
              title="Filmes de Anime"
              animeList={filteredAnimes.filmes}
              onAnimeClick={handleAnimeClick}
            />

            <CategorySection
              title="Séries de TV"
              animeList={filteredAnimes.series}
              onAnimeClick={handleAnimeClick}
            />

            <CategorySection
              title="Donghua (Chinês)"
              animeList={filteredAnimes.donghua}
              onAnimeClick={handleAnimeClick}
            />

            <CategorySection
              title="Manhwa (Coreano)"
              animeList={filteredAnimes.manhwa}
              onAnimeClick={handleAnimeClick}
            />

            <CategorySection
              title="Live Actions"
              animeList={filteredAnimes.live_action}
              onAnimeClick={handleAnimeClick}
            />

            <CategorySection
              title="Shonen"
              animeList={filteredAnimes.shonen}
              onAnimeClick={handleAnimeClick}
            />

            <CategorySection
              title="Shojo"
              animeList={filteredAnimes.shojo}
              onAnimeClick={handleAnimeClick}
            />

            <CategorySection
              title="Isekai"
              animeList={filteredAnimes.isekai}
              onAnimeClick={handleAnimeClick}
            />

            <CategorySection
              title="Mecha"
              animeList={filteredAnimes.mecha}
              onAnimeClick={handleAnimeClick}
            />

            <CategorySection
              title="Animes Japonês"
              animeList={filteredAnimes.japanese}
              onAnimeClick={handleAnimeClick}
            />
          </div>
        </>
      )}

      {/* Footer */}
      <motion.footer variants={sectionVariants} className="border-t border-otaku-border py-8">
        <div className="container text-center">
          <p className="text-sm text-otaku-text-secondary">
            © 2024 Otaku Calendar. Todos os direitos reservados.
          </p>
        </div>
      </motion.footer>

      {/* Bottom Sheet */}
      <AnimeBottomSheet
        anime={selectedAnime}
        isOpen={isBottomSheetOpen}
        onClose={handleBottomSheetClose}
      />
    </motion.main>
  );
}
