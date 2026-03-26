import * as cheerio from 'cheerio';
import Parser from 'rss-parser';

export interface CrawledItem {
  title: string;
  content: string;
  source: string;
  sourceType: 'api' | 'site' | 'rss' | 'platform';
  url?: string;
  publishedAt?: string;
}

const COMICK_API = process.env.COMICK_API || 'https://api.comick.fun';
const MANGADEX_API = process.env.MANGADEX_API || 'https://api.mangadex.org';
const parser = new Parser({ timeout: 30000 });

let lastMangaDexRequest = 0;
async function rateLimitedFetch(url: string): Promise<any> {
  const now = Date.now();
  const elapsed = now - lastMangaDexRequest;
  if (elapsed < 200) {
    await new Promise(resolve => setTimeout(resolve, 200 - elapsed));
  }
  lastMangaDexRequest = Date.now();
  
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

export async function fetchMangaDex(): Promise<CrawledItem[]> {
  try {
    const latest: any = await rateLimitedFetch(`${MANGADEX_API}/manga?order[latestUploadedChapter]=desc&limit=25&includes[]=cover_art`);
    const popular: any = await rateLimitedFetch(`${MANGADEX_API}/manga?order[followedCount]=desc&limit=25&includes[]=cover_art`);
    
    const mapManga = (manga: any) => ({
      title: manga.attributes.title.en || manga.attributes.title['ja-ro'] || Object.values(manga.attributes.title)[0] || 'Unknown',
      content: manga.attributes.description?.en?.substring(0, 200) || 'Manga on MangaDex',
      source: MANGADEX_API,
      sourceType: 'api' as const,
      url: `https://mangadex.org/manga/${manga.id}`,
      publishedAt: manga.attributes.year ? `${manga.attributes.year}-01-01` : undefined,
    });
    
    return [...(latest.data?.map(mapManga) || []), ...(popular.data?.map(mapManga) || [])];
  } catch (error) {
    console.error('Error fetching from MangaDex:', error);
    return [];
  }
}

export async function fetchComick(): Promise<CrawledItem[]> {
  try {
    const res = await fetch(`${COMICK_API}/v1/manga?limit=25&page=1`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`Comick API error: ${res.status}`);
    const data: any = await res.json();
    
    return data.manga?.map((m: any) => ({
      title: m.title || m.slug || 'Unknown',
      content: m.desc?.substring(0, 200) || 'Manga on Comick',
      source: COMICK_API,
      sourceType: 'api',
      url: `https://comick.fun/manga/${m.slug}`,
      publishedAt: m.year ? `${m.year}-01-01` : undefined,
    })) || [];
  } catch (error) {
    console.error('Error fetching from Comick:', error);
    return [];
  }
}

export async function fetchMALScraper(): Promise<CrawledItem[]> {
  try {
    const html = await fetchWithUA('https://myanimelist.net/topmanga.php');
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];
    
    $('.ranking-list').each((_, el) => {
      const title = $(el).find('.title a').text().trim();
      const rank = $(el).find('.rank span').text().trim();
      const link = $(el).find('.title a').attr('href');
      
      if (title && link) {
        items.push({
          title,
          content: `Rank #${rank} - Top Manga on MAL`,
          source: 'https://myanimelist.net',
          sourceType: 'site',
          url: link,
        });
      }
    });
    
    return items.slice(0, 25);
  } catch (error) {
    console.error('Error fetching from MAL:', error);
    return [];
  }
}

export async function fetchMangaPlus(): Promise<CrawledItem[]> {
  try {
    const html = await fetchWithUA('https://manga-plus.com/');
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];
    
    $('a[href*="/manga/"]').each((_, el) => {
      const title = $(el).text().trim();
      const url = $(el).attr('href');
      if (title && url) {
        items.push({
          title,
          content: 'Manga on Manga Plus (Shueisha)',
          source: 'https://manga-plus.com',
          sourceType: 'platform',
          url,
        });
      }
    });
    
    return items.slice(0, 20);
  } catch (error) {
    console.error('Error fetching from Manga Plus:', error);
    return [];
  }
}

export async function fetchCrunchyrollManga(): Promise<CrawledItem[]> {
  try {
    const html = await fetchWithUA('https://www.crunchyroll.com/manga');
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];
    
    $('a[href*="/manga/"]').each((_, el) => {
      const title = $(el).text().trim();
      const url = $(el).attr('href');
      if (title && url) {
        items.push({
          title,
          content: 'Manga on Crunchyroll',
          source: 'https://www.crunchyroll.com',
          sourceType: 'platform',
          url: url.startsWith('http') ? url : `https://www.crunchyroll.com${url}`,
        });
      }
    });
    
    return items.slice(0, 20);
  } catch (error) {
    console.error('Error fetching from Crunchyroll Manga:', error);
    return [];
  }
}

export async function fetchMangaUpdates(): Promise<CrawledItem[]> {
  try {
    const html = await fetchWithUA('https://www.mangaupdates.com/series.html');
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];
    
    $('.serial_list').each((_, el) => {
      const title = $(el).find('.title a').text().trim();
      const link = $(el).find('.title a').attr('href');
      const genre = $(el).find('.genre').text().trim();
      
      if (title && link) {
        items.push({
          title,
          content: genre ? `Genre: ${genre}` : 'Manga on MangaUpdates',
          source: 'https://www.mangaupdates.com',
          sourceType: 'site',
          url: `https://www.mangaupdates.com${link}`,
        });
      }
    });
    
    return items.slice(0, 25);
  } catch (error) {
    console.error('Error fetching from MangaUpdates:', error);
    return [];
  }
}

export async function fetchAnimePlanetManga(): Promise<CrawledItem[]> {
  try {
    const html = await fetchWithUA('https://www.anime-planet.com/manga');
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];
    
    $('a[href*="/manga/"]').each((_, el) => {
      const title = $(el).text().trim();
      const url = $(el).attr('href');
      if (title && url) {
        items.push({
          title,
          content: 'Manga on Anime-Planet',
          source: 'https://www.anime-planet.com',
          sourceType: 'site',
          url: `https://www.anime-planet.com${url}`,
        });
      }
    });
    
    return items.slice(0, 25);
  } catch (error) {
    console.error('Error fetching from Anime-Planet:', error);
    return [];
  }
}

export async function fetchMangaBookshelf(): Promise<CrawledItem[]> {
  try {
    const html = await fetchWithUA('https://www.mangabookshelf.com/');
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];
    
    $('a[href*="/manga/"], .manga-item a').each((_, el) => {
      const title = $(el).text().trim();
      const url = $(el).attr('href');
      if (title && url) {
        items.push({
          title,
          content: 'Manga on MangaBookshelf',
          source: 'https://www.mangabookshelf.com',
          sourceType: 'site',
          url: url.startsWith('http') ? url : `https://www.mangabookshelf.com${url}`,
        });
      }
    });
    
    return items.slice(0, 20);
  } catch (error) {
    console.error('Error fetching from MangaBookshelf:', error);
    return [];
  }
}

export async function fetchMyAnimeListManga(): Promise<CrawledItem[]> {
  try {
    const html = await fetchWithUA('https://myanimelist.net/manga.php');
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];
    
    $('a[href*="/manga/"]').each((_, el) => {
      const title = $(el).text().trim();
      const url = $(el).attr('href');
      if (title && url && title.length > 2) {
        items.push({
          title,
          content: 'Manga on MyAnimeList',
          source: 'https://myanimelist.net',
          sourceType: 'site',
          url,
        });
      }
    });
    
    return items.slice(0, 30);
  } catch (error) {
    console.error('Error fetching from MyAnimeList:', error);
    return [];
  }
}

export async function fetchMangaBookshelfRSS(): Promise<CrawledItem[]> {
  try {
    const feed = await parser.parseURL('https://www.mangabookshelf.com/feed/');
    return feed.items?.map(item => ({
      title: item.title || '',
      content: item.contentSnippet || item.content || '',
      source: 'https://www.mangabookshelf.com',
      sourceType: 'rss',
      url: item.link,
      publishedAt: item.pubDate,
    })) || [];
  } catch (error) {
    console.error('Error fetching MangaBookshelf RSS:', error);
    return [];
  }
}

export async function fetchComicBookResourcesRSS(): Promise<CrawledItem[]> {
  try {
    const feed = await parser.parseURL('https://www.cbr.com/category/manga/feed/');
    return feed.items?.map(item => ({
      title: item.title || '',
      content: item.contentSnippet || item.content || '',
      source: 'https://www.cbr.com',
      sourceType: 'rss',
      url: item.link,
      publishedAt: item.pubDate,
    })) || [];
  } catch (error) {
    console.error('Error fetching CBR RSS:', error);
    return [];
  }
}

export async function fetchWEBTOON(): Promise<CrawledItem[]> {
  try {
    const html = await fetchWithUA('https://www.webtoons.com/');
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];
    
    $('a[href*="/title/"]').each((_, el) => {
      const title = $(el).text().trim();
      const url = $(el).attr('href');
      if (title && url && title.length > 2) {
        items.push({
          title,
          content: 'WEBTOON manga/webtoon',
          source: 'https://www.webtoons.com',
          sourceType: 'platform',
          url: url.startsWith('http') ? url : `https://www.webtoons.com${url}`,
        });
      }
    });
    
    return items.slice(0, 25);
  } catch (error) {
    console.error('Error fetching from WEBTOON:', error);
    return [];
  }
}

export async function fetchTapas(): Promise<CrawledItem[]> {
  try {
    const html = await fetchWithUA('https://tapas.io/series?category=manga');
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];
    
    $('a[href*="/series/"]').each((_, el) => {
      const title = $(el).text().trim();
      const url = $(el).attr('href');
      if (title && url) {
        items.push({
          title,
          content: 'Manga on Tapas',
          source: 'https://tapas.io',
          sourceType: 'platform',
          url: url.startsWith('http') ? url : `https://tapas.io${url}`,
        });
      }
    });
    
    return items.slice(0, 25);
  } catch (error) {
    console.error('Error fetching from Tapas:', error);
    return [];
  }
}

export async function fetchInkr(): Promise<CrawledItem[]> {
  try {
    const html = await fetchWithUA('https://www.inkr.com/');
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];
    
    $('a[href*="/titles/"]').each((_, el) => {
      const title = $(el).text().trim();
      const url = $(el).attr('href');
      if (title && url && title.length > 2) {
        items.push({
          title,
          content: 'Comics on Inkr',
          source: 'https://www.inkr.com',
          sourceType: 'platform',
          url: url.startsWith('http') ? url : `https://www.inkr.com${url}`,
        });
      }
    });
    
    return items.slice(0, 25);
  } catch (error) {
    console.error('Error fetching from Inkr:', error);
    return [];
  }
}

export async function crawlManga(): Promise<CrawledItem[]> {
  const [
    mangaDex,
    comick,
    malScraper,
    mangaPlus,
    crunchyrollManga,
    mangaUpdates,
    animePlanet,
    mangaBookshelf,
    malManga,
    mangaBookshelfRSS,
    cbrRSS,
    webtoon,
    tapas,
    inkr,
  ] = await Promise.all([
    fetchMangaDex(),
    fetchComick(),
    fetchMALScraper(),
    fetchMangaPlus(),
    fetchCrunchyrollManga(),
    fetchMangaUpdates(),
    fetchAnimePlanetManga(),
    fetchMangaBookshelf(),
    fetchMyAnimeListManga(),
    fetchMangaBookshelfRSS(),
    fetchComicBookResourcesRSS(),
    fetchWEBTOON(),
    fetchTapas(),
    fetchInkr(),
  ]);

  return [
    ...mangaDex,
    ...comick,
    ...malScraper,
    ...mangaPlus,
    ...crunchyrollManga,
    ...mangaUpdates,
    ...animePlanet,
    ...mangaBookshelf,
    ...malManga,
    ...mangaBookshelfRSS,
    ...cbrRSS,
    ...webtoon,
    ...tapas,
    ...inkr,
  ];
}