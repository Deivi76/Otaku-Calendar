import { crawlRSS } from '../rss';
import { getSourcesByTypeAndCategory, type SourceConfig } from '../manager';

export interface CrawledItem {
  title: string;
  content: string;
  source: string;
  sourceType: 'rss';
  url?: string;
  publishedAt?: string;
}

async function fetchRSS(source: SourceConfig): Promise<CrawledItem[]> {
  if (!source.url) return [];
  try {
    return await crawlRSS(source.url);
  } catch (error) {
    console.error(`Error crawling RSS ${source.name}:`, error);
    return [];
  }
}

export async function crawlRSS_Group1(): Promise<CrawledItem[]> {
  const allNewsSources = getSourcesByTypeAndCategory('rss', 'news');
  const filteredSources = allNewsSources
    .filter(source => source.reliability >= 0.7)
    .slice(0, 50);
  
  const results = await Promise.all(
    filteredSources.map(source => fetchRSS(source))
  );
  
  return results.flat();
}