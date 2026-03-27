import { crawlAniList } from '../anilist';
import { crawlJikan } from '../jikan';
import { crawlKitsu } from '../kitsu';

export interface CrawledItem {
  title: string;
  content: string;
  source: string;
  sourceType: 'api';
  url?: string;
  publishedAt?: string;
}

export async function crawlAPI_Priority1(): Promise<CrawledItem[]> {
  const results: CrawledItem[] = [];
  
  // AniList - faz todas as reqs internas (trending, seasonal, etc)
  const anilistData = await crawlAniList();
  results.push(...anilistData);
  
  // Jikan - faz todas as reqs internas (schedule, top, etc)
  const jikanData = await crawlJikan();
  results.push(...jikanData);
  
  // Kitsu - faz todas as reqs internas
  const kitsuData = await crawlKitsu();
  results.push(...kitsuData);
  
  return results;
}