import * as cheerio from 'cheerio';

export interface CrawledItem {
  title: string;
  content: string;
  source: string;
  sourceType: 'api' | 'site' | 'rss' | 'community';
  url?: string;
  publishedAt?: string;
}

async function fetchWithTimeout(url: string, timeout = 15000): Promise<Response> {
  return fetch(url, {
    signal: AbortSignal.timeout(timeout),
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/html, application/xml',
      'Accept-Language': 'en-US,en;q=0.9,ko;q=0.8',
    },
  });
}

export async function fetchWebtoon(): Promise<CrawledItem[]> {
  try {
    const dailyUrl = 'https://www.webtoons.com/dailyScheduleList?day=all&sort=DAY&webtoonType=WEBTOON';
    const html = await fetchWithTimeout(dailyUrl).then(r => r.text());
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];

    $('.daily-card-item').each((_, el) => {
      const title = $(el).find('.name').text().trim();
      const link = $(el).find('a').attr('href');
      const thumbnail = $(el).find('img').attr('src');
      const genre = $(el).find('.genre').text().trim();

      if (title && link) {
        items.push({
          title,
          content: `Genre: ${genre} | Source: WEBTOON | ${thumbnail || ''}`.trim(),
          source: 'webtoons.com',
          sourceType: 'site',
          url: link,
        });
      }
    });

    return items.slice(0, 20);
  } catch (error) {
    console.error('Error fetching WEBTOON:', error);
    return [];
  }
}

export async function fetchKakaoPage(): Promise<CrawledItem[]> {
  try {
    const apiUrl = 'https://page.kakao.com/api/v1/home/daily?size=20&page=0';
    const response = await fetchWithTimeout(apiUrl);
    const data = (await response.json()) as {
      data?: {
        banners?: Array<{ title: string; linkUrl: string; thumbnailUrl: string }>;
        webtoons?: Array<{ title: string; linkUrl: string; thumbnailUrl: string; genre: string }>;
        dayList?: Array<{ title: string; url: string; thumbnailUrl: string; genre: string; titleId?: string }>;
      };
    };
    const items: CrawledItem[] = [];

    if (data.data?.banners) {
      data.data.banners.forEach((banner) => {
        items.push({
          title: banner.title,
          content: `Source: Kakao Page | ${banner.thumbnailUrl || ''}`.trim(),
          source: 'page.kakao.com',
          sourceType: 'api',
          url: `https://page.kakao.com${banner.linkUrl}`,
        });
      });
    }

    if (data.data?.webtoons) {
      data.data.webtoons.forEach((webtoon) => {
        items.push({
          title: webtoon.title,
          content: `Genre: ${webtoon.genre} | Source: Kakao Page`.trim(),
          source: 'page.kakao.com',
          sourceType: 'api',
          url: `https://page.kakao.com${webtoon.linkUrl}`,
        });
      });
    }

    if (data.data?.dayList) {
      data.data.dayList.forEach((webtoon) => {
        items.push({
          title: webtoon.title,
          content: `Genre: ${webtoon.genre} | Source: Kakao Page`.trim(),
          source: 'page.kakao.com',
          sourceType: 'api',
          url: webtoon.url || (webtoon.titleId ? `https://page.kakao.com/webtoon/view?titleId=${webtoon.titleId}` : undefined),
        });
      });
    }

    return items.slice(0, 20);
  } catch (error) {
    console.error('Error fetching Kakao Page:', error);
    return [];
  }
}

export async function fetchNaverWebtoon(): Promise<CrawledItem[]> {
  try {
    const apiUrl = 'https://comic.naver.com/api/rpc/webtoon/today?size=30';
    const response = await fetchWithTimeout(apiUrl);
    const data = (await response.json()) as {
      data?: {
        dayList?: Array<{ title: string; url: string; thumbnailUrl: string; genre: string; titleId?: string }>;
        webtoons?: Array<{ title: string; url: string; thumbnailUrl: string; genre: string; titleId?: string }>;
      };
    };
    const items: CrawledItem[] = [];

    if (data.data) {
      const webtoons = data.data.dayList || data.data.webtoons || [];
      webtoons.forEach((webtoon) => {
        items.push({
          title: webtoon.title,
          content: `Genre: ${webtoon.genre} | Source: Naver Webtoon`.trim(),
          source: 'comic.naver.com',
          sourceType: 'api',
          url: webtoon.url || `https://comic.naver.com/webtoon/detail?titleId=${webtoon.titleId || ''}`,
        });
      });
    }

    return items.slice(0, 20);
  } catch (error) {
    console.error('Error fetching Naver Webtoon:', error);
    return [];
  }
}

export async function fetchTapas(): Promise<CrawledItem[]> {
  try {
    const apiUrl = 'https://tapas.io/api/v1/series/filter?filter=trending&size=20&page=1';
    const response = await fetchWithTimeout(apiUrl);
    const data = (await response.json()) as {
      data?: Array<{ title: string; url: string; coverUrl: string; category: string }>;
    };
    const items: CrawledItem[] = [];

    if (data.data) {
      data.data.forEach((series) => {
        items.push({
          title: series.title,
          content: `Category: ${series.category} | Source: Tapas`.trim(),
          source: 'tapas.io',
          sourceType: 'api',
          url: `https://tapas.io/series/${series.url}`,
        });
      });
    }

    return items.slice(0, 20);
  } catch (error) {
    console.error('Error fetching Tapas:', error);
    return [];
  }
}

export async function fetchManta(): Promise<CrawledItem[]> {
  try {
    const apiUrl = 'https://manta.net/api/series/popular?size=20&page=1';
    const response = await fetchWithTimeout(apiUrl);
    const data = (await response.json()) as {
      data?: Array<{ title: string; url: string; thumbnailUrl: string; genre: string }>;
    };
    const items: CrawledItem[] = [];

    if (data.data) {
      data.data.forEach((series) => {
        items.push({
          title: series.title,
          content: `Genre: ${series.genre} | Source: Manta`.trim(),
          source: 'manta.net',
          sourceType: 'api',
          url: `https://manta.net${series.url}`,
        });
      });
    }

    return items.slice(0, 20);
  } catch (error) {
    console.error('Error fetching Manta:', error);
    return [];
  }
}

export async function fetchLezhin(): Promise<CrawledItem[]> {
  try {
    const html = await fetchWithTimeout('https://www.lezhin.com/ko/bestsellers').then(r => r.text());
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];

    $('.lz-comic__item').each((_, el) => {
      const title = $(el).find('.lz-comic__title').text().trim();
      const link = $(el).find('a').attr('href');
      const thumbnail = $(el).find('img').attr('src');

      if (title && link) {
        items.push({
          title,
          content: `Source: Lezhin | ${thumbnail || ''}`.trim(),
          source: 'lezhin.com',
          sourceType: 'site',
          url: `https://www.lezhin.com${link}`,
        });
      }
    });

    return items.slice(0, 20);
  } catch (error) {
    console.error('Error fetching Lezhin:', error);
    return [];
  }
}

export async function fetchTappytoon(): Promise<CrawledItem[]> {
  try {
    const html = await fetchWithTimeout('https://www.tappytoon.com/en/shelf/series').then(r => r.text());
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];

    $('.series-card').each((_, el) => {
      const title = $(el).find('.series-title').text().trim();
      const link = $(el).find('a').attr('href');

      if (title && link) {
        items.push({
          title,
          content: 'Source: Tappytoon',
          source: 'tappytoon.com',
          sourceType: 'site',
          url: `https://www.tappytoon.com${link}`,
        });
      }
    });

    return items.slice(0, 20);
  } catch (error) {
    console.error('Error fetching Tappytoon:', error);
    return [];
  }
}

export async function fetchToomics(): Promise<CrawledItem[]> {
  try {
    const html = await fetchWithTimeout('https://www.toomics.com/en/webtoon/rank/daily').then(r => r.text());
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];

    $('.toon-card').each((_, el) => {
      const title = $(el).find('.toon-title').text().trim();
      const link = $(el).find('a').attr('href');

      if (title && link) {
        items.push({
          title,
          content: 'Source: Toomics',
          source: 'toomics.com',
          sourceType: 'site',
          url: `https://www.toomics.com${link}`,
        });
      }
    });

    return items.slice(0, 20);
  } catch (error) {
    console.error('Error fetching Toomics:', error);
    return [];
  }
}

export async function fetchManhwaClub(): Promise<CrawledItem[]> {
  try {
    const html = await fetchWithTimeout('https://manhwaclip.com').then(r => r.text());
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];

    $('article, .post, .webtoon-item').each((_, el) => {
      const title = $(el).find('h2, h3, .title, .webtoon-title').first().text().trim();
      const link = $(el).find('a').attr('href');

      if (title && link) {
        items.push({
          title,
          content: `Source: ManhwaClub`,
          source: 'manhwaclip.com',
          sourceType: 'site',
          url: link,
        });
      }
    });

    return items.slice(0, 15);
  } catch (error) {
    console.error('Error fetching ManhwaClub:', error);
    return [];
  }
}

export async function fetchManhwaUS(): Promise<CrawledItem[]> {
  try {
    const html = await fetchWithTimeout('https://manhwa.us').then(r => r.text());
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];

    $('.webtoon-item, .manga-item, article').each((_, el) => {
      const title = $(el).find('h2, h3, .title').first().text().trim();
      const link = $(el).find('a').attr('href');

      if (title && link) {
        items.push({
          title,
          content: 'Source: ManhwaUS',
          source: 'manhwa.us',
          sourceType: 'site',
          url: link,
        });
      }
    });

    return items.slice(0, 15);
  } catch (error) {
    console.error('Error fetching ManhwaUS:', error);
    return [];
  }
}

export async function fetchReadManhwa(): Promise<CrawledItem[]> {
  try {
    const html = await fetchWithTimeout('https://readmanhwa.com').then(r => r.text());
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];

    $('.webtoon-item, .series-item, article').each((_, el) => {
      const title = $(el).find('h2, h3, .title').first().text().trim();
      const link = $(el).find('a').attr('href');

      if (title && link) {
        items.push({
          title,
          content: 'Source: ReadManhwa',
          source: 'readmanhwa.com',
          sourceType: 'site',
          url: link,
        });
      }
    });

    return items.slice(0, 15);
  } catch (error) {
    console.error('Error fetching ReadManhwa:', error);
    return [];
  }
}

export async function fetchRedditManhwa(): Promise<CrawledItem[]> {
  try {
    const apiUrl = 'https://www.reddit.com/r/manhwa.json?limit=25';
    const response = await fetchWithTimeout(apiUrl);
    const data = (await response.json()) as {
      data?: {
        children?: Array<{ data: { title: string; url: string; selftext: string; created_utc: number } }>;
      };
    };
    const items: CrawledItem[] = [];

    if (data.data?.children) {
      data.data.children.forEach((post) => {
        const { title, url, selftext, created_utc } = post.data;
        if (title && url) {
          items.push({
            title,
            content: selftext || `Source: Reddit r/manhwa`,
            source: 'reddit.com/r/manhwa',
            sourceType: 'community',
            url: url,
            publishedAt: new Date(created_utc * 1000).toISOString(),
          });
        }
      });
    }

    return items.slice(0, 20);
  } catch (error) {
    console.error('Error fetching Reddit r/manhwa:', error);
    return [];
  }
}

export async function fetchWebtoonRSS(): Promise<CrawledItem[]> {
  try {
    const feedUrl = 'https://www.webtoons.com/en/rss/episode?titleId=703843';
    const response = await fetchWithTimeout(feedUrl);
    const xml = await response.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    const items: CrawledItem[] = [];

    $('item').each((_, el) => {
      const title = $(el).find('title').text();
      const link = $(el).find('link').text();
      const description = $(el).find('description').text();
      const pubDate = $(el).find('pubDate').text();

      if (title && link) {
        items.push({
          title,
          content: description || 'Source: WEBTOON RSS',
          source: feedUrl,
          sourceType: 'rss',
          url: link,
          publishedAt: pubDate,
        });
      }
    });

    return items.slice(0, 15);
  } catch (error) {
    console.error('Error fetching WEBTOON RSS:', error);
    return [];
  }
}

export async function fetchKakaoStory(): Promise<CrawledItem[]> {
  try {
    const html = await fetchWithTimeout('https://story.kakao.com/ch/webtoons').then(r => r.text());
    const $ = cheerio.load(html);
    const items: CrawledItem[] = [];

    $('.list_webtoon .item').each((_, el) => {
      const title = $(el).find('.title').text().trim();
      const link = $(el).find('a').attr('href');

      if (title && link) {
        items.push({
          title,
          content: 'Source: KakaoStory',
          source: 'story.kakao.com',
          sourceType: 'site',
          url: link,
        });
      }
    });

    return items.slice(0, 15);
  } catch (error) {
    console.error('Error fetching KakaoStory:', error);
    return [];
  }
}

export async function crawlManhwa(): Promise<CrawledItem[]> {
  const results = await Promise.allSettled([
    fetchWebtoon(),
    fetchKakaoPage(),
    fetchNaverWebtoon(),
    fetchTapas(),
    fetchManta(),
    fetchLezhin(),
    fetchTappytoon(),
    fetchToomics(),
    fetchManhwaClub(),
    fetchManhwaUS(),
    fetchReadManhwa(),
    fetchRedditManhwa(),
    fetchWebtoonRSS(),
    fetchKakaoStory(),
  ]);

  const allItems: CrawledItem[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value);
    } else {
      const sourceNames = [
        'WEBTOON', 'KakaoPage', 'NaverWebtoon', 'Tapas', 'Manta',
        'Lezhin', 'Tappytoon', 'Toomics', 'ManhwaClub', 'ManhwaUS',
        'ReadManhwa', 'RedditManhwa', 'WebtoonRSS', 'KakaoStory'
      ];
      console.warn(`Failed to fetch from ${sourceNames[index]}:`, result.reason);
    }
  });

  return allItems;
}
