'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWatchProgress, type WatchProgress, type BingeSettings } from '@/hooks/useWatchProgress';

interface Episode {
  id: number;
  number: number;
  title?: string;
  thumbnail?: string;
  duration?: number;
}

interface BingeModeOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  anime: {
    id: number;
    title: string;
    image?: string;
    episodes?: number;
  };
  episodes: Episode[];
  currentEpisode: number;
  onEpisodeChange: (episode: Episode) => void;
  onComplete?: () => void;
}

// Animation variants
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const panelVariants = {
  hidden: { opacity: 0, y: 50, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: 'spring' as const, damping: 25, stiffness: 300 }
  },
  exit: { opacity: 0, y: 50, scale: 0.95 },
};

const timerVariants = {
  pulse: {
    scale: [1, 1.05, 1],
    transition: { duration: 1, repeat: Infinity }
  }
};

// Status badge colors
const statusColors = {
  watching: 'bg-otaku-accent',
  completed: 'bg-green-600',
  paused: 'bg-yellow-600',
};

const statusLabels = {
  watching: 'Assistindo',
  completed: 'Completo',
  paused: 'Pausado',
};

// Format time helper
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Timer countdown component
function TimerCountdown({ 
  seconds, 
  onComplete,
  isPaused 
}: { 
  seconds: number; 
  onComplete: () => void;
  isPaused: boolean;
}) {
  const [timeLeft, setTimeLeft] = useState(seconds);

  useEffect(() => {
    if (isPaused || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, timeLeft, onComplete]);

  // Reset when seconds prop changes
  useEffect(() => {
    setTimeLeft(seconds);
  }, [seconds]);

  return (
    <motion.div 
      variants={timerVariants}
      animate={!isPaused && timeLeft > 0 ? 'pulse' : ''}
      className="text-center"
    >
      <p className="text-sm text-otaku-text-secondary mb-1">Próximo episódio em</p>
      <p className="text-4xl font-bold text-white font-mono">
        {timeLeft}
      </p>
      <p className="text-xs text-otaku-text-muted mt-1">segundos</p>
    </motion.div>
  );
}

// Progress bar component
function ProgressBar({ 
  current, 
  total, 
  progress 
}: { 
  current: number; 
  total: number; 
  progress: number;
}) {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-otaku-text-secondary mb-1">
        <span>Episódio {current} de {total}</span>
        <span>{Math.round(percentage)}%</span>
      </div>
      <div className="h-2 bg-otaku-bg-tertiary rounded-full overflow-hidden">
        <motion.div 
          className="h-full bg-otaku-accent rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      {progress > 0 && (
        <p className="text-xs text-otaku-text-muted mt-1">
          {Math.round(progress)}% assistido
        </p>
      )}
    </div>
  );
}

export function BingeModeOverlay({
  isOpen,
  onClose,
  anime,
  episodes,
  currentEpisode,
  onEpisodeChange,
  onComplete,
}: BingeModeOverlayProps) {
  const {
    progress,
    bingeSettings,
    saveProgress,
    getProgressForAnime,
    getNextEpisode,
    markAsCompleted,
    pauseBinge,
    updateBingeSettings,
  } = useWatchProgress();

  const [isBingeActive, setIsBingeActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  const [localTimer, setLocalTimer] = useState(bingeSettings.timer_seconds);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Get current episode progress
  const currentProgress = progress.find(
    p => p.anime_id === anime.id && p.episode_number === currentEpisode
  );

  // Get all progress for this anime
  const animeProgress = getProgressForAnime(anime.id);

  // Calculate progress percentage
  const progressPercentage = currentProgress 
    ? (currentProgress.timestamp_seconds / (currentProgress.duration_seconds || 1)) * 100 
    : 0;

  // Handle episode completion
  const handleEpisodeComplete = useCallback(async () => {
    const currentEp = episodes.find(e => e.number === currentEpisode);
    if (!currentEp) return;

    // Mark current as completed
    await markAsCompleted(currentEp.id, anime.id, currentEpisode);

    // Find next episode
    const nextEp = episodes.find(e => e.number === currentEpisode + 1);
    
    if (nextEp) {
      // Auto-advance if enabled
      if (bingeSettings.auto_advance) {
        onEpisodeChange(nextEp);
        
        // Start timer for next episode if enabled
        if (bingeSettings.auto_play) {
          setIsBingeActive(true);
        }
      }
    } else {
      // No more episodes - complete binge
      setIsBingeActive(false);
      onComplete?.();
    }
  }, [currentEpisode, episodes, anime.id, bingeSettings, markAsCompleted, onEpisodeChange, onComplete]);

  // Handle timer completion
  const handleTimerComplete = useCallback(() => {
    const nextEp = episodes.find(e => e.number === currentEpisode + 1);
    if (nextEp) {
      onEpisodeChange(nextEp);
    }
  }, [currentEpisode, episodes, onEpisodeChange]);

  // Pause binge mode
  const handlePauseBinge = useCallback(async () => {
    setIsPaused(true);
    setIsBingeActive(false);

    // Save current progress
    const currentEp = episodes.find(e => e.number === currentEpisode);
    if (currentEp) {
      await pauseBinge(
        currentEp.id,
        anime.id,
        currentEpisode,
        currentProgress?.timestamp_seconds || 0,
        currentProgress?.duration_seconds || 0
      );
    }
  }, [currentEpisode, episodes, anime.id, currentProgress, pauseBinge]);

  // Resume binge mode
  const handleResumeBinge = useCallback(() => {
    setIsPaused(false);
    setIsBingeActive(true);
  }, []);

  // Start binge mode
  const handleStartBinge = useCallback(() => {
    setIsBingeActive(true);
    setIsPaused(false);
  }, []);

  // Stop binge mode
  const handleStopBinge = useCallback(() => {
    setIsBingeActive(false);
    setIsPaused(false);
  }, []);

  // Update timer settings
  const handleTimerSettingsChange = useCallback(async (seconds: number) => {
    setLocalTimer(seconds);
    await updateBingeSettings({ timer_seconds: seconds });
  }, [updateBingeSettings]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          variants={panelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="absolute bottom-0 left-0 right-0 bg-otaku-bg-secondary rounded-t-3xl max-h-[85vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-otaku-bg-secondary border-b border-otaku-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img 
                    src={anime.image || '/placeholder.jpg'} 
                    alt={anime.title}
                    className="w-16 h-24 object-cover rounded-lg"
                  />
                  {isBingeActive && !isPaused && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white line-clamp-1">
                    {anime.title}
                  </h2>
                  <p className="text-sm text-otaku-text-secondary">
                    Episódio {currentEpisode}
                    {animeProgress.length > 0 && (
                      <span className="ml-2">
                        • {animeProgress.filter(p => p.status === 'completed').length}/{episodes.length} completos
                      </span>
                    )}
                  </p>
                  {/* Status Badge */}
                  {currentProgress && (
                    <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full text-white ${statusColors[currentProgress.status]}`}>
                      {statusLabels[currentProgress.status]}
                    </span>
                  )}
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-otaku-text-secondary hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="px-4 py-3 border-b border-otaku-border">
            <ProgressBar 
              current={currentEpisode} 
              total={episodes.length || anime.episodes || 0}
              progress={progressPercentage}
            />
          </div>

          {/* Timer Section */}
          {(isBingeActive || showTimerSettings) && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 py-4 border-b border-otaku-border bg-otaku-bg-tertiary/50"
            >
              {isBingeActive && !isPaused ? (
                <TimerCountdown 
                  seconds={localTimer}
                  onComplete={handleTimerComplete}
                  isPaused={isPaused}
                />
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-otaku-text-secondary">
                    Tempo entre episódios:
                  </p>
                  <div className="flex gap-2">
                    {[5, 10, 15, 30].map((seconds) => (
                      <button
                        key={seconds}
                        onClick={() => handleTimerSettingsChange(seconds)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          localTimer === seconds
                            ? 'bg-otaku-accent text-white'
                            : 'bg-otaku-bg-tertiary text-otaku-text-secondary hover:text-white'
                        }`}
                      >
                        {seconds}s
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="p-4 space-y-3">
            {!isBingeActive ? (
              <motion.button
                onClick={handleStartBinge}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 bg-otaku-accent hover:bg-otaku-accent-hover text-white font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Iniciar Modo Maratona
              </motion.button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {isPaused ? (
                  <motion.button
                    onClick={handleResumeBinge}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="col-span-2 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl"
                  >
                    ▶ Continuar Maratona
                  </motion.button>
                ) : (
                  <>
                    <motion.button
                      onClick={handlePauseBinge}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="py-4 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-xl"
                    >
                      ⏸ Pausar
                    </motion.button>
                    <motion.button
                      onClick={handleStopBinge}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="py-4 bg-otaku-bg-tertiary hover:bg-otaku-border text-white font-semibold rounded-xl"
                    >
                      ⏹ Parar
                    </motion.button>
                  </>
                )}
              </div>
            )}

            {/* Secondary Actions */}
            <div className="flex gap-3">
              <motion.button
                onClick={() => setShowTimerSettings(!showTimerSettings)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 py-3 bg-otaku-bg-tertiary hover:bg-otaku-border text-otaku-text-secondary font-medium rounded-xl text-sm"
              >
                ⚙ Timer ({localTimer}s)
              </motion.button>
              <motion.button
                onClick={handleEpisodeComplete}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl text-sm"
              >
                ✓ Marcar Completo
              </motion.button>
            </div>
          </div>

          {/* Episode List */}
          <div className="p-4 border-t border-otaku-border">
            <h3 className="text-sm font-semibold text-otaku-text-secondary mb-3">
              Episódios
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {episodes.map((ep) => {
                const epProgress = progress.find(
                  p => p.anime_id === anime.id && p.episode_number === ep.number
                );
                const isCurrent = ep.number === currentEpisode;
                const isCompleted = epProgress?.status === 'completed';

                return (
                  <button
                    key={ep.id}
                    onClick={() => onEpisodeChange(ep)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg flex items-center justify-center relative overflow-hidden transition-all ${
                      isCurrent 
                        ? 'ring-2 ring-otaku-accent' 
                        : 'opacity-70 hover:opacity-100'
                    } ${
                      isCompleted 
                        ? 'bg-green-900/50' 
                        : 'bg-otaku-bg-tertiary'
                    }`}
                  >
                    {ep.thumbnail && (
                      <img 
                        src={ep.thumbnail} 
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                    <span className={`relative z-10 text-sm font-bold ${
                      isCurrent ? 'text-white' : 'text-otaku-text-secondary'
                    }`}>
                      {ep.number}
                    </span>
                    {isCompleted && (
                      <div className="absolute top-1 right-1 w-3 h-3 bg-green-500 rounded-full" />
                    )}
                    {epProgress && !isCompleted && epProgress.status === 'paused' && (
                      <div className="absolute bottom-1 left-1 right-1 h-1 bg-yellow-500 rounded-full">
                        <div 
                          className="h-full bg-yellow-400 rounded-full"
                          style={{ 
                            width: `${(epProgress.timestamp_seconds / (epProgress.duration_seconds || 1)) * 100}%` 
                          }}
                        />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default BingeModeOverlay;
