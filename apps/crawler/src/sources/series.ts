import { getSeriesSources } from './manager';
import type { SourceConfig } from './manager';

export interface CrawledItem {
  title: string;
  content: string;
  source: string;
  sourceType: 'api' | 'rss' | 'site';
  url?: string;
  publishedAt?: string;
}

async function fetchFromAPI(source: SourceConfig, endpoint: string, options?: RequestInit): Promise<CrawledItem[]> {
  try {
    const res = await fetch(`${source.url}${endpoint}`, {
      ...options,
      signal: AbortSignal.timeout(10000),
    });
    
    if (!res.ok) {
      throw new Error(`${source.name} API error: ${res.status}`);
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching from ${source.name}:`, error);
    return [];
  }
}

export async function crawlSeries(): Promise<CrawledItem[]> {
  const sources = getSeriesSources();
  
  const results: CrawledItem[] = [];
  
  for (const api of sources.apis) {
    try {
      if (api.name === 'TVmaze') {
        const data = await fetchFromAPI(api, '/shows?page=1');
        if (data.length > 0) results.push(...data);
      } else if (api.name === 'Trakt') {
        const showsRes = await fetch(`${api.url}/shows/popular?limit=25`, {
          headers: {
            'Content-Type': 'application/json',
            'trakt-api-key': process.env.TRAKT_CLIENT_ID || '',
            'trakt-api-version': '2',
          },
          signal: AbortSignal.timeout(10000),
        });
        if (showsRes.ok) {
          const shows = (await showsRes.json()) as any[];
          results.push(...shows.map((s: any) => ({
            title: s.title,
            content: `${s.year} - ${s.overview?.substring(0, 150) || 'TV Series'}`,
            source: api.name,
            sourceType: 'api' as const,
            url: s.ids?.trakt ? `https://trakt.tv/shows/${s.ids.trakt}` : undefined,
            publishedAt: s.first_aired,
          })));
        }
      } else if (api.name === 'TMDB TV') {
        const apiKey = process.env.TMDB_API_KEY;
        if (apiKey) {
          const res = await fetch(`${api.url}/popular?api_key=${apiKey}&language=en-US&page=1`, {
            signal: AbortSignal.timeout(10000),
          });
          if (res.ok) {
            const data = (await res.json()) as any;
            results.push(...(data.results || []).slice(0, 25).map((show: any) => ({
              title: show.name,
              content: show.overview?.substring(0, 200) || 'TV Series',
              source: api.name,
              sourceType: 'api' as const,
              url: `https://www.themoviedb.org/tv/${show.id}`,
              publishedAt: show.first_air_date,
            })));
          }
        }
      } else if (api.name === 'MyDramaList') {
        const res = await fetch(`${api.url}/shows`, {
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          const data = (await res.json()) as any[];
          results.push(...(data || []).slice(0, 20).map((drama: any) => ({
            title: drama.title || drama.original_title,
            content: drama.synopsis?.substring(0, 200) || 'Asian Drama',
            source: api.name,
            sourceType: 'api' as const,
            url: drama.url,
            publishedAt: drama.year,
          })));
        }
      }
    } catch (error) {
      console.error(`Error fetching from API ${api.name}:`, error);
    }
  }
  
  const Parser = (await import('rss-parser')).default;
  const parser = new Parser({ timeout: 30000 });
  
  for (const rss of sources.rss) {
    try {
      const feed = await parser.parseURL(rss.url);
      const items = feed.items.slice(0, 10).map(item => ({
        title: item.title || '',
        content: item.contentSnippet || item.content || '',
        source: rss.name,
        sourceType: 'rss' as const,
        url: item.link,
        publishedAt: item.pubDate,
      }));
      results.push(...items);
    } catch (error) {
      console.error(`Error crawling RSS ${rss.name}:`, error);
    }
  }
  
  return results;
}
