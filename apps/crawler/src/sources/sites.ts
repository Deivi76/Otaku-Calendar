import * as cheerio from 'cheerio';

export interface CrawledItem {
  title: string;
  content: string;
  source: string;
  sourceType: 'site';
  url?: string;
  publishedAt?: string;
}

const SITE_CONFIGS: Record<string, () => { selectors: string[]; getTitle: string; getContent: string; getUrl: string }> = {
  'animecorner.me': () => ({
    selectors: ['h2 a'],
    getTitle: 'text',
    getContent: 'text',
    getUrl: 'href',
  }),
  'myanimelist.net': () => ({
    selectors: ['.news-unit'],
    getTitle: '.title',
    getContent: '.title',
    getUrl: '.title a',
  }),
  'animeuknews.net': () => ({
    selectors: ['h2 a'],
    getTitle: 'text',
    getContent: 'text',
    getUrl: 'href',
  }),
  'otakuusamagazine.com': () => ({
    selectors: ['h2 a', '.post-title a'],
    getTitle: 'text',
    getContent: 'text',
    getUrl: 'href',
  }),
  'animehunch.com': () => ({
    selectors: ['h2 a', '.entry-title a'],
    getTitle: 'text',
    getContent: 'text',
    getUrl: 'href',
  }),
};

function getSiteConfig(url: string) {
  for (const [domain, config] of Object.entries(SITE_CONFIGS)) {
    if (url.includes(domain)) {
      return config();
    }
  }
  return null;
}

export async function crawlSite(url: string): Promise<CrawledItem[]> {
  try {
    const html = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    }).then(r => r.text());
    
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];

    const siteConfig = getSiteConfig(url);

    if (siteConfig) {
      for (const selector of siteConfig.selectors) {
        $(selector).each((_, el) => {
          let title = '';
          let content = '';
          let itemUrl = '';

          if (siteConfig.getTitle === 'text') {
            title = $(el).text().trim();
          } else {
            title = $(el).find(siteConfig.getTitle).text().trim();
          }

          if (siteConfig.getContent === 'text') {
            content = $(el).text().trim();
          } else {
            content = $(el).find(siteConfig.getContent).text().trim();
          }

          if (siteConfig.getUrl === 'href') {
            itemUrl = $(el).attr('href') || '';
          } else {
            itemUrl = $(el).find(siteConfig.getUrl).attr('href') || '';
          }

          if (title && itemUrl) {
            items.push({
              title,
              content: content.substring(0, 200),
              source: url,
              sourceType: 'site',
              url: itemUrl,
            });
          }
        });

        if (items.length > 0) break;
      }
    } else {
      $('article, .post, .entry').each((_, el) => {
        const title = $(el).find('h2, h3, .title').first().text().trim();
        const content = $(el).find('.content, .excerpt, p').first().text().trim();
        const link = $(el).find('a').attr('href');

        if (title && link) {
          items.push({
            title,
            content: content ? content.substring(0, 200) : title,
            source: url,
            sourceType: 'site',
            url: link,
          });
        }
      });
    }

    return items.slice(0, 10);
  } catch (error) {
    console.error(`Error crawling site ${url}:`, error);
    return [];
  }
}

export async function crawlSites(urls: string[]): Promise<CrawledItem[]> {
  const results = await Promise.all(urls.map(url => crawlSite(url)));
  return results.flat();
}
