import { crawlAniList } from './anilist';
import { crawlJikan } from './jikan';
import { crawlKitsu } from './kitsu';
import { crawlMangaDex } from './mangadex';
import { crawlJapanese } from './japanese';
import { crawlChinese } from './chinese';
import { crawlRSSFeeds } from './rss';
import { crawlSites } from './sites';
import { crawlSocial } from './social';
import { SOURCES } from './config';

export interface CrawledItem {
  title: string;
  content: string;
  source: string;
  sourceType: 'api' | 'rss' | 'site' | 'social' | 'community';
  url?: string;
  publishedAt?: string;
}

const ANIME_RSS_URLS = SOURCES.rss.news.map(f => f.url);
const ANIME_SITE_URLS = SOURCES.sites.news.map(s => s.url);

export async function crawlAnime(): Promise<CrawledItem[]> {
  const results = await Promise.all([
    crawlAniList(),
    crawlJikan(),
    crawlKitsu(),
    crawlMangaDex(),
    crawlJapanese(),
    crawlChinese(),
    crawlRSSFeeds(ANIME_RSS_URLS),
    crawlSites(ANIME_SITE_URLS),
    crawlSocial(),
  ]);
  
  return results.flat();
}
