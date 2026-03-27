import * as cheerio from 'cheerio';
import { getManhwaSources, type SourceConfig } from './manager';

export interface CrawledItem {
  title: string;
  content: string;
  source: string;
  sourceType: 'api' | 'site' | 'rss' | 'community' | 'social';
  url?: string;
  publishedAt?: string;
}

async function fetchWithTimeout(url: string, timeout = 15000): Promise<Response> {
  return fetch(url, {
    signal: AbortSignal.timeout(timeout),
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/html, application/xml',
      'Accept-Language': 'en-US,en;q=0.9,ko;q=0.8',
    },
  });
}

async function fetchFromAPI(api: SourceConfig): Promise<CrawledItem[]> {
  try {
    const response = await fetchWithTimeout(api.url);
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await response.json() as Record<string, unknown>;
      return parseAPIResponse(data, api);
    } else {
      const html = await response.text();
      return parseSiteResponse(html, api);
    }
  } catch (error) {
    console.error(`Error fetching API ${api.name}:`, error);
    return [];
  }
}

function parseAPIResponse(data: Record<string, unknown>, api: SourceConfig): CrawledItem[] {
  const items: CrawledItem[] = [];

  if (api.name.includes('WEBTOON') || api.name.includes('Naver')) {
    const dataObj = data.data as Record<string, unknown> | undefined;
    const webtoons = (dataObj?.dayList || dataObj?.webtoons || []) as unknown[];
    webtoons.forEach((webtoon) => {
      const w = webtoon as Record<string, unknown>;
      items.push({
        title: String(w.title || ''),
        content: `Genre: ${w.genre || ''} | Source: ${api.name}`,
        source: api.name,
        sourceType: 'api',
        url: String(w.url || ''),
      });
    });
  } else if (api.name.includes('Kakao')) {
    const dataObj = data.data as Record<string, unknown> | undefined;
    const banners = (dataObj?.banners || []) as unknown[];
    const webtoonsList = (dataObj?.webtoons || []) as unknown[];
    const dayList = (dataObj?.dayList || []) as unknown[];
    
    [...banners, ...webtoonsList, ...dayList].forEach((item) => {
      const i = item as Record<string, unknown>;
      items.push({
        title: String(i.title || ''),
        content: `Source: ${api.name}`,
        source: api.name,
        sourceType: 'api',
        url: String(i.linkUrl || i.url || ''),
      });
    });
  } else if (api.name.includes('Tapas')) {
    const seriesList = (data.data || []) as unknown[];
    seriesList.forEach((series) => {
      const s = series as Record<string, unknown>;
      items.push({
        title: String(s.title || ''),
        content: `Category: ${s.category || ''} | Source: ${api.name}`,
        source: api.name,
        sourceType: 'api',
        url: `https://tapas.io/series/${s.url || ''}`,
      });
    });
  } else if (api.name.includes('Manta')) {
    const seriesList = (data.data || []) as unknown[];
    seriesList.forEach((series) => {
      const s = series as Record<string, unknown>;
      items.push({
        title: String(s.title || ''),
        content: `Genre: ${s.genre || ''} | Source: ${api.name}`,
        source: api.name,
        sourceType: 'api',
        url: `https://manta.net${s.url || ''}`,
      });
    });
  } else if (api.name.includes('Reddit')) {
    const dataObj = data.data as Record<string, unknown> | undefined;
    const children = (dataObj?.children || []) as unknown[];
    children.forEach((post) => {
      const postData = (post as Record<string, unknown>).data as Record<string, unknown>;
      items.push({
        title: String(postData.title || ''),
        content: String(postData.selftext || `Source: ${api.name}`),
        source: api.name,
        sourceType: 'community',
        url: String(postData.url || ''),
        publishedAt: postData.created_utc ? new Date(Number(postData.created_utc) * 1000).toISOString() : undefined,
      });
    });
  }

  return items.slice(0, 20);
}

async function fetchSite(site: SourceConfig): Promise<CrawledItem[]> {
  try {
    const html = await fetchWithTimeout(site.url).then(r => r.text());
    return parseSiteResponse(html, site);
  } catch (error) {
    console.error(`Error fetching site ${site.name}:`, error);
    return [];
  }
}

function parseSiteResponse(html: string, source: SourceConfig): CrawledItem[] {
  const $ = cheerio.load(html);
  const items: CrawledItem[] = [];

  const selectors = [
    '.daily-card-item',
    '.lz-comic__item',
    '.series-card',
    '.toon-card',
    'article',
    '.post',
    '.webtoon-item',
    '.manga-item',
    '.series-item',
    '.list_webtoon .item',
  ];

  for (const selector of selectors) {
    $(selector).each((_, el) => {
      const title = $(el).find('.name, .lz-comic__title, .series-title, .toon-title, h2, h3, .title').first().text().trim();
      const link = $(el).find('a').attr('href');
      const thumbnail = $(el).find('img').attr('src');

      if (title && link) {
        items.push({
          title,
          content: `Source: ${source.name} | ${thumbnail || ''}`.trim(),
          source: source.name,
          sourceType: source.type,
          url: link.startsWith('http') ? link : `https://${source.url}${link}`,
        });
      }
    });

    if (items.length > 0) break;
  }

  return items.slice(0, 15);
}

async function fetchRSS(rss: SourceConfig): Promise<CrawledItem[]> {
  try {
    const response = await fetchWithTimeout(rss.url);
    const xml = await response.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    const items: CrawledItem[] = [];

    $('item').each((_, el) => {
      const title = $(el).find('title').text();
      const link = $(el).find('link').text();
      const description = $(el).find('description').text();
      const pubDate = $(el).find('pubDate').text();

      if (title && link) {
        items.push({
          title,
          content: description || `Source: ${rss.name}`,
          source: rss.name,
          sourceType: 'rss',
          url: link,
          publishedAt: pubDate,
        });
      }
    });

    return items.slice(0, 15);
  } catch (error) {
    console.error(`Error fetching RSS ${rss.name}:`, error);
    return [];
  }
}

export async function crawlManhwa(): Promise<CrawledItem[]> {
  const sources = getManhwaSources();
  
  const results = await Promise.all([
    ...sources.apis.map(api => fetchFromAPI(api)),
    ...sources.sites.map(site => fetchSite(site)),
    ...sources.rss.map(rss => fetchRSS(rss)),
  ]);
  
  return results.flat();
}
