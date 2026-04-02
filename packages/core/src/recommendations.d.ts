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
export declare const RECOMMENDATION_WEIGHTS: {
    readonly genreMatch: 0.35;
    readonly highRating: 0.3;
    readonly similarUsers: 0.2;
    readonly popularity: 0.1;
    readonly seasonMatch: 0.05;
};
/**
 * Calculate genre match score between anime and user preferences
 */
export declare function calculateGenreMatch(animeGenres: string[], preferredGenres: string[]): number;
/**
 * Calculate score based on user's high-rated animes
 */
export declare function calculateRatingScore(animeGenres: string[], highRatedAnimes: {
    genres: string[];
    rating: number;
}[]): number;
/**
 * Calculate popularity score based on score/rank
 */
export declare function calculatePopularityScore(animeScore: number | null): number;
/**
 * Calculate season match score
 */
export declare function calculateSeasonMatch(animeSeason: string | null, preferredSeasons: string[]): number;
/**
 * Main recommendation function
 * Generates personalized recommendations for a user
 */
export declare function generateRecommendations(availableAnimes: Anime[], preferences: UserPreferences | null, userRatings: UserRating[], userFavorites: Anime[], limit?: number): RecommendationResult[];
/**
 * Get recommendation explanation for UI
 */
export declare function getRecommendationExplanation(result: RecommendationResult): string;
/**
 * Filter animes by rating range
 */
export declare function filterByRatingRange(animes: Anime[], minRating: number, maxRating: number): Anime[];
/**
 * Group animes by genre for exploration
 */
export declare function groupAnimesByGenre(animes: Anime[]): Record<string, Anime[]>;
/**
 * Calculate user's genre preferences from ratings
 */
export declare function calculateUserGenrePreferences(ratings: UserRating[]): string[];
//# sourceMappingURL=recommendations.d.ts.map