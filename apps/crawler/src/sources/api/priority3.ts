import { getSourcesByTypeAndGroup, type SourceConfig } from '../manager';
import type { CrawledItem } from '../../utils/queue';

async function fetchFromApi(api: SourceConfig): Promise<CrawledItem[]> {
  try {
    const res = await fetch(api.url, {
      signal: AbortSignal.timeout(10000),
    });
    
    if (!res.ok) {
      return [];
    }
    
    const json: any = await res.json();
    
    if (!json.data) {
      return [];
    }
    
    const items = Array.isArray(json.data) ? json.data : [json.data];
    
    return items.slice(0, 10).map((item: any) => ({
      title: String(item.title?.romaji || item.title?.en || item.title?.en_jp || item.name || item.attributes?.titles?.en_jp || 'Unknown'),
      content: String(item.description || item.synopsis || item.content || item.attributes?.synopsis || 'No description'),
      source: api.url,
      sourceType: 'api' as const,
      url: String(item.url || item.siteUrl || item.attributes?.url || ''),
      publishedAt: item.aired?.from || item.startDate || item.attributes?.startDate || undefined,
    }));
  } catch {
    return [];
  }
}

export async function crawlAPI_Priority3(): Promise<CrawledItem[]> {
  const animeApis = getSourcesByTypeAndGroup('api', 'priority3');
  
  const results = await Promise.all(
    animeApis.slice(0, 20).map(api => fetchFromApi(api))
  );
  
  return results.flat();
}
