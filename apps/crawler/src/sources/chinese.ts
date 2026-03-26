export interface CrawledItem {
  title: string;
  content: string;
  source: string;
  sourceType: 'api' | 'rss' | 'site';
  url?: string;
  publishedAt?: string;
}

const BILIBILI_API = process.env.BILIBILI_API || 'https://api.bilibili.com';
const DOUBAN_API = process.env.DOUBAN_API || 'https://api.douban.com/v2';
const IQIYI_API = process.env.IQIYI_API || 'https://www.iq.com';
const TENCENT_API = process.env.TENCENT_API || 'https://v.qq.com';
const WEIBO_API = process.env.WEIBO_API || 'https://m.weibo.cn';

const RATE_LIMIT_DELAY = 300;

let lastRequestTime = 0;

async function rateLimitedFetch(url: string, options?: RequestInit): Promise<any> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_DELAY) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - elapsed));
  }
  lastRequestTime = Date.now();

  const res = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

export async function fetchBilibiliPopular(): Promise<CrawledItem[]> {
  try {
    const res = await rateLimitedFetch(
      `${BILIBILI_API}/x/web-interface/ranking/v3?rid=1&type=1&pn=1&ps=25`
    );

    return res.data?.list?.slice(0, 20).map((anime: any) => ({
      title: anime.title,
      content: anime.desc?.substring(0, 200) || `播放: ${anime.play}, 弹幕: ${anime.danmaku}`,
      source: 'Bilibili',
      sourceType: 'api',
      url: `https://www.bilibili.com/video/${anime.bvid}`,
      publishedAt: anime.pubdate ? new Date(anime.pubdate * 1000).toISOString() : undefined,
    })) || [];
  } catch (error) {
    console.error('Error fetching Bilibili popular:', error);
    return [];
  }
}

export async function fetchBilibiliBangumi(): Promise<CrawledItem[]> {
  try {
    const res = await rateLimitedFetch(
      `${BILIBILI_API}/x/web-interface/ranking/v3?rid=201&type=1&pn=1&ps=25`
    );

    return res.data?.list?.slice(0, 15).map((anime: any) => ({
      title: anime.title,
      content: anime.desc?.substring(0, 200) || `播放: ${anime.play}, 弹幕: ${anime.danmaku}`,
      source: 'Bilibili Bangumi',
      sourceType: 'api',
      url: `https://www.bilibili.com/video/${anime.bvid}`,
      publishedAt: anime.pubdate ? new Date(anime.pubdate * 1000).toISOString() : undefined,
    })) || [];
  } catch (error) {
    console.error('Error fetching Bilibili bangumi:', error);
    return [];
  }
}

export async function fetchDoubanTV(): Promise<CrawledItem[]> {
  try {
    const res = await rateLimitedFetch(
      `${DOUBAN_API}/tv/top250?start=0&count=25`
    );

    return res.subjects?.slice(0, 15).map((drama: any) => ({
      title: drama.title,
      content: `豆瓣评分: ${drama.rating} | ${drama.genres?.join(', ')}`,
      source: 'Douban',
      sourceType: 'api',
      url: drama.alt,
      publishedAt: drama.year ? `${drama.year}-01-01` : undefined,
    })) || [];
  } catch (error) {
    console.error('Error fetching Douban TV:', error);
    return [];
  }
}

export async function fetchDoubanChineseMovies(): Promise<CrawledItem[]> {
  try {
    const res = await rateLimitedFetch(
      `${DOUBAN_API}/search?tag=华语&start=0&count=25`
    );

    return res.subjects?.slice(0, 15).map((movie: any) => ({
      title: movie.title,
      content: `豆瓣评分: ${movie.rating} | ${movie.genres?.join(', ')}`,
      source: 'Douban Chinese Movies',
      sourceType: 'api',
      url: movie.alt,
      publishedAt: movie.year ? `${movie.year}-01-01` : undefined,
    })) || [];
  } catch (error) {
    console.error('Error fetching Douban Chinese movies:', error);
    return [];
  }
}

export async function fetchWeiboTrending(): Promise<CrawledItem[]> {
  try {
    const res = await rateLimitedFetch(
      `${WEIBO_API}/container/getIndexHotFeedTpl?containerid=102803&openApp=0`
    );

    return res.data?.data?.slice(0, 15).map((item: any) => ({
      title: item.title || item.word || item.raw_title || 'Trending',
      content: `${item.desc || item.extr} | 热度: ${item.num}`,
      source: 'Weibo',
      sourceType: 'api',
      url: item.scheme,
      publishedAt: item.timestamp ? new Date(item.timestamp * 1000).toISOString() : undefined,
    })) || [];
  } catch (error) {
    console.error('Error fetching Weibo trending:', error);
    return [];
  }
}

export async function fetchBilibiliAnimeNews(): Promise<CrawledItem[]> {
  try {
    const res = await rateLimitedFetch(
      `${BILIBILI_API}/x/web-interface/ranking/v3?rid=201&type=2&pn=1&ps=20`
    );

    return res.data?.list?.slice(0, 10).map((news: any) => ({
      title: news.title,
      content: news.desc?.substring(0, 200) || `播放: ${news.play}`,
      source: 'Bilibili Anime News',
      sourceType: 'api',
      url: `https://www.bilibili.com/video/${news.bvid}`,
      publishedAt: news.pubdate ? new Date(news.pubdate * 1000).toISOString() : undefined,
    })) || [];
  } catch (error) {
    console.error('Error fetching Bilibili anime news:', error);
    return [];
  }
}

export async function fetchiQIYI热门(): Promise<CrawledItem[]> {
  try {
    const res = await rateLimitedFetch(
      `${IQIYI_API}/片库?pn=0&ps=20&sort=18`
    );

    return [];
  } catch (error) {
    console.error('Error fetching iQIYI:', error);
    return [];
  }
}

export async function fetchTencentDonghua(): Promise<CrawledItem[]> {
  try {
    const res = await rateLimitedFetch(
      `${TENCENT_API}/channel/groot/videolist?pageId=345843&pageSize=20&sort=5`
    );

    return [];
  } catch (error) {
    console.error('Error fetching Tencent donghua:', error);
    return [];
  }
}

export async function crawlChinese(): Promise<CrawledItem[]> {
  const [bilibiliPopular, bilibiliBangumi, doubanTV, doubanMovies, weibo, bilibiliNews] = 
    await Promise.all([
      fetchBilibiliPopular(),
      fetchBilibiliBangumi(),
      fetchDoubanTV(),
      fetchDoubanChineseMovies(),
      fetchWeiboTrending(),
      fetchBilibiliAnimeNews(),
    ]);

  return [...bilibiliPopular, ...bilibiliBangumi, ...doubanTV, ...doubanMovies, ...weibo, ...bilibiliNews];
}
