import { crawlRSSFeeds } from '../rss';

export interface CrawledItem {
  title: string;
  content: string;
  source: string;
  sourceType: 'rss';
  url?: string;
  publishedAt?: string;
}

export async function crawlRSS_Group1(): Promise<CrawledItem[]> {
  const feeds = [
    'https://www.animenewsnetwork.com/all/rss.xml?ann-edition=us',
    'https://myanimelist.net/rss/news.xml',
    'https://animecorner.me/feed/',
    'https://feeds.feedburner.com/crunchyroll',
  ];
  
  return await crawlRSSFeeds(feeds);
}
