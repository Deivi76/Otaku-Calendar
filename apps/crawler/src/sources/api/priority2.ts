import { fetchTMDB } from '../tmdb';
import { fetchTVMaze } from '../tvmaze';
import { fetchTrakt } from '../trakt';
import { fetchMAL } from '../mal';
import { fetchMangaDex } from '../mangadex';
import { fetchSIMKL } from '../simkl';

export interface CrawledItem {
  title: string;
  content: string;
  source: string;
  sourceType: 'api';
  url?: string;
  publishedAt?: string;
}

export async function crawlAPI_Priority2(): Promise<CrawledItem[]> {
  const results: CrawledItem[] = [];
  
  // TMDB - filmes e séries
  results.push(...await fetchTMDB());
  // TVMaze
  results.push(...await fetchTVMaze());
  // Trakt
  results.push(...await fetchTrakt());
  // MyAnimeList
  results.push(...await fetchMAL());
  // MangaDex
  results.push(...await fetchMangaDex());
  // SIMKL
  results.push(...await fetchSIMKL());
  
  return results;
}