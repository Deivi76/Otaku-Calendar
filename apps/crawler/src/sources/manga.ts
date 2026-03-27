import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import { getMangaSources, type SourceConfig } from './manager';

export interface CrawledItem {
  title: string;
  content: string;
  source: string;
  sourceType: 'api' | 'site' | 'rss' | 'platform';
  url?: string;
  publishedAt?: string;
}

const parser = new Parser({ timeout: 30000 });

const rateLimitedCache: Map<string, number> = new Map();
async function rateLimitedFetch(url: string, minInterval = 200): Promise<any> {
  const lastRequest = rateLimitedCache.get(url) || 0;
  const elapsed = Date.now() - lastRequest;
  if (elapsed < minInterval) {
    await new Promise(resolve => setTimeout(resolve, minInterval - elapsed));
  }
  rateLimitedCache.set(url, Date.now());
  
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function fetchWithUA(url: string): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });
  return res.text();
}

async function fetchFromAPI(source: SourceConfig): Promise<CrawledItem[]> {
  try {
    if (source.name === 'MangaDex') {
      const [latest, popular] = await Promise.all([
        rateLimitedFetch(`${source.url}/manga?order[latestUploadedChapter]=desc&limit=25&includes[]=cover_art`),
        rateLimitedFetch(`${source.url}/manga?order[followedCount]=desc&limit=25&includes[]=cover_art`),
      ]);
      
      const mapManga = (manga: any) => ({
        title: manga.attributes.title.en || manga.attributes.title['ja-ro'] || Object.values(manga.attributes.title)[0] || 'Unknown',
        content: manga.attributes.description?.en?.substring(0, 200) || 'Manga on MangaDex',
        source: source.url,
        sourceType: 'api' as const,
        url: `https://mangadex.org/manga/${manga.id}`,
        publishedAt: manga.attributes.year ? `${manga.attributes.year}-01-01` : undefined,
      });
      
      return [...(latest.data?.map(mapManga) || []), ...(popular.data?.map(mapManga) || [])];
    }
    
    if (source.name === 'Comick') {
      const res = await fetch(`${source.url}/v1/manga?limit=25&page=1`, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`Comick API error: ${res.status}`);
      const data: any = await res.json();
      
      return data.manga?.map((m: any) => ({
        title: m.title || m.slug || 'Unknown',
        content: m.desc?.substring(0, 200) || 'Manga on Comick',
        source: source.url,
        sourceType: 'api',
        url: `https://comick.fun/manga/${m.slug}`,
        publishedAt: m.year ? `${m.year}-01-01` : undefined,
      })) || [];
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching from API ${source.name}:`, error);
    return [];
  }
}

async function fetchRSS(source: SourceConfig): Promise<CrawledItem[]> {
  try {
    const feed = await parser.parseURL(source.url);
    return feed.items?.map(item => ({
      title: item.title || '',
      content: item.contentSnippet || item.content || '',
      source: source.url,
      sourceType: 'rss',
      url: item.link,
      publishedAt: item.pubDate,
    })) || [];
  } catch (error) {
    console.error(`Error fetching RSS ${source.name}:`, error);
    return [];
  }
}

async function fetchSite(source: SourceConfig): Promise<CrawledItem[]> {
  try {
    const html = await fetchWithUA(source.url);
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];
    
    if (source.name === 'MyAnimeList') {
      $('a[href*="/manga/"]').each((_, el) => {
        const title = $(el).text().trim();
        const url = $(el).attr('href');
        if (title && url && title.length > 2) {
          items.push({
            title,
            content: 'Manga on MyAnimeList',
            source: source.url,
            sourceType: 'site',
            url,
          });
        }
      });
    } else if (source.name === 'MangaUpdates') {
      $('.serial_list').each((_, el) => {
        const title = $(el).find('.title a').text().trim();
        const link = $(el).find('.title a').attr('href');
        const genre = $(el).find('.genre').text().trim();
        
        if (title && link) {
          items.push({
            title,
            content: genre ? `Genre: ${genre}` : 'Manga on MangaUpdates',
            source: source.url,
            sourceType: 'site',
            url: `https://www.mangaupdates.com${link}`,
          });
        }
      });
    } else if (source.name === 'Anime-Planet') {
      $('a[href*="/manga/"]').each((_, el) => {
        const title = $(el).text().trim();
        const url = $(el).attr('href');
        if (title && url) {
          items.push({
            title,
            content: 'Manga on Anime-Planet',
            source: source.url,
            sourceType: 'site',
            url: `https://www.anime-planet.com${url}`,
          });
        }
      });
    } else if (source.name === 'WEBTOON') {
      $('a[href*="/title/"]').each((_, el) => {
        const title = $(el).text().trim();
        const url = $(el).attr('href');
        if (title && url && title.length > 2) {
          items.push({
            title,
            content: 'WEBTOON manga/webtoon',
            source: source.url,
            sourceType: 'platform',
            url: url.startsWith('http') ? url : `https://www.webtoons.com${url}`,
          });
        }
      });
    } else if (source.name === 'Tapas') {
      $('a[href*="/series/"]').each((_, el) => {
        const title = $(el).text().trim();
        const url = $(el).attr('href');
        if (title && url) {
          items.push({
            title,
            content: 'Manga on Tapas',
            source: source.url,
            sourceType: 'platform',
            url: url.startsWith('http') ? url : `https://tapas.io${url}`,
          });
        }
      });
    } else if (source.name === 'Inkr') {
      $('a[href*="/titles/"]').each((_, el) => {
        const title = $(el).text().trim();
        const url = $(el).attr('href');
        if (title && url && title.length > 2) {
          items.push({
            title,
            content: 'Comics on Inkr',
            source: source.url,
            sourceType: 'platform',
            url: url.startsWith('http') ? url : `https://www.inkr.com${url}`,
          });
        }
      });
    } else if (source.name === 'Manga Plus') {
      $('a[href*="/manga/"]').each((_, el) => {
        const title = $(el).text().trim();
        const url = $(el).attr('href');
        if (title && url) {
          items.push({
            title,
            content: 'Manga on Manga Plus (Shueisha)',
            source: source.url,
            sourceType: 'platform',
            url,
          });
        }
      });
    } else if (source.name === 'Crunchyroll Manga') {
      $('a[href*="/manga/"]').each((_, el) => {
        const title = $(el).text().trim();
        const url = $(el).attr('href');
        if (title && url) {
          items.push({
            title,
            content: 'Manga on Crunchyroll',
            source: source.url,
            sourceType: 'platform',
            url: url.startsWith('http') ? url : `https://www.crunchyroll.com${url}`,
          });
        }
      });
    } else if (source.name === 'MangaBookshelf') {
      $('a[href*="/manga/"], .manga-item a').each((_, el) => {
        const title = $(el).text().trim();
        const url = $(el).attr('href');
        if (title && url) {
          items.push({
            title,
            content: 'Manga on MangaBookshelf',
            source: source.url,
            sourceType: 'site',
            url: url.startsWith('http') ? url : `https://www.mangabookshelf.com${url}`,
          });
        }
      });
    } else if (source.name === 'MAL Top Manga') {
      $('.ranking-list').each((_, el) => {
        const title = $(el).find('.title a').text().trim();
        const rank = $(el).find('.rank span').text().trim();
        const link = $(el).find('.title a').attr('href');
        
        if (title && link) {
          items.push({
            title,
            content: `Rank #${rank} - Top Manga on MAL`,
            source: source.url,
            sourceType: 'site',
            url: link,
          });
        }
      });
    }
    
    return items.slice(0, 30);
  } catch (error) {
    console.error(`Error fetching site ${source.name}:`, error);
    return [];
  }
}

export async function crawlManga(): Promise<CrawledItem[]> {
  const sources = getMangaSources();
  
  const [apis, rss, sites, social] = await Promise.all([
    Promise.all(sources.apis.map(api => fetchFromAPI(api))),
    Promise.all(sources.rss.map(rss => fetchRSS(rss))),
    Promise.all(sources.sites.map(site => fetchSite(site))),
    Promise.all(sources.social.map(site => fetchSite(site))),
  ]);
  
  return [...apis, ...rss, ...sites, ...social].flat();
}

export async function fetchMangaDex(): Promise<CrawledItem[]> {
  const sources = getMangaSources();
  const mangadex = sources.apis.find(s => s.name === 'MangaDex');
  if (mangadex) return fetchFromAPI(mangadex);
  return [];
}

export async function fetchComick(): Promise<CrawledItem[]> {
  const sources = getMangaSources();
  const comick = sources.apis.find(s => s.name === 'Comick');
  if (comick) return fetchFromAPI(comick);
  return [];
}

export async function fetchMALScraper(): Promise<CrawledItem[]> {
  const sources = getMangaSources();
  const mal = sources.sites.find(s => s.name === 'MAL Top Manga');
  if (mal) return fetchSite(mal);
  return [];
}

export async function fetchMangaPlus(): Promise<CrawledItem[]> {
  const sources = getMangaSources();
  const mangaPlus = sources.sites.find(s => s.name === 'Manga Plus');
  if (mangaPlus) return fetchSite(mangaPlus);
  return [];
}

export async function fetchCrunchyrollManga(): Promise<CrawledItem[]> {
  const sources = getMangaSources();
  const crunchyroll = sources.sites.find(s => s.name === 'Crunchyroll Manga');
  if (crunchyroll) return fetchSite(crunchyroll);
  return [];
}

export async function fetchMangaUpdates(): Promise<CrawledItem[]> {
  const sources = getMangaSources();
  const updates = sources.sites.find(s => s.name === 'MangaUpdates');
  if (updates) return fetchSite(updates);
  return [];
}

export async function fetchAnimePlanetManga(): Promise<CrawledItem[]> {
  const sources = getMangaSources();
  const animePlanet = sources.sites.find(s => s.name === 'Anime-Planet');
  if (animePlanet) return fetchSite(animePlanet);
  return [];
}

export async function fetchMangaBookshelf(): Promise<CrawledItem[]> {
  const sources = getMangaSources();
  const bookshelf = sources.sites.find(s => s.name === 'MangaBookshelf');
  if (bookshelf) return fetchSite(bookshelf);
  return [];
}

export async function fetchMyAnimeListManga(): Promise<CrawledItem[]> {
  const sources = getMangaSources();
  const mal = sources.sites.find(s => s.name === 'MyAnimeList');
  if (mal) return fetchSite(mal);
  return [];
}

export async function fetchMangaBookshelfRSS(): Promise<CrawledItem[]> {
  const sources = getMangaSources();
  const rssSource = sources.rss.find(s => s.name === 'MangaBookshelf');
  if (rssSource) return fetchRSS(rssSource);
  return [];
}

export async function fetchComicBookResourcesRSS(): Promise<CrawledItem[]> {
  const sources = getMangaSources();
  const rssSource = sources.rss.find(s => s.name === 'CBR');
  if (rssSource) return fetchRSS(rssSource);
  return [];
}

export async function fetchWEBTOON(): Promise<CrawledItem[]> {
  const sources = getMangaSources();
  const webtoon = sources.sites.find(s => s.name === 'WEBTOON');
  if (webtoon) return fetchSite(webtoon);
  return [];
}

export async function fetchTapas(): Promise<CrawledItem[]> {
  const sources = getMangaSources();
  const tapas = sources.sites.find(s => s.name === 'Tapas');
  if (tapas) return fetchSite(tapas);
  return [];
}

export async function fetchInkr(): Promise<CrawledItem[]> {
  const sources = getMangaSources();
  const inkr = sources.sites.find(s => s.name === 'Inkr');
  if (inkr) return fetchSite(inkr);
  return [];
}