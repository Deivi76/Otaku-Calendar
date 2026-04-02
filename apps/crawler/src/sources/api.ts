import type { CrawledItem } from '../utils/queue';

const TIMEOUT_MS = 15000;

const DEFAULT_HEADERS = {
  'User-Agent': 'Otaku-Calendar/1.0 (https://github.com/anomalyco/Otaku-Calendar)',
  'Accept': 'application/json',
};

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...DEFAULT_HEADERS,
        ...options.headers,
      },
    });
    return res;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function crawlJikan(url: string): Promise<CrawledItem[]> {
  try {
    const results: CrawledItem[] = [];

    const [scheduleRes, topRes, seasonRes] = await Promise.all([
      fetchWithTimeout('https://api.jikan.moe/v4/schedules'),
      fetchWithTimeout('https://api.jikan.moe/v4/top/anime?limit=25'),
      fetchWithTimeout('https://api.jikan.moe/v4/seasons/now?limit=50'),
    ]);

    if (scheduleRes.ok) {
      const scheduleData = await scheduleRes.json();
      scheduleData.data?.forEach((anime: any) => {
        results.push({
          title: anime.title || anime.title_japanese,
          content: `Episode ${anime.episodes?.[0]?.episode || 'TBA'} airing`,
          source: 'https://api.jikan.moe/v4',
          sourceType: 'api',
          url: anime.url,
          publishedAt: anime.episodes?.[0]?.aired,
        });
      });
    }

    if (topRes.ok) {
      const topData = await topRes.json();
      topData.data?.forEach((anime: any) => {
        results.push({
          title: anime.title || anime.title_japanese,
          content: `Score: ${anime.score || 'N/A'}`,
          source: 'https://api.jikan.moe/v4',
          sourceType: 'api',
          url: anime.url,
          publishedAt: anime.aired?.from,
        });
      });
    }

    if (seasonRes.ok) {
      const seasonData = await seasonRes.json();
      seasonData.data?.forEach((anime: any) => {
        results.push({
          title: anime.title || anime.title_japanese,
          content: anime.synopsis?.substring(0, 200) || 'Currently airing',
          source: 'https://api.jikan.moe/v4',
          sourceType: 'api',
          url: anime.url,
          publishedAt: anime.aired?.from,
        });
      });
    }

    return results;
  } catch (error) {
    console.error(`Error crawling Jikan: ${error}`);
    return [];
  }
}

async function crawlAniList(url: string): Promise<CrawledItem[]> {
  try {
    const query = `
      query {
        releasing: Page(perPage: 50) {
          media(type: ANIME, status_in: [RELEASING]) {
            id
            title { romaji english native }
            nextAiringEpisode { episode airingAt }
            siteUrl
          }
        }
        upcoming: Page(perPage: 50) {
          media(type: ANIME, status_in: [NOT_YET_RELEASED]) {
            id
            title { romaji english native }
            startDate { year month day }
            siteUrl
          }
        }
      }
    `;

    const res = await fetchWithTimeout('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      throw new Error(`AniList API error: ${res.status}`);
    }

    const json: any = await res.json();
    if (json.errors) {
      throw new Error(`AniList GraphQL error: ${json.errors[0].message}`);
    }

    const results: CrawledItem[] = [];
    const releasingMedia = json.data?.releasing?.media;
    const upcomingMedia = json.data?.upcoming?.media;

    releasingMedia?.forEach((media: any) => {
      results.push({
        title: media.title.romaji || media.title.english || media.title.native,
        content: media.nextAiringEpisode
          ? `Episode ${media.nextAiringEpisode.episode} airing soon`
          : 'Currently releasing',
        source: 'https://graphql.anilist.co',
        sourceType: 'api',
        url: media.siteUrl,
        publishedAt: media.nextAiringEpisode?.airingAt
          ? new Date(media.nextAiringEpisode.airingAt * 1000).toISOString()
          : undefined,
      });
    });

    upcomingMedia?.forEach((media: any) => {
      results.push({
        title: media.title.romaji || media.title.english || media.title.native,
        content: 'Upcoming anime',
        source: 'https://graphql.anilist.co',
        sourceType: 'api',
        url: media.siteUrl,
        publishedAt: media.startDate
          ? new Date(media.startDate.year, media.startDate.month - 1, media.startDate.day).toISOString()
          : undefined,
      });
    });

    return results;
  } catch (error) {
    console.error(`Error crawling AniList: ${error}`);
    return [];
  }
}

async function crawlKitsu(url: string): Promise<CrawledItem[]> {
  try {
    const results: CrawledItem[] = [];
    const now = new Date();
    const year = now.getFullYear();
    const season = ['winter', 'spring', 'summer', 'fall'][Math.floor(now.getMonth() / 3)];

    const [seasonRes, trendingRes, mangaRes] = await Promise.all([
      fetchWithTimeout(`https://kitsu.io/api/edge/anime?filter[seasonYear]=${year}&filter[season]=${season}&sort=-userCount&page[limit]=20`),
      fetchWithTimeout('https://kitsu.io/api/edge/anime?sort=-userCount&page[limit]=20'),
      fetchWithTimeout('https://kitsu.io/api/edge/manga?sort=-userCount&page[limit]=20'),
    ]);

    if (seasonRes.ok) {
      const seasonData = await seasonRes.json();
      seasonData.data?.forEach((anime: any) => {
        results.push({
          title: anime.attributes.titles.en_jp || anime.attributes.titles.en || anime.attributes.canonicalTitle,
          content: anime.attributes.synopsis?.substring(0, 200) || 'Currently airing',
          source: 'https://kitsu.io/api/edge',
          sourceType: 'api',
          url: anime.attributes.url,
          publishedAt: anime.attributes.startDate,
        });
      });
    }

    if (trendingRes.ok) {
      const trendingData = await trendingRes.json();
      trendingData.data?.forEach((anime: any) => {
        results.push({
          title: anime.attributes.titles.en_jp || anime.attributes.titles.en || anime.attributes.canonicalTitle,
          content: `Rating: ${anime.attributes.averageRating || 'N/A'}`,
          source: 'https://kitsu.io/api/edge',
          sourceType: 'api',
          url: anime.attributes.url,
          publishedAt: anime.attributes.startDate,
        });
      });
    }

    if (mangaRes.ok) {
      const mangaData = await mangaRes.json();
      mangaData.data?.forEach((manga: any) => {
        results.push({
          title: manga.attributes.titles.en_jp || manga.attributes.titles.en || manga.attributes.canonicalTitle,
          content: manga.attributes.synopsis?.substring(0, 200) || 'Manga',
          source: 'https://kitsu.io/api/edge',
          sourceType: 'api',
          url: manga.attributes.url,
          publishedAt: manga.attributes.startDate,
        });
      });
    }

    return results;
  } catch (error) {
    console.error(`Error crawling Kitsu: ${error}`);
    return [];
  }
}

async function crawlGenericAPI(url: string): Promise<CrawledItem[]> {
  try {
    const res = await fetchWithTimeout(url);

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();

    if (contentType.includes('application/json')) {
      const json = JSON.parse(text);
      return extractItemsFromJSON(json, url);
    }

    if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
      return extractItemsFromXML(text, url);
    }

    return [{
      title: url,
      content: text.substring(0, 200),
      source: url,
      sourceType: 'api',
      url,
    }];
  } catch (error) {
    console.error(`Error crawling generic API ${url}: ${error}`);
    return [];
  }
}

function extractItemsFromJSON(json: any, source: string): CrawledItem[] {
  const results: CrawledItem[] = [];

  const extractFromArray = (arr: any[], mapping: (item: any) => CrawledItem | null) => {
    if (Array.isArray(arr)) {
      arr.forEach(item => {
        const mapped = mapping(item);
        if (mapped) results.push(mapped);
      });
    }
  };

  const findDataField = (obj: any): any[] | null => {
    if (Array.isArray(obj)) return obj;
    if (obj?.data) return Array.isArray(obj.data) ? obj.data : [obj.data];
    if (obj?.results) return obj.results;
    if (obj?.items) return obj.items;
    if (obj?.media) return Array.isArray(obj.media) ? obj.media : [obj.media];
    return null;
  };

  const dataArray = findDataField(json);
  if (dataArray) {
    extractFromArray(dataArray, (item: any) => ({
      title: item.title || item.name || item.title_japanese || item.canonicalTitle || '',
      content: item.synopsis || item.description || item.content || '',
      source,
      sourceType: 'api',
      url: item.url || item.siteUrl || item.link || '',
      publishedAt: item.aired?.from || item.startDate || item.publishedAt || '',
    }));
  }

  return results.slice(0, 20);
}

function extractItemsFromXML(xml: string, source: string): CrawledItem[] {
  const results: CrawledItem[] = [];

  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const titleMatch = itemXml.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descMatch = itemXml.match(/<description[^>]*>([^<]+)<\/description>/i);
    const linkMatch = itemXml.match(/<link[^>]*>([^<]+)<\/link>/i);
    const pubDateMatch = itemXml.match(/<pubDate[^>]*>([^<]+)<\/pubDate>/i);

    if (titleMatch) {
      results.push({
        title: titleMatch[1].trim(),
        content: descMatch?.[1]?.trim()?.substring(0, 200) || '',
        source,
        sourceType: 'api',
        url: linkMatch?.[1]?.trim() || '',
        publishedAt: pubDateMatch?.[1]?.trim(),
      });
    }
  }

  if (results.length === 0) {
    const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
    while ((match = entryRegex.exec(xml)) !== null) {
      const entryXml = match[1];
      const titleMatch = entryXml.match(/<title[^>]*>([^<]+)<\/title>/i);
      const summaryMatch = entryXml.match(/<summary[^>]*>([^<]+)<\/summary>/i);
      const linkMatch = entryXml.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i);

      if (titleMatch) {
        results.push({
          title: titleMatch[1].trim(),
          content: summaryMatch?.[1]?.trim()?.substring(0, 200) || '',
          source,
          sourceType: 'api',
          url: linkMatch?.[1] || '',
        });
      }
    }
  }

  return results.slice(0, 20);
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

export async function crawlAPI(url: string): Promise<CrawledItem[]> {
  const domain = getDomain(url);

  if (domain.includes('jikan.moe')) {
    return crawlJikan(url);
  }

  if (domain.includes('anilist.co')) {
    return crawlAniList(url);
  }

  if (domain.includes('kitsu.io')) {
    return crawlKitsu(url);
  }

  return crawlGenericAPI(url);
}

export async function crawlAPIs(urls: string[]): Promise<CrawledItem[]> {
  const results = await Promise.all(urls.map(url => crawlAPI(url)));
  return results.flat();
}
