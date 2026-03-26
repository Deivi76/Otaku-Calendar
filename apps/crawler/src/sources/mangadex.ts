export interface CrawledItem {
  title: string;
  content: string;
  source: string;
  sourceType: 'api';
  url?: string;
  publishedAt?: string;
}

const MANGADEX_API = process.env.MANGADEX_API || 'https://api.mangadex.org';
const RATE_LIMIT_DELAY = 200;

let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<any> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_DELAY) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - elapsed));
  }
  lastRequestTime = Date.now();
  
  const res = await fetch(url, {
    signal: AbortSignal.timeout(10000),
  });
  
  if (!res.ok) {
    throw new Error(`MangaDex API error: ${res.status}`);
  }
  
  return res.json();
}

export async function searchManga(title: string): Promise<CrawledItem[]> {
  try {
    const res = await rateLimitedFetch(
      `${MANGADEX_API}/manga?title=${encodeURIComponent(title)}&limit=25&includes[]=cover_art`
    );
    
    return res.data?.map((manga: any) => {
      const cover = manga.relationships.find((r: any) => r.type === 'cover_art');
      const coverUrl = cover?.attributes?.fileName 
        ? `https://uploads.mangadex.org/covers/${manga.id}/${cover.attributes.fileName}.256.jpg`
        : undefined;
      
      return {
        title: manga.attributes.title.en || manga.attributes.title['ja-ro'] || Object.values(manga.attributes.title)[0],
        content: manga.attributes.description.en?.substring(0, 200) || 'Manga',
        source: MANGADEX_API,
        sourceType: 'api',
        url: `https://mangadex.org/manga/${manga.id}`,
        publishedAt: manga.attributes.year ? `${manga.attributes.year}-01-01` : undefined,
      };
    }) || [];
  } catch (error) {
    console.error('Error searching manga from MangaDex:', error);
    return [];
  }
}

export async function fetchLatestManga(): Promise<CrawledItem[]> {
  try {
    const res = await rateLimitedFetch(
      `${MANGADEX_API}/manga?order[latestUploadedChapter]=desc&limit=50&includes[]=cover_art`
    );
    
    return res.data?.map((manga: any) => {
      const cover = manga.relationships.find((r: any) => r.type === 'cover_art');
      const coverUrl = cover?.attributes?.fileName 
        ? `https://uploads.mangadex.org/covers/${manga.id}/${cover.attributes.fileName}.256.jpg`
        : undefined;
      
      return {
        title: manga.attributes.title.en || manga.attributes.title['ja-ro'] || Object.values(manga.attributes.title)[0],
        content: manga.attributes.description.en?.substring(0, 200) || 'Latest manga',
        source: MANGADEX_API,
        sourceType: 'api',
        url: `https://mangadex.org/manga/${manga.id}`,
        publishedAt: manga.attributes.year ? `${manga.attributes.year}-01-01` : undefined,
      };
    }) || [];
  } catch (error) {
    console.error('Error fetching latest manga from MangaDex:', error);
    return [];
  }
}

export async function fetchChapters(mangaId: string): Promise<CrawledItem[]> {
  try {
    const res = await rateLimitedFetch(
      `${MANGADEX_API}/manga/${mangaId}/feed?limit=25&includes[]=scanlation_group`
    );
    
    return res.data?.map((chapter: any) => ({
      title: `Chapter ${chapter.attributes.chapter}`,
      content: chapter.attributes.title || `Scan: ${chapter.relationships.find((r: any) => r.type === 'scanlation_group')?.attributes?.name || 'Unknown'}`,
      source: MANGADEX_API,
      sourceType: 'api',
      url: `https://mangadex.org/chapter/${chapter.id}`,
      publishedAt: chapter.attributes.publishAt,
    })) || [];
  } catch (error) {
    console.error('Error fetching chapters from MangaDex:', error);
    return [];
  }
}

export async function crawlMangaDex(): Promise<CrawledItem[]> {
  const [latest, popular] = await Promise.all([
    fetchLatestManga(),
    searchManga(''),
  ]);
  
  return [...latest, ...popular];
}
