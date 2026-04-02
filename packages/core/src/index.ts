export * from './sources-database';
export * from './types';
export {
  generateRecommendations,
  calculateGenreMatch,
  calculateRatingScore,
  calculatePopularityScore,
  calculateSeasonMatch,
  getRecommendationExplanation,
  filterByRatingRange,
  groupAnimesByGenre,
  calculateUserGenrePreferences,
  RECOMMENDATION_WEIGHTS,
} from './recommendations';
export type {
  RecommendationResult,
  RecommendationReason,
} from './recommendations';