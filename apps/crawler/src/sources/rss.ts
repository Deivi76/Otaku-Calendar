import Parser from 'rss-parser';

export interface CrawledItem {
  title: string;
  content: string;
  source: string;
  sourceType: 'rss';
  url?: string;
  publishedAt?: string;
}

const parser = new Parser();

export async function crawlRSS(url: string): Promise<CrawledItem[]> {
  try {
    const feed = await parser.parseURL(url);
    
    return feed.items.map(item => ({
      title: item.title || '',
      content: item.contentSnippet || item.content || '',
      source: url,
      sourceType: 'rss',
      url: item.link,
      publishedAt: item.pubDate,
    }));
  } catch (error) {
    console.error(`Error crawling RSS ${url}:`, error);
    return [];
  }
}

export async function crawlRSSFeeds(urls: string[]): Promise<CrawledItem[]> {
  const results = await Promise.all(urls.map(url => crawlRSS(url)));
  return results.flat();
}
