import Parser from 'rss-parser';

export interface CrawledItem {
  title: string;
  content: string;
  source: string;
  sourceType: 'rss';
  url?: string;
  publishedAt?: string;
}

const parser = new Parser({
  timeout: 30000,
});

export async function crawlRSS(url: string): Promise<CrawledItem[]> {
  try {
    const feed = await parser.parseURL(url);
    
    if (!feed.items || feed.items.length === 0) {
      console.warn(`No items found in RSS feed: ${url}`);
      return [];
    }
    
    const items = feed.items.map(item => ({
      title: item.title || '',
      content: item.contentSnippet || item.content || '',
      source: url,
      sourceType: 'rss' as const,
      url: item.link,
      publishedAt: item.pubDate,
    }));
    
    return items;
  } catch (error) {
    console.error(`Error crawling RSS ${url}:`, error);
    return [];
  }
}

export async function crawlRSSFeeds(urls: string[]): Promise<CrawledItem[]> {
  const results = await Promise.all(urls.map(url => crawlRSS(url)));
  return results.flat();
}
