'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Header } from '@/components/Header';
import { SkeletonCard } from '@/components/AnimeCatalog';
import { AnimeBottomSheet, EmptyState, type Anime, type AnimeType } from '@/components/AnimeCatalog';
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

// Calendar Day Component
function CalendarDay({ day, index, events, isToday, isLoading }: { 
  day: string; 
  index: number; 
  events: ScheduledAnime[]; 
  isToday: boolean;
  isLoading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`
        relative min-w-[140px] md:min-w-0 flex-1
        ${isToday ? 'bg-[#121212]' : 'bg-[#0a0a0a]'}
        transition-colors duration-300
      `}
    >
      {/* Day Header */}
      <motion.div 
        className={`
          py-4 px-3 text-center border-b border-[#262626]
          ${isToday ? 'bg-[#ff4d00] text-white' : 'bg-[#121212] text-white'}
        `}
        whileHover={{ scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 400 }}
      >
        <span className="text-xs font-bold uppercase tracking-widest">{day}</span>
        {isToday && (
          <motion.span
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full"
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.div>
      
      {/* Day Content */}
      <div className="p-2 min-h-[180px] space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            <SkeletonCard />
          </div>
        ) : (
          events.map((event, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 + i * 0.03 }}
              whileHover={{ 
                scale: 1.03, 
                x: 4,
                backgroundColor: '#1a1a1a'
              }}
              className={`
                p-2 rounded-lg bg-[#121212] border-l-2 cursor-pointer
                transition-all duration-200 border-l-[#ff4d00]
              `}
            >
              <div className="text-[11px] font-semibold text-white line-clamp-2 leading-tight">
                {event.title}
              </div>
              {event.time && (
                <div className="text-[10px] text-white/50 mt-1">
                  {event.time}
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Today glow */}
      {isToday && (
        <div className="absolute inset-0 bg-[#ff4d00]/5 pointer-events-none" />
      )}
    </motion.div>
  );
}

export default function Home() {
  const { data: animeData, isLoading } = useAnimeData();
  const { schedule, isLoading: scheduleLoading } = useAnimeSchedule();
  
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

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

  // Scroll progress for cosmic background
  const { scrollYProgress } = useScroll();

  return (
    <motion.main 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[#050505]"
    >
      <Header />

      {/* Calendar Section */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="container py-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <motion.div 
            className="w-1 h-8 bg-[#ff4d00] rounded-full"
            animate={{ 
              boxShadow: ['0 0 10px #ff4d00', '0 0 20px #ff4d00', '0 0 10px #ff4d00']
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Calendário Semanal
          </h1>
        </div>
        
        <motion.div 
          className="overflow-x-auto pb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex gap-0.5 min-w-max rounded-xl overflow-hidden border border-[#262626]">
            {DAYS.map((day, index) => (
              <CalendarDay 
                key={day}
                day={day}
                index={index}
                events={getEventsForDay(index)}
                isToday={index === today}
                isLoading={scheduleLoading}
              />
            ))}
          </div>
        </motion.div>
      </motion.section>

      {/* Continue Watching Section */}
      <ContinueWatching onAnimeClick={handleAnimeClick} isLoading={isLoading} />

      {/* Main Content */}
      {isLoading ? (
        <div className="container">
          <section className="mb-12">
            <SkeletonCard withDetails />
          </section>
          {Object.values(CATEGORY_TITLES).slice(0, 4).map((title) => (
            <div key={title} className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-6 bg-[#ff4d00] rounded-full" />
                <h2 className="text-xl font-bold text-white">{title}</h2>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-[160px] md:w-[180px]">
                    <SkeletonCard />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : !mappedAnimeData.length ? (
        <div className="container py-20">
          <EmptyState />
        </div>
      ) : (
        <>
          {/* Hero Banner */}
          <div className="relative">
            {featuredAnime && (
              <div className="relative w-full h-[70vh] min-h-[600px] overflow-hidden">
                {/* Cosmic Background */}
                <CosmicBackground />
                
                {/* Background Image */}
                <motion.div
                  style={{ 
                    y: useTransform(scrollYProgress, [0, 1], [0, 150]),
                    scale: useTransform(scrollYProgress, [0, 1], [1, 1.1])
                  }}
                  className="absolute inset-0"
                >
                  <img
                    src={featuredAnime.cover || featuredAnime.image}
                    alt={featuredAnime.titleEnglish || featuredAnime.title}
                    className="w-full h-full object-cover"
                  />
                </motion.div>

                {/* Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/20 to-[#050505]" />

                {/* Content */}
                <div className="relative z-10 container h-full flex flex-col justify-end pb-12 md:pb-20">
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="max-w-3xl"
                  >
                    {/* Badges */}
                    <div className="flex items-center gap-3 mb-5">
                      {featuredAnime.type && (
                        <span className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md bg-[#ff4d00] text-white">
                          {featuredAnime.type}
                        </span>
                      )}
                      {featuredAnime.score && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md bg-[#121212]/80 text-yellow-400">
                          ★ {featuredAnime.score}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 leading-[1.05]">
                      {featuredAnime.titleEnglish || featuredAnime.title}
                    </h1>

                    {/* Genres */}
                    {featuredAnime.genres && featuredAnime.genres.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-5">
                        {featuredAnime.genres.slice(0, 4).map((genre) => (
                          <span
                            key={genre}
                            className="px-3 py-1 text-xs font-medium rounded-md bg-white/5 text-white/70 border border-white/10"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Synopsis */}
                    {featuredAnime.synopsis && (
                      <p className="text-white/60 text-sm md:text-base max-w-xl line-clamp-2 md:line-clamp-3 mb-7">
                        {featuredAnime.synopsis}
                      </p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-4">
                      <motion.button
                        onClick={() => handleAnimeClick(featuredAnime)}
                        className="flex items-center gap-2 px-8 py-4 bg-[#ff4d00] text-white font-bold text-sm uppercase tracking-wider rounded-xl"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={{ boxShadow: '0 8px 30px -5px rgba(255, 77, 0, 0.5)' }}
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                        Assistir
                      </motion.button>
                      <motion.button
                        onClick={() => handleAnimeClick(featuredAnime)}
                        className="flex items-center gap-2 px-8 py-4 bg-[#121212]/80 text-white font-bold text-sm uppercase tracking-wider rounded-xl border border-[#262626]"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Mais Info
                      </motion.button>
                    </div>
                  </motion.div>
                </div>

                {/* Scroll Indicator */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
                >
                  <motion.div
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="w-6 h-10 rounded-full border-2 border-white/20 flex justify-center pt-2">
                      <motion.div
                        animate={{ opacity: [1, 0], y: [0, 8] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-1.5 h-3 rounded-full bg-[#ff4d00]"
                      />
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            )}
          </div>

          {/* Personalized Recommendations */}
          <div className="container py-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-6 bg-gradient-to-b from-[#ff4d00] to-[#ff6b3d] rounded-full" />
                <h2 className="text-2xl font-bold text-white">Para Você</h2>
              </div>
            </motion.div>
            <RecommendationCarousel
              title=""
              limit={12}
              onAnimeClick={handleAnimeClick}
            />
          </div>

          {/* Category Sections */}
          <div className="container pb-16">
            {Object.entries(filteredAnimes).map(([key, animes], index) => (
              <motion.section
                key={key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ delay: index * 0.05 }}
                className="mb-12"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-3">
                    <span className="w-1 h-6 bg-[#ff4d00] rounded-full" />
                    {CATEGORY_TITLES[key] || key}
                    <span className="text-sm font-normal text-[#a1a1a1] ml-2">
                      ({animes.length})
                    </span>
                  </h2>
                </div>
                
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                  {animes.map((anime, i) => (
                    <motion.div
                      key={anime.id}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.03 }}
                      className="flex-shrink-0 w-[160px] md:w-[180px] snap-start"
                    >
                      <AnimeCardMini anime={anime} onClick={handleAnimeClick} />
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            ))}
          </div>
        </>
      )}

      {/* Footer */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="border-t border-[#262626] py-8"
      >
        <div className="container text-center">
          <p className="text-sm text-[#a1a1a1]">
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

// Cosmic Background Component
function CosmicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = 600;

    const particles: Array<{
      x: number;
      y: number;
      radius: number;
      vx: number;
      vy: number;
      alpha: number;
      hue: number;
    }> = [];

    const particleCount = Math.floor((canvas.width * canvas.height) / 10000);
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.5 + 0.5,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        alpha: Math.random() * 0.4 + 0.1,
        hue: Math.random() > 0.6 ? 20 : 200 + Math.random() * 80
      });
    }

    let animationId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width * 0.6
      );
      gradient.addColorStop(0, 'rgba(5, 5, 5, 0)');
      gradient.addColorStop(0.5, 'rgba(5, 5, 5, 0.2)');
      gradient.addColorStop(1, 'rgba(5, 5, 5, 0.9)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3);
        glow.addColorStop(0, `hsla(${p.hue}, 100%, 60%, ${p.alpha})`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black" />
    </div>
  );
}

// Mini Card Component for Category Sections
function AnimeCardMini({ anime, onClick }: { anime: Anime; onClick: (anime: Anime) => void }) {
  return (
    <motion.div
      whileHover={{ y: -8 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-xl cursor-pointer group"
      onClick={() => onClick(anime)}
    >
      <div className="aspect-[2/3] relative">
        <img
          src={anime.image || '/placeholder-anime.jpg'}
          alt={anime.titleEnglish || anime.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        
        {/* Type Badge */}
        {anime.type && (
          <div className="absolute top-2 right-2">
            <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-[#ff4d00] text-white">
              {anime.type}
            </span>
          </div>
        )}

        {/* Title */}
        <div className="absolute bottom-0 left-0 right-0 p-2">
          <h3 className="text-xs font-bold text-white line-clamp-2">
            {anime.titleEnglish || anime.title}
          </h3>
          {anime.score && (
            <span className="text-[10px] text-yellow-400">★ {anime.score}</span>
          )}
        </div>
      </div>

      {/* Hover glow */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="absolute -inset-1 bg-[#ff4d00]/20 blur-lg" />
      </div>
    </motion.div>
  );
}