export type FavoriteType = 'anime' | 'episode' | 'rumor';

export interface FavoriteAnime {
  id: string;
  anime: string;
  created_at: string;
  coverUrl?: string;
  score?: number;
  status?: string;
}

export interface FavoriteEpisode {
  id: string;
  episodeId: string;
  anime: string;
  episode: number;
  date: string;
  watched: boolean;
  coverUrl?: string;
}

export interface FavoriteRumor {
  id: string;
  title: string;
  content: string | null;
  status: string;
  confidence_score: number | null;
  media_type: string;
  first_seen_at: string;
  last_updated: string;
}

export interface UserFavorite {
  id: string;
  user_id: string;
  anime: string;
  created_at: string;
}

export interface UserProgress {
  id: string;
  user_id: string;
  episode_id: string;
  watched: boolean;
  created_at: string;
}
