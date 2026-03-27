import * as cheerio from 'cheerio';
import { getJapaneseSources } from './manager';
import type { SourceConfig } from './manager';

export interface CrawledItem {
  title: string;
  content: string;
  source: string;
  sourceType: 'api' | 'site' | 'rss' | 'community';
  url?: string;
  publishedAt?: string;
}

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function fetchFromAPI(source: SourceConfig): Promise<CrawledItem[]> {
  try {
    if (source.name === 'NHK') {
      return fetchNHK(source.url);
    }
    if (source.name === 'Media Arts DB') {
      return fetchMediaArtsDB(source.url);
    }
    if (source.name === 'Annict') {
      return fetchAnnict(source.url);
    }
    if (source.name === 'Shoboi Calendar') {
      return fetchShoboiCalendar(source.url);
    }
    if (source.name === 'Shangrila') {
      return fetchShangrila(source.url);
    }
    return [];
  } catch (error) {
    console.error(`Error fetching ${source.name}:`, error);
    return [];
  }
}

async function fetchFromSite(source: SourceConfig): Promise<CrawledItem[]> {
  try {
    const html = await fetchHtml(source.url);
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];

    const selectors: Record<string, { title: string; content: string; link: string }[]> = {
      'TV東京': [
        { title: '.program-list-item h3, .anime-item h3, .title', content: '.desc, .synopsis', link: 'a' },
      ],
      'TBS': [
        { title: '.anime-item h3, .program-item h3, .title, .name', content: '.text, .description', link: 'a' },
      ],
      '日本テレビ': [
        { title: '.anime-list-item h3, .program-item h3, .title', content: '.description, .synopsis', link: 'a' },
      ],
      'フジテレビ': [
        { title: '.anime-item h3, .program-item h3, .title', content: '.desc, .synopsis', link: 'a' },
      ],
      'テレ朝': [
        { title: '.anime-item h3, .program-item h3, .title', content: '.desc, .synopsis', link: 'a' },
      ],
      'anime.dbsearch.net': [
        { title: '.result-item .title, .anime-item .title', content: '.description', link: 'a' },
      ],
      '日本アニメ大全': [
        { title: '.anime-item h3, .entry h3, .title', content: '.text, .description', link: 'a' },
      ],
      '声優データベース': [
        { title: '.voice-actor-item h3, .article-item h3, .title', content: '.description', link: 'a' },
      ],
      'アニメ！アニメ！': [
        { title: '.article-title, .post-title, h2 a', content: '', link: 'self' },
      ],
      'animebox': [
        { title: '.post-title, .entry-title, h2 a', content: '', link: 'self' },
      ],
      'ねいろ速報': [
        { title: '.post-title h3 a, h3 a', content: '', link: 'self' },
      ],
      'ASCII.jp アニメ': [
        { title: 'h2 a, .entry-title a', content: '', link: 'self' },
      ],
      'アキバ総研': [
        { title: '.article-title h2 a, h2 a, .post-title', content: '', link: 'self' },
      ],
    };

    const selectorConfig = selectors[source.name];
    if (selectorConfig) {
      for (const config of selectorConfig) {
        if (config.link === 'self') {
          $(config.title).each((_, el) => {
            const title = $(el).text().trim();
            const link = $(el).attr('href');
            if (title && link) {
              items.push({
                title,
                content: title,
                source: source.name,
                sourceType: 'site',
                url: link,
              });
            }
          });
        } else {
          $(config.title).each((_, el) => {
            const title = $(el).text().trim();
            const desc = $(el).find(config.content).text().trim();
            const link = $(el).find(config.link).attr('href');
            if (title) {
              items.push({
                title,
                content: desc || '',
                source: source.name,
                sourceType: 'site',
                url: link ? link.startsWith('http') ? link : `${new URL(source.url).origin}${link}` : undefined,
              });
            }
          });
        }
      }
    }

    return items.slice(0, 20);
  } catch (error) {
    console.error(`Error fetching ${source.name}:`, error);
    return [];
  }
}

async function fetchFromRSS(source: SourceConfig): Promise<CrawledItem[]> {
  try {
    const res = await fetch(source.url, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`RSS error: ${res.status}`);
    const xml = await res.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    const items: CrawledItem[] = [];
    $('item').each((_, el) => {
      const title = $(el).find('title').text().trim();
      const link = $(el).find('link').text().trim();
      const desc = $(el).find('description').text().trim();
      const pubDate = $(el).find('pubDate').text().trim();
      if (title) {
        items.push({
          title,
          content: desc.substring(0, 200),
          source: source.name,
          sourceType: 'rss',
          url: link,
          publishedAt: pubDate,
        });
      }
    });
    return items.slice(0, 15);
  } catch (error) {
    console.error(`Error fetching ${source.name}:`, error);
    return [];
  }
}

async function fetchFromSocial(source: SourceConfig): Promise<CrawledItem[]> {
  try {
    if (source.name.includes('5ch') || source.name.includes('ちゃんねる')) {
      const html = await fetchHtml(source.url);
      const $ = cheerio.load(html);
      const items: CrawledItem[] = [];
      $('.thread-title, .title').each((_, el) => {
        const title = $(el).text().trim();
        const link = $(el).find('a').attr('href');
        if (title && link) {
          items.push({
            title,
            content: title,
            source: source.name,
            sourceType: 'community',
            url: link,
          });
        }
      });
      return items.slice(0, 10);
    }
    if (source.name.includes('はてな')) {
      const html = await fetchHtml(source.url);
      const $ = cheerio.load(html);
      const items: CrawledItem[] = [];
      $('.entry-list-item, .bookmark-item').each((_: any, el: any) => {
        const title = $(el).find('.entry-title').text().trim();
        const url = $(el).find('a').attr('href');
        if (title && url) {
          items.push({
            title,
            content: title,
            source: source.name,
            sourceType: 'community',
            url,
          });
        }
      });
      return items.slice(0, 15);
    }
    return [];
  } catch (error) {
    console.error(`Error fetching ${source.name}:`, error);
    return [];
  }
}

async function fetchNHK(apiUrl: string): Promise<CrawledItem[]> {
  try {
    const apiKey = process.env.NHK_API_KEY;
    if (!apiKey) {
      console.log('NHK API key not configured');
      return [];
    }
    const res = await fetch(apiUrl, {
      headers: { 'X-API-Key': apiKey },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`NHK API error: ${res.status}`);
    const data: any = await res.json();
    return (data?.list?.all?.[0]?.item || []).map((item: any) => ({
      title: item.title,
      content: item.description || item.short_description || '',
      source: 'NHK',
      sourceType: 'api',
      url: item.program_url,
      publishedAt: item.start_time,
    }));
  } catch (error) {
    console.error('Error fetching NHK:', error);
    return [];
  }
}

async function fetchMediaArtsDB(url: string): Promise<CrawledItem[]> {
  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];
    $('.search-result-item').each((_, el) => {
      const title = $(el).find('.title').text().trim();
      const detail = $(el).find('.detail').text().trim();
      const link = $(el).find('a').first().attr('href');
      if (title) {
        items.push({
          title,
          content: detail || title,
          source: 'Media Arts DB',
          sourceType: 'api',
          url: link ? `https://mediaarts-db.bunka.go.jp${link}` : undefined,
        });
      }
    });
    return items.slice(0, 20);
  } catch (error) {
    console.error('Error fetching MediaArtsDB:', error);
    return [];
  }
}

async function fetchAnnict(apiUrl: string): Promise<CrawledItem[]> {
  try {
    const apiKey = process.env.ANNICT_API_KEY;
    if (!apiKey) {
      console.log('Annict API key not configured');
      return [];
    }
    const res = await fetch(apiUrl, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Annict API error: ${res.status}`);
    const data: any = await res.json();
    return (data.works || []).map((work: any) => ({
      title: work.title,
      content: work.title_ja || work.title,
      source: 'Annict',
      sourceType: 'api',
      url: `https://annict.com/works/${work.id}`,
      publishedAt: work.number?.first_air_date,
    }));
  } catch (error) {
    console.error('Error fetching Annict:', error);
    return [];
  }
}

async function fetchShoboiCalendar(apiUrl: string): Promise<CrawledItem[]> {
  try {
    const res = await fetch(apiUrl, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Shoboi API error: ${res.status}`);
    const data: any = await res.json();
    const items: CrawledItem[] = [];
    if (data?.Items) {
      for (const [tid, prog] of Object.entries(data.Items as Record<string, any>)) {
        items.push({
          title: prog.Title,
          content: `PID: ${prog.PID}, Ch: ${prog.ChName}`,
          source: 'Shoboi Calendar',
          sourceType: 'api',
          url: `https://cal.syoboi.jp/tid/${tid}`,
          publishedAt: prog.StartTime,
        });
      }
    }
    return items.slice(0, 30);
  } catch (error) {
    console.error('Error fetching Shoboi:', error);
    return [];
  }
}

async function fetchShangrila(apiUrl: string): Promise<CrawledItem[]> {
  try {
    const apiKey = process.env.SHANGRILA_API_KEY;
    if (!apiKey) {
      console.log('Shangrila API key not configured');
      return [];
    }
    const res = await fetch(apiUrl, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Shangrila API error: ${res.status}`);
    const data: any = await res.json();
    return (data.works || []).map((work: any) => ({
      title: work.title,
      content: work.title_ja || work.title,
      source: 'Shangrila',
      sourceType: 'api',
      url: `https://shangrila.app/works/${work.id}`,
    }));
  } catch (error) {
    console.error('Error fetching Shangrila:', error);
    return [];
  }
}

export async function crawlJapanese(): Promise<CrawledItem[]> {
  console.log('🇯🇵 Starting Japanese sources crawl...');

  const sources = getJapaneseSources();

  const apiPromises = sources.apis.map((source) => fetchFromAPI(source));
  const sitePromises = sources.sites.map((source) => fetchFromSite(source));
  const rssPromises = sources.rss.map((source) => fetchFromRSS(source));
  const socialPromises = sources.social.map((source) => fetchFromSocial(source));

  const [apis, sites, rss, social] = await Promise.all([
    Promise.all(apiPromises),
    Promise.all(sitePromises),
    Promise.all(rssPromises),
    Promise.all(socialPromises),
  ]);

  const results = [
    ...apis.flat(),
    ...sites.flat(),
    ...rss.flat(),
    ...social.flat(),
  ];

  console.log(`   - APIs: ${apis.flat().length}`);
  console.log(`   - Sites: ${sites.flat().length}`);
  console.log(`   - RSS: ${rss.flat().length}`);
  console.log(`   - Social: ${social.flat().length}`);

  return results;
}
