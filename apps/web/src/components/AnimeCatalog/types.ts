export type AnimeType = 'TV' | 'MOVIE' | 'OVA' | 'ONA' | 'SPECIAL' | 'MUSIC';

export interface AnimeData {
  mal_id: number;
  title: string;
  title_english?: string;
  images: {
    jpg: { image_url: string; large_image_url: string };
    webp: { image_url: string; large_image_url: string };
  };
  synopsis?: string;
  type?: string;
  episodes?: number;
  score?: number;
  status?: string;
  genres?: Array<{ mal_id: number; name: string }>;
  rating?: string;
}

export interface Anime {
  id: string;
  title: string;
  titleEnglish?: string;
  description?: string;
  image?: string;
  cover?: string;
  type: AnimeType;
  episodes?: number;
  score?: number;
  status?: 'airing' | 'finished' | 'upcoming';
  year?: number;
  season?: 'winter' | 'spring' | 'summer' | 'fall';
  genres?: string[];
  studios?: string[];
  synopsis?: string;
  url?: string;
}

export interface CategoryType {
  id: string;
  name: string;
  slug: string;
}
