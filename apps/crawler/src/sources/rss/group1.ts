import { crawlRSS } from '../rss';
import { getSourcesByTypeAndGroup, type SourceConfig } from '../manager';

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
  const allNewsSources = getSourcesByTypeAndGroup('rss', 'group1');
  
  const results = await Promise.all(
    allNewsSources.slice(0, 50).map(source => fetchRSS(source))
  );
  
  return results.flat();
}