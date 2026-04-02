/**
 * Core Type Definitions for Otaku Calendar
 */

/**
 * Anime entity
 */
export interface Anime {
  id: string;
  mal_id?: number;
  kitsu_id?: number;
  anilist_id?: number;
  title: string;
  title_english?: string;
  title_japanese?: string;
  synopsis?: string;
  type?: AnimeType;
  status?: AnimeStatus;
  episodes?: number;
  duration_minutes?: number;
  score?: number;
  rank?: number;
  popularity?: number;
  rating?: string;
  season?: string;
  season_year?: number;
  source?: string;
  genres?: string[];
  images?: AnimeImages;
  trailer_url?: string;
  url?: string;
  aired_from?: string;
  aired_to?: string;
}

export type AnimeType = 'tv' | 'movie' | 'ova' | 'ona' | 'special' | 'music';
export type AnimeStatus = 'airing' | 'finished' | 'upcoming';

export interface AnimeImages {
  jpg?: {
    image_url?: string;
    small_image_url?: string;
    large_image_url?: string;
  };
  webp?: {
    image_url?: string;
    small_image_url?: string;
    large_image_url?: string;
  };
}

/**
 * User preferences for recommendations
 */
export interface UserPreferences {
  id?: string;
  user_id: string;
  preferred_genres: string[];
  preferred_anime_types: AnimeType[];
  preferred_seasons: string[];
  min_score: number;
  exclude_genres: string[];
  created_at?: string;
  updated_at?: string;
}

/**
 * User rating for an anime
 */
export interface UserRating {
  id?: string;
  user_id: string;
  anime_id: string;
  anime?: Anime;
  rating: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * User favorite anime
 */
export interface UserFavorite {
  id?: string;
  user_id: string;
  anime_id: string;
  anime?: Anime;
  added_at?: string;
}

/**
 * User watchlist item
 */
export interface WatchlistItem {
  id?: string;
  user_id: string;
  anime_id: string;
  anime?: Anime;
  priority: number;
  added_at?: string;
}

/**
 * Schedule related types
 */
export interface AnimeSchedule {
  monday: ScheduledAnime[];
  tuesday: ScheduledAnime[];
  wednesday: ScheduledAnime[];
  thursday: ScheduledAnime[];
  friday: ScheduledAnime[];
  saturday: ScheduledAnime[];
  sunday: ScheduledAnime[];
}

export interface ScheduledAnime {
  id: string;
  mal_id?: number;
  title: string;
  image_url?: string;
  time?: string;
  episodes_aired?: number;
}

/**
 * API Response types
 */
export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Recommendation types
 */
export interface RecommendationResult {
  anime: Anime;
  score: number;
  reasons: RecommendationReason[];
}

export interface RecommendationReason {
  type: 'genre_match' | 'high_rating' | 'similar_users' | 'popular' | 'season_match';
  weight: number;
  description: string;
}

/**
 * User session
 */
export interface UserSession {
  user: {
    id: string;
    email?: string;
    name?: string;
    avatar_url?: string;
  };
  expires_at: number;
}

/**
 * Filter options for anime queries
 */
export interface AnimeFilterOptions {
  type?: AnimeType;
  status?: AnimeStatus;
  genres?: string[];
  season?: string;
  year?: number;
  minScore?: number;
  maxScore?: number;
  orderBy?: 'score' | 'popularity' | 'updated_at' | 'title';
  orderDirection?: 'asc' | 'desc';
}