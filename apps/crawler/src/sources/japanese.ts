import * as cheerio from 'cheerio';

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

export async function fetchNHK(): Promise<CrawledItem[]> {
  try {
    const apiKey = process.env.NHK_API_KEY;
    if (!apiKey) {
      console.log('NHK API key not configured');
      return [];
    }
    const res = await fetch('https://api-portal.nhk.or.jp/v1/pg/list/genre/all/date/0?isMulti=true', {
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

export async function fetchMediaArtsDB(): Promise<CrawledItem[]> {
  try {
    const html = await fetchHtml('https://mediaarts-db.bunka.go.jp/mg/search?category=anime&sort=publish');
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];
    $('.search-result-item').each((_, el) => {
      const title = $(el).find('.title').text().trim();
      const detail = $(el).find('.detail').text().trim();
      const url = $(el).find('a').first().attr('href');
      if (title) {
        items.push({
          title,
          content: detail || title,
          source: 'Media Arts DB',
          sourceType: 'api',
          url: url ? `https://mediaarts-db.bunka.go.jp${url}` : undefined,
        });
      }
    });
    return items.slice(0, 20);
  } catch (error) {
    console.error('Error fetching MediaArtsDB:', error);
    return [];
  }
}

export async function fetchAnnict(): Promise<CrawledItem[]> {
  try {
    const apiKey = process.env.ANNICT_API_KEY;
    if (!apiKey) {
      console.log('Annict API key not configured');
      return [];
    }
    const res = await fetch('https://api.annict.com/v1/works?filter_season=2026-spring&fields=id,title,title_ja,number&per_page=50', {
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

export async function fetchShoboiCalendar(): Promise<CrawledItem[]> {
  try {
    const res = await fetch('https://cal.syoboi.jp/cal_ch2/?tid=0&days=7&alt=json', {
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

export async function fetchShangrila(): Promise<CrawledItem[]> {
  try {
    const apiKey = process.env.SHANGRILA_API_KEY;
    if (!apiKey) {
      console.log('Shangrila API key not configured');
      return [];
    }
    const res = await fetch('https://api.annict.net/v1/works?filter_season=2026-spring&fields=id,title,title_ja&per_page=30', {
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

export async function fetchTVTokyo(): Promise<CrawledItem[]> {
  try {
    const html = await fetchHtml('https://www.tv-tokyo.co.jp/anime/');
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];
    $('.program-list-item, .anime-item').each((_, el) => {
      const title = $(el).find('h3, .title').text().trim();
      const desc = $(el).find('.desc, .synopsis').text().trim();
      const link = $(el).find('a').attr('href');
      if (title) {
        items.push({
          title,
          content: desc || '',
          source: 'TV東京',
          sourceType: 'site',
          url: link ? `https://www.tv-tokyo.co.jp${link}` : undefined,
        });
      }
    });
    return items.slice(0, 15);
  } catch (error) {
    console.error('Error fetching TV Tokyo:', error);
    return [];
  }
}

export async function fetchTBSTV(): Promise<CrawledItem[]> {
  try {
    const html = await fetchHtml('https://tbs.co.jp/anime/');
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];
    $('.anime-item, .program-item').each((_, el) => {
      const title = $(el).find('h3, .title, .name').text().trim();
      const desc = $(el).find('.text, .description').text().trim();
      const link = $(el).find('a').attr('href');
      if (title) {
        items.push({
          title,
          content: desc || '',
          source: 'TBS',
          sourceType: 'site',
          url: link ? `https://tbs.co.jp${link}` : undefined,
        });
      }
    });
    return items.slice(0, 15);
  } catch (error) {
    console.error('Error fetching TBS:', error);
    return [];
  }
}

export async function fetchNTV(): Promise<CrawledItem[]> {
  try {
    const html = await fetchHtml('https://www.ntv.co.jp/anime/');
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];
    $('.anime-list-item, .program-item').each((_, el) => {
      const title = $(el).find('h3, .title').text().trim();
      const desc = $(el).find('.description, .synopsis').text().trim();
      const link = $(el).find('a').attr('href');
      if (title) {
        items.push({
          title,
          content: desc || '',
          source: '日本テレビ',
          sourceType: 'site',
          url: link ? `https://www.ntv.co.jp${link}` : undefined,
        });
      }
    });
    return items.slice(0, 15);
  } catch (error) {
    console.error('Error fetching NTV:', error);
    return [];
  }
}

export async function fetchFujiTV(): Promise<CrawledItem[]> {
  try {
    const html = await fetchHtml('https://www.fujitv.co.jp/anime/');
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];
    $('.anime-item, .program-item').each((_, el) => {
      const title = $(el).find('h3, .title').text().trim();
      const desc = $(el).find('.desc, .synopsis').text().trim();
      const link = $(el).find('a').attr('href');
      if (title) {
        items.push({
          title,
          content: desc || '',
          source: 'フジテレビ',
          sourceType: 'site',
          url: link ? `https://www.fujitv.co.jp${link}` : undefined,
        });
      }
    });
    return items.slice(0, 15);
  } catch (error) {
    console.error('Error fetching Fuji TV:', error);
    return [];
  }
}

export async function fetchTVAsahi(): Promise<CrawledItem[]> {
  try {
    const html = await fetchHtml('https://www.tv-asahi.co.jp/anime/');
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];
    $('.anime-item, .program-item').each((_, el) => {
      const title = $(el).find('h3, .title').text().trim();
      const desc = $(el).find('.desc, .synopsis').text().trim();
      const link = $(el).find('a').attr('href');
      if (title) {
        items.push({
          title,
          content: desc || '',
          source: 'テレ朝',
          sourceType: 'site',
          url: link ? `https://www.tv-asahi.co.jp${link}` : undefined,
        });
      }
    });
    return items.slice(0, 15);
  } catch (error) {
    console.error('Error fetching TV Asahi:', error);
    return [];
  }
}

export async function fetchAnimeDB(): Promise<CrawledItem[]> {
  try {
    const html = await fetchHtml('https://anime.dbsearch.net/');
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];
    $('.result-item, .anime-item').each((_, el) => {
      const title = $(el).find('.title').text().trim();
      const desc = $(el).find('.description').text().trim();
      const url = $(el).find('a').attr('href');
      if (title) {
        items.push({
          title,
          content: desc || '',
          source: 'anime.dbsearch.net',
          sourceType: 'site',
          url: url || undefined,
        });
      }
    });
    return items.slice(0, 20);
  } catch (error) {
    console.error('Error fetching AnimeDB:', error);
    return [];
  }
}

export async function fetchAniMedb(): Promise<CrawledItem[]> {
  try {
    const html = await fetchHtml('https://www.animedb.jp/');
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];
    $('.anime-item, .entry').each((_, el) => {
      const title = $(el).find('h3, .title').text().trim();
      const desc = $(el).find('.text, .description').text().trim();
      const url = $(el).find('a').attr('href');
      if (title) {
        items.push({
          title,
          content: desc || '',
          source: '日本アニメ大全',
          sourceType: 'site',
          url: url || undefined,
        });
      }
    });
    return items.slice(0, 20);
  } catch (error) {
    console.error('Error fetching AniMedb:', error);
    return [];
  }
}

export async function fetchSeigura(): Promise<CrawledItem[]> {
  try {
    const html = await fetchHtml('https://www.seigura.com/');
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];
    $('.voice-actor-item, .article-item').each((_, el) => {
      const title = $(el).find('h3, .title').text().trim();
      const desc = $(el).find('.description').text().trim();
      const url = $(el).find('a').attr('href');
      if (title) {
        items.push({
          title,
          content: desc || '',
          source: '声優データベース',
          sourceType: 'site',
          url: url ? `https://www.seigura.com${url}` : undefined,
        });
      }
    });
    return items.slice(0, 20);
  } catch (error) {
    console.error('Error fetching Seigura:', error);
    return [];
  }
}

export async function fetchAnimeAnimeJp(): Promise<CrawledItem[]> {
  try {
    const html = await fetchHtml('https://animeanime.jp/');
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];
    $('.article-title, .post-title, h2 a').each((_, el) => {
      const title = $(el).text().trim();
      const link = $(el).attr('href');
      if (title && link) {
        items.push({
          title,
          content: title,
          source: 'アニメ！アニメ！',
          sourceType: 'site',
          url: link,
        });
      }
    });
    return items.slice(0, 15);
  } catch (error) {
    console.error('Error fetching animeanime.jp:', error);
    return [];
  }
}

export async function fetchAnimeBox(): Promise<CrawledItem[]> {
  try {
    const html = await fetchHtml('https://animebox.net/');
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];
    $('.post-title, .entry-title, h2 a').each((_, el) => {
      const title = $(el).text().trim();
      const link = $(el).attr('href');
      if (title && link) {
        items.push({
          title,
          content: title,
          source: 'animebox',
          sourceType: 'site',
          url: link,
        });
      }
    });
    return items.slice(0, 15);
  } catch (error) {
    console.error('Error fetching animebox:', error);
    return [];
  }
}

export async function fetchNeiro(): Promise<CrawledItem[]> {
  try {
    const html = await fetchHtml('https://neironote.com/');
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];
    $('.post-title, h3 a').each((_, el) => {
      const title = $(el).text().trim();
      const link = $(el).attr('href');
      if (title && link) {
        items.push({
          title,
          content: title,
          source: 'ねいろ速報',
          sourceType: 'site',
          url: link,
        });
      }
    });
    return items.slice(0, 15);
  } catch (error) {
    console.error('Error fetching neiro:', error);
    return [];
  }
}

export async function fetchASCIIAnime(): Promise<CrawledItem[]> {
  try {
    const html = await fetchHtml('https://ascii.jp/elem/000/000/000/');
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];
    $('h2 a, .entry-title a').each((_, el) => {
      const title = $(el).text().trim();
      const link = $(el).attr('href');
      if (title && link) {
        items.push({
          title,
          content: title,
          source: 'ASCII.jp アニメ',
          sourceType: 'site',
          url: link,
        });
      }
    });
    return items.slice(0, 15);
  } catch (error) {
    console.error('Error fetching ASCII anime:', error);
    return [];
  }
}

export async function fetchAkibaSouken(): Promise<CrawledItem[]> {
  try {
    const html = await fetchHtml('https://akiba-souken.com/');
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];
    $('.article-title, h2 a, .post-title').each((_, el) => {
      const title = $(el).text().trim();
      const link = $(el).attr('href');
      if (title && link) {
        items.push({
          title,
          content: title,
          source: 'アキバ総研',
          sourceType: 'site',
          url: link,
        });
      }
    });
    return items.slice(0, 15);
  } catch (error) {
    console.error('Error fetching Akiba Souken:', error);
    return [];
  }
}

export async function fetchGo5chAnime(): Promise<CrawledItem[]> {
  try {
    const html = await fetchHtml('https://egg.5ch.net/10/)');
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];
    $('.thread-title, .title').each((_, el) => {
      const title = $(el).text().trim();
      const link = $(el).find('a').attr('href');
      if (title && link) {
        items.push({
          title,
          content: title,
          source: '5ちゃんねる (アニメ板)',
          sourceType: 'community',
          url: link,
        });
      }
    });
    return items.slice(0, 10);
  } catch (error) {
    console.error('Error fetching 5ch anime:', error);
    return [];
  }
}

export async function fetchHatenaAnime(): Promise<CrawledItem[]> {
  try {
    const html = await fetchHtml('https://b.hatena.ne.jp/keywordlist?word=アニメ');
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];
    $('.entry-list-item, .bookmark-item').each((_: any, el: any) => {
      const title = $(el).find('.entry-title').text().trim();
      const url = $(el).find('a').attr('href');
      if (title && url) {
        items.push({
          title,
          content: title,
          source: 'はてなブックマーク',
          sourceType: 'community',
          url,
        });
      }
    });
    return items.slice(0, 15);
  } catch (error) {
    console.error('Error fetching Hatena:', error);
    return [];
  }
}

export async function fetchAnimeAnimeRSS(): Promise<CrawledItem[]> {
  try {
    const res = await fetch('https://animeanime.jp/feed', {
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
          source: 'アニメ！アニメ！ RSS',
          sourceType: 'rss',
          url: link,
          publishedAt: pubDate,
        });
      }
    });
    return items.slice(0, 15);
  } catch (error) {
    console.error('Error fetching animeanime RSS:', error);
    return [];
  }
}

export async function fetchAnimeBoxRSS(): Promise<CrawledItem[]> {
  try {
    const res = await fetch('https://animebox.net/feed', {
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
          source: 'AnimeBox RSS',
          sourceType: 'rss',
          url: link,
          publishedAt: pubDate,
        });
      }
    });
    return items.slice(0, 15);
  } catch (error) {
    console.error('Error fetching animebox RSS:', error);
    return [];
  }
}

export async function crawlJapanese(): Promise<CrawledItem[]> {
  console.log('🇯🇵 Starting Japanese sources crawl...');
  
  const [nhk, mediaartsdb, annict, shoboi, shangrila, tvTokyo, tbs, ntv, fuji, tvAsahi, animeDB, animedb, seigura, animeAnime, animeBox, neiro, ascii, akiba, go5ch, hatena, animeRSS, boxRSS] = await Promise.all([
    fetchNHK(),
    fetchMediaArtsDB(),
    fetchAnnict(),
    fetchShoboiCalendar(),
    fetchShangrila(),
    fetchTVTokyo(),
    fetchTBSTV(),
    fetchNTV(),
    fetchFujiTV(),
    fetchTVAsahi(),
    fetchAnimeDB(),
    fetchAniMedb(),
    fetchSeigura(),
    fetchAnimeAnimeJp(),
    fetchAnimeBox(),
    fetchNeiro(),
    fetchASCIIAnime(),
    fetchAkibaSouken(),
    fetchGo5chAnime(),
    fetchHatenaAnime(),
    fetchAnimeAnimeRSS(),
    fetchAnimeBoxRSS(),
  ]);

  const results = [
    ...nhk,
    ...mediaartsdb,
    ...annict,
    ...shoboi,
    ...shangrila,
    ...tvTokyo,
    ...tbs,
    ...ntv,
    ...fuji,
    ...tvAsahi,
    ...animeDB,
    ...animedb,
    ...seigura,
    ...animeAnime,
    ...animeBox,
    ...neiro,
    ...ascii,
    ...akiba,
    ...go5ch,
    ...hatena,
    ...animeRSS,
    ...boxRSS,
  ];

  console.log(`   - APIs: ${nhk.length + mediaartsdb.length + annict.length + shoboi.length + shangrila.length}`);
  console.log(`   - Broadcasters: ${tvTokyo.length + tbs.length + ntv.length + fuji.length + tvAsahi.length}`);
  console.log(`   - Databases: ${animeDB.length + animedb.length + seigura.length}`);
  console.log(`   - News: ${animeAnime.length + animeBox.length + neiro.length + ascii.length + akiba.length}`);
  console.log(`   - Community: ${go5ch.length + hatena.length}`);
  console.log(`   - RSS: ${animeRSS.length + boxRSS.length}`);

  return results;
}
