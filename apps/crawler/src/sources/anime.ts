import { getAnimeSources, type SourceConfig } from './manager';
import { crawlRSS } from './rss';
import { crawlSite } from './sites';
import { crawlSocial } from './social';
import { crawlAniList } from './anilist';
import { crawlJikan } from './jikan';
import { crawlKitsu } from './kitsu';
import { crawlMangaDex } from './mangadex';
import { crawlJapanese } from './japanese';
import { crawlChinese } from './chinese';

export interface CrawledItem {
  title: string;
  content: string;
  source: string;
  sourceType: 'api' | 'rss' | 'site' | 'social' | 'community';
  url?: string;
  publishedAt?: string;
}

async function fetchFromAPI(api: SourceConfig): Promise<CrawledItem[]> {
  try {
    if (api.url.includes('anilist.co')) {
      return crawlAniList() as unknown as Promise<CrawledItem[]>;
    }
    if (api.url.includes('jikan.moe')) {
      return crawlJikan() as unknown as Promise<CrawledItem[]>;
    }
    if (api.url.includes('kitsu.io')) {
      return crawlKitsu() as unknown as Promise<CrawledItem[]>;
    }
    if (api.url.includes('mangadex.org')) {
      return crawlMangaDex() as unknown as Promise<CrawledItem[]>;
    }
    if (api.url.includes('japanese')) {
      return crawlJapanese() as unknown as Promise<CrawledItem[]>;
    }
    if (api.url.includes('chinese')) {
      return crawlChinese() as unknown as Promise<CrawledItem[]>;
    }
    return [];
  } catch (error) {
    console.error(`Error fetching from API ${api.name}:`, error);
    return [];
  }
}

async function fetchRSS(source: SourceConfig): Promise<CrawledItem[]> {
  if (!source.url) return [];
  return crawlRSS(source.url) as unknown as Promise<CrawledItem[]>;
}

async function fetchSite(site: SourceConfig): Promise<CrawledItem[]> {
  if (!site.url) return [];
  return crawlSite(site.url) as unknown as Promise<CrawledItem[]>;
}

async function fetchSocial(social: SourceConfig): Promise<CrawledItem[]> {
  return crawlSocial() as unknown as Promise<CrawledItem[]>;
}

export async function crawlAnime(): Promise<CrawledItem[]> {
  const sources = getAnimeSources();
  
  const results = await Promise.all([
    ...sources.apis.map(api => fetchFromAPI(api)),
    ...sources.rss.map(rss => fetchRSS(rss)),
    ...sources.sites.map(site => fetchSite(site)),
    ...sources.social.map(social => fetchSocial(social)),
  ]);
  
  return results.flat();
}
