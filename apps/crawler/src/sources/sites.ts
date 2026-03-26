import * as cheerio from 'cheerio';

export interface CrawledItem {
  title: string;
  content: string;
  source: string;
  sourceType: 'site';
  url?: string;
  publishedAt?: string;
}

export async function crawlSite(url: string): Promise<CrawledItem[]> {
  try {
    const html = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    }).then(r => r.text());
    
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];

    $('article, .post, .entry').each((_, el) => {
      const title = $(el).find('h2, h3, .title').text().trim();
      const content = $(el).find('.content, .excerpt, p').text().trim();
      const link = $(el).find('a').attr('href');

      if (title && content) {
        items.push({
          title,
          content,
          source: url,
          sourceType: 'site',
          url,
        });
      }
    });

    return items;
  } catch (error) {
    console.error(`Error crawling site ${url}:`, error);
    return [];
  }
}

export async function crawlSites(urls: string[]): Promise<CrawledItem[]> {
  const results = await Promise.all(urls.map(url => crawlSite(url)));
  return results.flat();
}
