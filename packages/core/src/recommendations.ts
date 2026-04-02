/**
 * Sistema de Recomendação Personalizado
 * Algoritmo base para recomendações de anime baseadas em:
 * - Gêneros preferidos do usuário
 * - Ratings anteriores
 * - Favoritos
 * - Similaridade com outros usuários
 */

import type { Anime, UserPreferences, UserRating } from './types';

/**
 * Tipo para resultado de recomendação
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
 * Pesos para o algoritmo de recomendação
 */
export const RECOMMENDATION_WEIGHTS = {
  genreMatch: 0.35,
  highRating: 0.30,
  similarUsers: 0.20,
  popularity: 0.10,
  seasonMatch: 0.05,
} as const;

/**
 * Parses genres from database JSON format
 */
function parseGenres(genres: unknown): string[] {
  if (Array.isArray(genres)) {
    return genres.map((g) => 
      typeof g === 'string' ? g : (g as { name?: string }).name || ''
    ).filter(Boolean);
  }
  return [];
}

/**
 * Calculate genre match score between anime and user preferences
 */
export function calculateGenreMatch(
  animeGenres: string[],
  preferredGenres: string[]
): number {
  if (!animeGenres.length || !preferredGenres.length) return 0;
  
  const animeGenreSet = new Set(animeGenres.map(g => g.toLowerCase()));
  const prefGenreSet = new Set(preferredGenres.map(g => g.toLowerCase()));
  
  let matches = 0;
  for (const genre of animeGenreSet) {
    if (prefGenreSet.has(genre)) matches++;
  }
  
  return matches / animeGenres.length;
}

/**
 * Calculate score based on user's high-rated animes
 */
export function calculateRatingScore(
  animeGenres: string[],
  highRatedAnimes: { genres: string[]; rating: number }[]
): number {
  if (!highRatedAnimes.length) return 0;
  
  let totalScore = 0;
  let count = 0;
  
  for (const rated of highRatedAnimes) {
    const ratedGenres = parseGenres(rated.genres);
    const genreOverlap = animeGenres.filter(g => 
      ratedGenres.some(rg => rg.toLowerCase() === g.toLowerCase())
    ).length;
    
    if (genreOverlap > 0) {
      totalScore += (genreOverlap / animeGenres.length) * (rated.rating / 5);
      count++;
    }
  }
  
  return count > 0 ? totalScore / count : 0;
}

/**
 * Calculate popularity score based on score/rank
 */
export function calculatePopularityScore(animeScore: number | null): number {
  if (!animeScore) return 0;
  // Normalize score from 0-10 to 0-1
  return animeScore / 10;
}

/**
 * Calculate season match score
 */
export function calculateSeasonMatch(
  animeSeason: string | null,
  preferredSeasons: string[]
): number {
  if (!animeSeason || !preferredSeasons.length) return 0;
  return preferredSeasons.some(s => s.toLowerCase() === animeSeason.toLowerCase()) ? 1 : 0;
}

/**
 * Main recommendation function
 * Generates personalized recommendations for a user
 */
export function generateRecommendations(
  availableAnimes: Anime[],
  preferences: UserPreferences | null,
  userRatings: UserRating[],
  userFavorites: Anime[],
  limit: number = 10
): RecommendationResult[] {
  // Parse user's high-rated animes for similarity
  const highRatedAnimes = userRatings
    .filter(r => r.rating >= 4)
    .map(r => ({
      genres: r.anime?.genres || [],
      rating: r.rating,
    }));

  // Get preferred genres from multiple sources
  const preferredGenres: string[] = [];
  
  if (preferences?.preferred_genres) {
    preferredGenres.push(...preferences.preferred_genres);
  }
  
  // Add genres from favorites
  for (const fav of userFavorites) {
    if (fav.genres) {
      preferredGenres.push(...fav.genres);
    }
  }
  
  // Add genres from high-rated animes
  for (const rated of highRatedAnimes) {
    const genres = parseGenres(rated.genres);
    preferredGenres.push(...genres);
  }
  
  // Deduplicate
  const uniquePreferredGenres = [...new Set(preferredGenres)];
  
  // Get preferred seasons
  const preferredSeasons = preferences?.preferred_seasons || [];
  
  // Exclude already rated/favorited anime IDs
  const excludedIds = new Set([
    ...userRatings.map(r => r.anime_id),
    ...userFavorites.map(f => f.id),
  ]);

  // Score each anime
  const scoredAnimes: RecommendationResult[] = [];
  
  for (const anime of availableAnimes) {
    // Skip excluded animes
    if (excludedIds.has(anime.id)) continue;
    
    // Skip if score is too low
    if (anime.score && anime.score < 6.0) continue;
    
    const animeGenres = parseGenres(anime.genres);
    
    const reasons: RecommendationReason[] = [];
    
    // Genre match (35%)
    const genreScore = calculateGenreMatch(animeGenres, uniquePreferredGenres);
    if (genreScore > 0) {
      reasons.push({
        type: 'genre_match',
        weight: RECOMMENDATION_WEIGHTS.genreMatch,
        description: `Corresponde aos seus gêneros favoritos`,
      });
    }
    
    // High rating similarity (30%)
    const ratingScore = calculateRatingScore(animeGenres, highRatedAnimes);
    if (ratingScore > 0) {
      reasons.push({
        type: 'high_rating',
        weight: RECOMMENDATION_WEIGHTS.highRating,
        description: `Parecido com animes que você avaliou bem`,
      });
    }
    
    // Popularity (10%)
    const popularityScore = calculatePopularityScore(anime.score ?? null);
    if (popularityScore >= 0.7) {
      reasons.push({
        type: 'popular',
        weight: RECOMMENDATION_WEIGHTS.popularity,
        description: `Popular entre a comunidade`,
      });
    }
    
    // Season match (5%)
    const seasonScore = calculateSeasonMatch(anime.season ?? null, preferredSeasons);
    if (seasonScore > 0) {
      reasons.push({
        type: 'season_match',
        weight: RECOMMENDATION_WEIGHTS.seasonMatch,
        description: `Da temporada que você gosta`,
      });
    }
    
    // Calculate total score
    const totalScore = 
      (genreScore * RECOMMENDATION_WEIGHTS.genreMatch) +
      (ratingScore * RECOMMENDATION_WEIGHTS.highRating) +
      (popularityScore * RECOMMENDATION_WEIGHTS.popularity) +
      (seasonScore * RECOMMENDATION_WEIGHTS.seasonMatch);
    
    // Only include if has at least one reason
    if (reasons.length > 0 || totalScore > 0) {
      scoredAnimes.push({
        anime,
        score: totalScore,
        reasons,
      });
    }
  }
  
  // Sort by score and return top results
  return scoredAnimes
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Get recommendation explanation for UI
 */
export function getRecommendationExplanation(result: RecommendationResult): string {
  if (result.reasons.length === 0) {
    return 'Recomendação baseada na popularidade';
  }
  
  // Return the reason with highest weight
  const topReason = result.reasons.sort((a, b) => b.weight - a.weight)[0];
  
  const reasonLabels: Record<RecommendationReason['type'], string> = {
    genre_match: 'Matched genre preference',
    high_rating: 'Similar to highly rated anime',
    similar_users: 'Popular among users like you',
    popular: 'Highly rated anime',
    season_match: 'From preferred season',
  };
  
  return reasonLabels[topReason.type] || '';
}

/**
 * Filter animes by rating range
 */
export function filterByRatingRange(
  animes: Anime[],
  minRating: number,
  maxRating: number
): Anime[] {
  return animes.filter(anime => {
    const score = anime.score ?? 0;
    return score >= minRating && score <= maxRating;
  });
}

/**
 * Group animes by genre for exploration
 */
export function groupAnimesByGenre(animes: Anime[]): Record<string, Anime[]> {
  const groups: Record<string, Anime[]> = {};
  
  for (const anime of animes) {
    const genres = parseGenres(anime.genres);
    for (const genre of genres) {
      if (!groups[genre]) {
        groups[genre] = [];
      }
      groups[genre].push(anime);
    }
  }
  
  return groups;
}

/**
 * Calculate user's genre preferences from ratings
 */
export function calculateUserGenrePreferences(
  ratings: UserRating[]
): string[] {
  const genreCounts: Record<string, number> = {};
  
  for (const rating of ratings) {
    const genres = parseGenres(rating.anime?.genres);
    for (const genre of genres) {
      genreCounts[genre] = (genreCounts[genre] || 0) + rating.rating;
    }
  }
  
  // Sort by total score and return top genres
  return Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([genre]) => genre);
}