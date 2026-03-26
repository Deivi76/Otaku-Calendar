export interface CrawledItem {
  title: string;
  content: string;
  source: string;
  sourceType: 'api';
  url?: string;
  publishedAt?: string;
}

const KITSU_API = process.env.KITSU_API || 'https://kitsu.io/api/edge';
const RATE_LIMIT_DELAY = 250;

async function rateLimitedFetch(url: string): Promise<any> {
  await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
  
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.api+json',
      'User-Agent': 'OtakuCalendar/1.0',
    },
    signal: AbortSignal.timeout(10000),
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Kitsu API error: ${res.status} - ${text.substring(0, 100)}`);
  }
  
  return res.json();
}

export async function fetchSeasonAnime(year: number, season: string): Promise<CrawledItem[]> {
  try {
    const res = await rateLimitedFetch(
      `${KITSU_API}/anime?filter[seasonYear]=${year}&filter[season]=${season}&sort=-userCount&page[limit]=20`
    );
    
    return res.data?.map((anime: any) => ({
      title: anime.attributes.titles.en_jp || anime.attributes.titles.en || anime.attributes.canonicalTitle,
      content: anime.attributes.synopsis?.substring(0, 200) || 'Currently airing',
      source: KITSU_API,
      sourceType: 'api',
      url: anime.attributes.url,
      publishedAt: anime.attributes.startDate,
    })) || [];
  } catch (error) {
    console.error('Error fetching season from Kitsu:', error);
    return [];
  }
}

export async function fetchTrendingAnime(): Promise<CrawledItem[]> {
  try {
    const res = await rateLimitedFetch(
      `${KITSU_API}/anime?sort=-userCount&page[limit]=20`
    );
    
    return res.data?.map((anime: any) => ({
      title: anime.attributes.titles.en_jp || anime.attributes.titles.en || anime.attributes.canonicalTitle,
      content: `Rating: ${anime.attributes.averageRating || 'N/A'}`,
      source: KITSU_API,
      sourceType: 'api',
      url: anime.attributes.url,
      publishedAt: anime.attributes.startDate,
    })) || [];
  } catch (error) {
    console.error('Error fetching trending from Kitsu:', error);
    return [];
  }
}

export async function fetchManga(): Promise<CrawledItem[]> {
  try {
    const res = await rateLimitedFetch(
      `${KITSU_API}/manga?sort=-userCount&page[limit]=20`
    );
    
    return res.data?.map((manga: any) => ({
      title: manga.attributes.titles.en_jp || manga.attributes.titles.en || manga.attributes.canonicalTitle,
      content: manga.attributes.synopsis?.substring(0, 200) || 'Manga',
      source: KITSU_API,
      sourceType: 'api',
      url: manga.attributes.url,
      publishedAt: manga.attributes.startDate,
    })) || [];
  } catch (error) {
    console.error('Error fetching manga from Kitsu:', error);
    return [];
  }
}

export async function crawlKitsu(): Promise<CrawledItem[]> {
  const now = new Date();
  const year = now.getFullYear();
  const season = ['winter', 'spring', 'summer', 'fall'][Math.floor(now.getMonth() / 3)];
  
  const [seasonAnime, trending, manga] = await Promise.all([
    fetchSeasonAnime(year, season),
    fetchTrendingAnime(),
    fetchManga(),
  ]);
  
  return [...seasonAnime, ...trending, ...manga];
}
