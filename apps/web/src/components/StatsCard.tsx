'use client';

import { motion } from 'framer-motion';
import type { UserStats, CommunityStats } from '@/hooks/useUserStats';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'accent' | 'success' | 'warning';
  loading?: boolean;
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  variant = 'default',
  loading = false,
}: StatsCardProps) {
  const variantStyles = {
    default: 'bg-[var(--color-otaku-bg-secondary)] border-[var(--color-otaku-border)]',
    accent: 'bg-[var(--color-otaku-accent)]/10 border-[var(--color-otaku-accent)]/30',
    success: 'bg-[var(--color-otaku-success)]/10 border-[var(--color-otaku-success)]/30',
    warning: 'bg-[var(--color-otaku-warning)]/10 border-[var(--color-otaku-warning)]/30',
  };

  const iconColors = {
    default: 'text-[var(--color-otaku-accent)]',
    accent: 'text-[var(--color-otaku-accent)]',
    success: 'text-[var(--color-otaku-success)]',
    warning: 'text-[var(--color-otaku-warning)]',
  };

  if (loading) {
    return (
      <div
        className={`p-[var(--spacing-lg)] rounded-[var(--radius-xl)] border ${variantStyles[variant]} relative overflow-hidden`}
      >
        <div className="skeleton-shimmer absolute inset-0" />
        <div className="flex flex-col gap-[var(--spacing-sm)]">
          <div className="h-4 w-24 bg-[var(--color-otaku-bg-tertiary)] rounded animate-pulse" />
          <div className="h-8 w-16 bg-[var(--color-otaku-bg-tertiary)] rounded animate-pulse" />
          <div className="h-3 w-32 bg-[var(--color-otaku-bg-tertiary)] rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`p-[var(--spacing-lg)] rounded-[var(--radius-xl)] border ${variantStyles[variant]} transition-all hover:scale-[1.02] hover:shadow-[var(--shadow-card)]`}
    >
      <div className="flex items-start justify-between mb-[var(--spacing-sm)]">
        <span className="text-[var(--color-otaku-text-secondary)] text-sm font-medium">
          {title}
        </span>
        <span className={`text-2xl ${iconColors[variant]}`}>{icon}</span>
      </div>
      <div className="flex items-baseline gap-[var(--spacing-sm)]">
        <span className="text-3xl font-bold text-[var(--color-otaku-text)]">{value}</span>
        {trend && trendValue && (
          <span
            className={`text-sm font-medium ${
              trend === 'up'
                ? 'text-[var(--color-otaku-success)]'
                : trend === 'down'
                  ? 'text-[var(--color-otaku-error)]'
                  : 'text-[var(--color-otaku-text-secondary)]'
            }`}
          >
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-[var(--color-otaku-text-muted)] text-sm mt-[var(--spacing-xs)]">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
  lastWatchDate: string | null;
  loading?: boolean;
}

export function StreakCard({
  currentStreak,
  longestStreak,
  lastWatchDate,
  loading = false,
}: StreakCardProps) {
  if (loading) {
    return (
      <div className="p-[var(--spacing-lg)] rounded-[var(--radius-xl)] border bg-[var(--color-otaku-bg-secondary)] border-[var(--color-otaku-border)] relative overflow-hidden">
        <div className="skeleton-shimmer absolute inset-0" />
        <div className="flex flex-col gap-[var(--spacing-sm)]">
          <div className="h-4 w-20 bg-[var(--color-otaku-bg-tertiary)] rounded animate-pulse" />
          <div className="h-10 w-24 bg-[var(--color-otaku-bg-tertiary)] rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const isActiveStreak = currentStreak > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="p-[var(--spacing-lg)] rounded-[var(--radius-xl)] border bg-[var(--color-otaku-bg-secondary)] border-[var(--color-otaku-border)] overflow-hidden relative"
    >
      {isActiveStreak && (
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-otaku-accent)]/10 to-transparent pointer-events-none" />
      )}
      <div className="flex items-center justify-between relative">
        <div>
          <p className="text-[var(--color-otaku-text-secondary)] text-sm font-medium mb-1">
            Sequência Atual
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold gradient-text">{currentStreak}</span>
            <span className="text-[var(--color-otaku-text-muted)]">dias</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-3xl">🔥</span>
          {longestStreak > 0 && (
            <p className="text-xs text-[var(--color-otaku-text-secondary)] mt-1">
              Recorde: {longestStreak} dias
            </p>
          )}
        </div>
      </div>
      {lastWatchDate && (
        <p className="text-xs text-[var(--color-otaku-text-muted)] mt-3">
          Última atividade: {new Date(lastWatchDate).toLocaleDateString('pt-BR')}
        </p>
      )}
      {!lastWatchDate && currentStreak === 0 && (
        <p className="text-xs text-[var(--color-otaku-warning)] mt-3">
          Comece a assistir para criar sua sequência!
        </p>
      )}
    </motion.div>
  );
}

interface ComparisonCardProps {
  userValue: number;
  communityValue: number;
  label: string;
  loading?: boolean;
}

export function ComparisonCard({
  userValue,
  communityValue,
  label,
  loading = false,
}: ComparisonCardProps) {
  if (loading) {
    return (
      <div className="p-[var(--spacing-lg)] rounded-[var(--radius-xl)] border bg-[var(--color-otaku-bg-secondary)] border-[var(--color-otaku-border)] relative overflow-hidden">
        <div className="skeleton-shimmer absolute inset-0" />
        <div className="flex flex-col gap-[var(--spacing-sm)]">
          <div className="h-4 w-24 bg-[var(--color-otaku-bg-tertiary)] rounded animate-pulse" />
          <div className="h-6 w-32 bg-[var(--color-otaku-bg-tertiary)] rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const percentAbove = communityValue > 0 
    ? ((userValue - communityValue) / communityValue) * 100 
    : 0;
  const isAbove = userValue >= communityValue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-[var(--spacing-lg)] rounded-[var(--radius-xl)] border bg-[var(--color-otaku-bg-secondary)] border-[var(--color-otaku-border)]"
    >
      <p className="text-[var(--color-otaku-text-secondary)] text-sm font-medium mb-2">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-[var(--color-otaku-text)]">{userValue}</span>
        <span className="text-sm text-[var(--color-otaku-text-muted)]">
          vs {communityValue.toFixed(1)} média
        </span>
      </div>
      <div className="mt-2 flex items-center gap-1">
        <span
          className={`text-sm font-medium ${
            isAbove
              ? 'text-[var(--color-otaku-success)]'
              : 'text-[var(--color-otaku-error)]'
          }`}
        >
          {isAbove ? '↑' : '↓'} {Math.abs(percentAbove).toFixed(1)}%
        </span>
        <span className="text-xs text-[var(--color-otaku-text-muted)]">
          {isAbove ? 'acima' : 'abaixo'} da média
        </span>
      </div>
    </motion.div>
  );
}

interface GenreChartProps {
  genres: Array<{ genre: string; count: number }>;
  userGenres: string[];
  loading?: boolean;
}

export function GenreChart({ genres, userGenres, loading = false }: GenreChartProps) {
  if (loading) {
    return (
      <div className="p-[var(--spacing-lg)] rounded-[var(--radius-xl)] border bg-[var(--color-otaku-bg-secondary)] border-[var(--color-otaku-border)]">
        <div className="h-4 w-32 bg-[var(--color-otaku-bg-tertiary)] rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-4 bg-[var(--color-otaku-bg-tertiary)] rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...genres.map((g) => g.count), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-[var(--spacing-lg)] rounded-[var(--radius-xl)] border bg-[var(--color-otaku-bg-secondary)] border-[var(--color-otaku-border)]"
    >
      <h3 className="text-[var(--color-otaku-text)] font-semibold mb-4">
        Gêneros Preferidos
      </h3>
      <div className="space-y-3">
        {genres.length === 0 ? (
          <p className="text-[var(--color-otaku-text-muted)] text-sm">
            Adicione favoritos para ver seus gêneros preferidos
          </p>
        ) : (
          genres.slice(0, 5).map((item, index) => {
            const percentage = (item.count / maxCount) * 100;
            const isUserGenre = userGenres.includes(item.genre);

            return (
              <motion.div
                key={item.genre}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3"
              >
                <span className="text-sm text-[var(--color-otaku-text-secondary)] w-24 truncate">
                  {item.genre}
                </span>
                <div className="flex-1 h-2 bg-[var(--color-otaku-bg-tertiary)] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className={`h-full rounded-full ${
                      isUserGenre
                        ? 'bg-[var(--color-otaku-accent)]'
                        : 'bg-[var(--color-otaku-text-muted)]'
                    }`}
                  />
                </div>
                <span className="text-xs text-[var(--color-otaku-text-muted)] w-8 text-right">
                  {item.count}
                </span>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

interface WeeklyActivityProps {
  history: Array<{
    date: string;
    episodes_watched: number;
    minutes_watched: number;
  }>;
  loading?: boolean;
}

export function WeeklyActivity({ history, loading = false }: WeeklyActivityProps) {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const today = new Date().getDay();

  // Generate last 7 days
  const weekData = days.map((day, index) => {
    const dayIndex = (today - 6 + index + 7) % 7;
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const dateStr = date.toISOString().split('T')[0];
    
    const dayHistory = history.find((h) => h.date === dateStr);
    return {
      day,
      episodes: dayHistory?.episodes_watched || 0,
      minutes: dayHistory?.minutes_watched || 0,
      isToday: index === 6,
    };
  });

  const maxEpisodes = Math.max(...weekData.map((d) => d.episodes), 1);

  if (loading) {
    return (
      <div className="p-[var(--spacing-lg)] rounded-[var(--radius-xl)] border bg-[var(--color-otaku-bg-secondary)] border-[var(--color-otaku-border)]">
        <div className="h-4 w-40 bg-[var(--color-otaku-bg-tertiary)] rounded animate-pulse mb-4" />
        <div className="flex justify-between items-end h-32">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="w-8 bg-[var(--color-otaku-bg-tertiary)] rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-[var(--spacing-lg)] rounded-[var(--radius-xl)] border bg-[var(--color-otaku-bg-secondary)] border-[var(--color-otaku-border)]"
    >
      <h3 className="text-[var(--color-otaku-text)] font-semibold mb-4">
        Atividade da Semana
      </h3>
      <div className="flex justify-between items-end h-32 gap-2">
        {weekData.map((day, index) => {
          const height = day.episodes > 0 ? (day.episodes / maxEpisodes) * 100 : 5;
          
          return (
            <motion.div
              key={day.day}
              initial={{ height: 0 }}
              animate={{ height: `${height}%` }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="flex-1 flex flex-col items-center gap-2"
            >
              <div
                className={`w-full rounded-t-[var(--radius-sm)] transition-all ${
                  day.episodes > 0
                    ? 'bg-[var(--color-otaku-accent)]'
                    : 'bg-[var(--color-otaku-bg-tertiary)]'
                }`}
                style={{
                  minHeight: '8px',
                  boxShadow:
                    day.isToday && day.episodes > 0
                      ? '0 0 10px rgba(255, 107, 53, 0.5)'
                      : 'none',
                }}
              />
              <span
                className={`text-xs ${
                  day.isToday
                    ? 'text-[var(--color-otaku-accent)] font-semibold'
                    : 'text-[var(--color-otaku-text-muted)]'
                }`}
              >
                {day.day}
              </span>
            </motion.div>
          );
        })}
      </div>
      <div className="flex justify-between mt-3 text-xs text-[var(--color-otaku-text-muted)]">
        <span>
          {weekData.reduce((acc, d) => acc + d.episodes, 0)} episódios
        </span>
        <span>
          {Math.floor(weekData.reduce((acc, d) => acc + d.minutes, 0) / 60)}h{' '}
          {weekData.reduce((acc, d) => acc + d.minutes, 0) % 60}min
        </span>
      </div>
    </motion.div>
  );
}

interface SummaryCardProps {
  stats: UserStats | null;
  community: CommunityStats | null;
  summary: {
    favoritesCount: number;
    watchlistCount: number;
    uniqueAnimesWatched: number;
  };
  loading?: boolean;
}

export function SummaryCard({
  stats,
  community,
  summary,
  loading = false,
}: SummaryCardProps) {
  if (loading) {
    return (
      <div className="p-[var(--spacing-lg)] rounded-[var(--radius-xl)] border bg-[var(--color-otaku-bg-secondary)] border-[var(--color-otaku-border)] relative overflow-hidden">
        <div className="skeleton-shimmer absolute inset-0" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center">
              <div className="h-8 w-12 bg-[var(--color-otaku-bg-tertiary)] rounded animate-pulse mx-auto mb-2" />
              <div className="h-3 w-16 bg-[var(--color-otaku-bg-tertiary)] rounded animate-pulse mx-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const timeWatched = stats?.total_minutes_watched || 0;
  const hours = Math.floor(timeWatched / 60);
  const minutes = timeWatched % 60;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="p-[var(--spacing-lg)] rounded-[var(--radius-xl)] border bg-[var(--color-otaku-bg-secondary)] border-[var(--color-otaku-border)]"
    >
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold gradient-text">{summary.favoritesCount}</p>
          <p className="text-xs text-[var(--color-otaku-text-secondary)] mt-1">Favoritos</p>
        </div>
        <div>
          <p className="text-2xl font-bold gradient-text">{summary.watchlistCount}</p>
          <p className="text-xs text-[var(--color-otaku-text-secondary)] mt-1">Watchlist</p>
        </div>
        <div>
          <p className="text-2xl font-bold gradient-text">
            {hours > 0 ? `${hours}h` : ''}{minutes > 0 ? `${minutes}m` : '0m'}
          </p>
          <p className="text-xs text-[var(--color-otaku-text-secondary)] mt-1">Assistido</p>
        </div>
      </div>
    </motion.div>
  );
}
