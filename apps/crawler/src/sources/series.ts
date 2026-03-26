export interface CrawledItem {
  title: string;
  content: string;
  source: string;
  sourceType: 'api' | 'rss' | 'site';
  url?: string;
  publishedAt?: string;
}

const TVMAZE_API = 'https://api.tvmaze.com';
const TRAKT_API = 'https://api.trakt.tv';
const TMDB_API = process.env.TMDB_API || 'https://api.themoviedb.org/3';
const SIMKL_API = 'https://api.simkl.com';

export async function fetchTVMazeShows(): Promise<CrawledItem[]> {
  try {
    const res = await fetch(`${TVMAZE_API}/shows?page=1`, {
      signal: AbortSignal.timeout(10000),
    });
    
    if (!res.ok) {
      throw new Error(`TVMaze API error: ${res.status}`);
    }
    
    const data: any = await res.json();
    const shows = Array.isArray(data) ? data : data.shows || [];
    
    return shows.slice(0, 25).map((show: any) => ({
      title: show.name || show.title,
      content: show.summary?.replace(/<[^>]*>/g, '').substring(0, 200) || 'TV Series',
      source: TVMAZE_API,
      sourceType: 'api' as const,
      url: show.officialSite || show.url,
      publishedAt: show.premiered,
    }));
  } catch (error) {
    console.error('Error fetching TVMaze shows:', error);
    return [];
  }
}

export async function fetchTVMazeSchedule(): Promise<CrawledItem[]> {
  try {
    const today = new Date();
    
    const res = await fetch(`${TVMAZE_API}/schedule?country=US&date=${today.toISOString().split('T')[0]}`, {
      signal: AbortSignal.timeout(10000),
    });
    
    if (!res.ok) {
      throw new Error(`TVMaze API error: ${res.status}`);
    }
    
    const data: any = await res.json();
    const schedule = Array.isArray(data) ? data : [];
    
    return schedule.map((item: any) => ({
      title: item.show?.name || 'Unknown',
      content: `Episode: ${item.name || 'TBA'}`,
      source: TVMAZE_API,
      sourceType: 'api' as const,
      url: item.show?.officialSite || item.show?.url,
      publishedAt: item.airstamp,
    }));
  } catch (error) {
    console.error('Error fetching TVMaze schedule:', error);
    return [];
  }
}

export async function fetchTVMaze(): Promise<CrawledItem[]> {
  const [shows, schedule] = await Promise.all([
    fetchTVMazeShows(),
    fetchTVMazeSchedule(),
  ]);
  
  return [...shows, ...schedule];
}

export async function fetchTraktShows(): Promise<CrawledItem[]> {
  try {
    const res = await fetch(`${TRAKT_API}/shows/popular?limit=25`, {
      signal: AbortSignal.timeout(10000),
      headers: {
        'Content-Type': 'application/json',
        'trakt-api-key': process.env.TRAKT_CLIENT_ID || 'YOUR_TRAKT_CLIENT_ID',
        'trakt-api-version': '2',
      },
    });
    
    if (!res.ok) {
      throw new Error(`Trakt API error: ${res.status}`);
    }
    
    const data: any = await res.json();
    const shows = Array.isArray(data) ? data : [];
    
    return shows.map((show: any) => ({
      title: show.title,
      content: `${show.year} - ${show.overview?.substring(0, 150) || 'TV Series'}`,
      source: TRAKT_API,
      sourceType: 'api' as const,
      url: show.ids?.trakt ? `https://trakt.tv/shows/${show.ids.trakt}` : undefined,
      publishedAt: show.first_aired,
    }));
  } catch (error) {
    console.error('Error fetching Trakt shows:', error);
    return [];
  }
}

export async function fetchTraktTrending(): Promise<CrawledItem[]> {
  try {
    const res = await fetch(`${TRAKT_API}/shows/trending?limit=25`, {
      signal: AbortSignal.timeout(10000),
      headers: {
        'Content-Type': 'application/json',
        'trakt-api-key': process.env.TRAKT_CLIENT_ID || 'YOUR_TRAKT_CLIENT_ID',
        'trakt-api-version': '2',
      },
    });
    
    if (!res.ok) {
      throw new Error(`Trakt API error: ${res.status}`);
    }
    
    const data: any = await res.json();
    const items = Array.isArray(data) ? data : [];
    
    return items.map((item: any) => ({
      title: item.show?.title,
      content: `${item.show?.year} - ${item.show?.overview?.substring(0, 150) || 'Trending TV Series'}`,
      source: TRAKT_API,
      sourceType: 'api' as const,
      url: item.show?.ids?.trakt ? `https://trakt.tv/shows/${item.show.ids.trakt}` : undefined,
      publishedAt: item.show?.first_aired,
    }));
  } catch (error) {
    console.error('Error fetching Trakt trending:', error);
    return [];
  }
}

export async function fetchTrakt(): Promise<CrawledItem[]> {
  const [shows, trending] = await Promise.all([
    fetchTraktShows(),
    fetchTraktTrending(),
  ]);
  
  return [...shows, ...trending];
}

export async function fetchTMDBTV(): Promise<CrawledItem[]> {
  try {
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      console.warn('TMDB API key not configured');
      return [];
    }
    
    const res = await fetch(`${TMDB_API}/tv/popular?api_key=${apiKey}&language=en-US&page=1`, {
      signal: AbortSignal.timeout(10000),
    });
    
    if (!res.ok) {
      throw new Error(`TMDB API error: ${res.status}`);
    }
    
    const data: any = await res.json();
    
    return (data.results || []).slice(0, 25).map((show: any) => ({
      title: show.name,
      content: show.overview?.substring(0, 200) || 'TV Series',
      source: 'TMDB TV',
      sourceType: 'api' as const,
      url: `https://www.themoviedb.org/tv/${show.id}`,
      publishedAt: show.first_air_date,
    }));
  } catch (error) {
    console.error('Error fetching TMDB TV:', error);
    return [];
  }
}

export async function fetchTMDBOnTheAir(): Promise<CrawledItem[]> {
  try {
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      return [];
    }
    
    const res = await fetch(`${TMDB_API}/tv/on_the_air?api_key=${apiKey}&language=en-US&page=1`, {
      signal: AbortSignal.timeout(10000),
    });
    
    if (!res.ok) {
      throw new Error(`TMDB API error: ${res.status}`);
    }
    
    const data: any = await res.json();
    
    return (data.results || []).slice(0, 25).map((show: any) => ({
      title: show.name,
      content: `On The Air - ${show.overview?.substring(0, 150) || 'TV Series'}`,
      source: 'TMDB TV',
      sourceType: 'api' as const,
      url: `https://www.themoviedb.org/tv/${show.id}`,
      publishedAt: show.first_air_date,
    }));
  } catch (error) {
    console.error('Error fetching TMDB on the air:', error);
    return [];
  }
}

export async function fetchSIMKL(): Promise<CrawledItem[]> {
  try {
    const res = await fetch(`${SIMKL_API}/all/tv Shows`, {
      signal: AbortSignal.timeout(10000),
      headers: {
        'simkl-api-key': process.env.SIMKL_API_KEY || 'YOUR_SIMKL_API_KEY',
      },
    });
    
    if (!res.ok) {
      throw new Error(`SIMKL API error: ${res.status}`);
    }
    
    const data: any = await res.json();
    const shows = Array.isArray(data) ? data : [];
    
    return shows.slice(0, 25).map((show: any) => ({
      title: show.title || show.title_long,
      content: `${show.year || ''} - TV Series`,
      source: SIMKL_API,
      sourceType: 'api' as const,
      url: show.url,
      publishedAt: show.released,
    }));
  } catch (error) {
    console.error('Error fetching SIMKL:', error);
    return [];
  }
}

export async function fetchJikanTV(): Promise<CrawledItem[]> {
  try {
    const res = await fetch('https://api.jikan.moe/v4/top/anime?type=tv&limit=25', {
      signal: AbortSignal.timeout(10000),
    });
    
    if (!res.ok) {
      throw new Error(`Jikan API error: ${res.status}`);
    }
    
    const data: any = await res.json();
    
    return (data.data || []).map((anime: any) => ({
      title: anime.title || anime.title_japanese,
      content: `Score: ${anime.score || 'N/A'} - ${anime.synopsis?.substring(0, 150) || 'TV Anime'}`,
      source: 'Jikan',
      sourceType: 'api' as const,
      url: anime.url,
      publishedAt: anime.aired?.from,
    }));
  } catch (error) {
    console.error('Error fetching Jikan TV:', error);
    return [];
  }
}

export async function fetchKitsuTV(): Promise<CrawledItem[]> {
  try {
    const res = await fetch('https://kitsu.io/api/edge/anime?filter[mediaType]=tv&page[limit]=25&sort=popularityRank', {
      signal: AbortSignal.timeout(10000),
    });
    
    if (!res.ok) {
      throw new Error(`Kitsu API error: ${res.status}`);
    }
    
    const data: any = await res.json();
    
    return (data.data || []).map((anime: any) => ({
      title: anime.attributes.titles.en || anime.attributes.titles.en_jp,
      content: `Rating: ${anime.attributes.averageRating || 'N/A'}`,
      source: 'Kitsu',
      sourceType: 'api' as const,
      url: anime.attributes.canonicalUrl,
      publishedAt: anime.attributes.startDate,
    }));
  } catch (error) {
    console.error('Error fetching Kitsu TV:', error);
    return [];
  }
}

export async function fetchAniListTV(): Promise<CrawledItem[]> {
  try {
    const query = `
      query {
        Page(perPage: 25) {
          media(type: ANIME, format: TV, sort: POPULARITY_DESC) {
            title {
              romaji
              english
            }
            averageScore
            startDate {
              year
              month
              day
            }
            siteUrl
          }
        }
      }
    `;
    
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(10000),
    });
    
    if (!res.ok) {
      throw new Error(`AniList API error: ${res.status}`);
    }
    
    const result: any = await res.json();
    
    return (result.data?.Page?.media || []).map((anime: any) => ({
      title: anime.title.english || anime.title.romaji,
      content: `Score: ${anime.averageScore || 'N/A'} - TV Anime`,
      source: 'AniList',
      sourceType: 'api' as const,
      url: anime.siteUrl,
      publishedAt: anime.startDate ? `${anime.startDate.year}-${anime.startDate.month}-${anime.startDate.day}` : undefined,
    }));
  } catch (error) {
    console.error('Error fetching AniList TV:', error);
    return [];
  }
}

export async function fetchCrunchyrollSeries(): Promise<CrawledItem[]> {
  try {
    const res = await fetch('https://api.crunchyroll.com/content/v1/series', {
      signal: AbortSignal.timeout(10000),
    });
    
    if (!res.ok) {
      throw new Error(`Crunchyroll API error: ${res.status}`);
    }
    
    const data: any = await res.json();
    
    return (data.items || []).slice(0, 20).map((series: any) => ({
      title: series.title || series.title_long,
      content: series.description?.substring(0, 200) || 'Crunchyroll Series',
      source: 'Crunchyroll',
      sourceType: 'api' as const,
      url: series.link,
    }));
  } catch (error) {
    console.error('Error fetching Crunchyroll series:', error);
    return [];
  }
}

export async function fetchNetflixAnimeSeries(): Promise<CrawledItem[]> {
  try {
    const res = await fetch('https://api.netflix.com/browse?contentType=series', {
      signal: AbortSignal.timeout(10000),
    });
    
    if (!res.ok) {
      throw new Error(`Netflix API error: ${res.status}`);
    }
    
    const data: any = await res.json();
    
    return (data.items || []).slice(0, 20).map((series: any) => ({
      title: series.title,
      content: series.synopsis?.substring(0, 200) || 'Netflix Series',
      source: 'Netflix',
      sourceType: 'api' as const,
      url: series.link,
    }));
  } catch (error) {
    console.error('Error fetching Netflix anime series:', error);
    return [];
  }
}

export async function fetchHIDIVESeries(): Promise<CrawledItem[]> {
  try {
    const res = await fetch('https://api.hidive.com/v1/catalog/tv', {
      signal: AbortSignal.timeout(10000),
    });
    
    if (!res.ok) {
      throw new Error(`HIDIVE API error: ${res.status}`);
    }
    
    const data: any = await res.json();
    
    return (data.items || []).slice(0, 20).map((series: any) => ({
      title: series.title,
      content: series.synopsis?.substring(0, 200) || 'HIDIVE TV Series',
      source: 'HIDIVE',
      sourceType: 'api' as const,
      url: series.url,
    }));
  } catch (error) {
    console.error('Error fetching HIDIVE series:', error);
    return [];
  }
}

export async function fetchVikiSeries(): Promise<CrawledItem[]> {
  try {
    const res = await fetch('https://api.viki.io/v4/viki_ios/sort/timeseries.json?app_id=100161a', {
      signal: AbortSignal.timeout(10000),
    });
    
    if (!res.ok) {
      throw new Error(`Viki API error: ${res.status}`);
    }
    
    const data: any = await res.json();
    
    return (data.items || []).slice(0, 20).map((series: any) => ({
      title: series.title,
      content: series.description?.substring(0, 200) || 'Viki K-Drama',
      source: 'Viki',
      sourceType: 'api' as const,
      url: series.url,
    }));
  } catch (error) {
    console.error('Error fetching Viki series:', error);
    return [];
  }
}

export async function fetchViuSeries(): Promise<CrawledItem[]> {
  try {
    const res = await fetch('https://www.viu.com/ott/svc/content/category/series', {
      signal: AbortSignal.timeout(10000),
    });
    
    if (!res.ok) {
      throw new Error(`Viu API error: ${res.status}`);
    }
    
    const data: any = await res.json();
    
    return (data || []).slice(0, 20).map((series: any) => ({
      title: series.title,
      content: series.synopsis?.substring(0, 200) || 'Viu Asian Drama',
      source: 'Viu',
      sourceType: 'api' as const,
      url: series.url,
    }));
  } catch (error) {
    console.error('Error fetching Viu series:', error);
    return [];
  }
}

export async function fetchMyDramaList(): Promise<CrawledItem[]> {
  try {
    const res = await fetch('https://www.mydramalist.com/v1/shows', {
      signal: AbortSignal.timeout(10000),
    });
    
    if (!res.ok) {
      throw new Error(`MyDramaList error: ${res.status}`);
    }
    
    const data: any = await res.json();
    
    return (data || []).slice(0, 20).map((drama: any) => ({
      title: drama.title || drama.original_title,
      content: drama.synopsis?.substring(0, 200) || 'Asian Drama',
      source: 'MyDramaList',
      sourceType: 'api' as const,
      url: drama.url,
      publishedAt: drama.year,
    }));
  } catch (error) {
    console.error('Error fetching MyDramaList:', error);
    return [];
  }
}

const SERIES_RSS_FEEDS = [
  'https://www.animenewsnetwork.com/all/rss.xml?ann-edition=us',
  'https://myanimelist.net/rss/news.xml',
  'https://animecorner.me/feed/',
  'https://feeds.feedburner.com/crunchyroll',
];

export async function crawlSeriesRSS(): Promise<CrawledItem[]> {
  const Parser = (await import('rss-parser')).default;
  
  const parser = new Parser({ timeout: 30000 });
  const results: CrawledItem[] = [];
  
  for (const feedUrl of SERIES_RSS_FEEDS) {
    try {
      const feed = await parser.parseURL(feedUrl);
      
      const items = feed.items.slice(0, 10).map(item => ({
        title: item.title || '',
        content: item.contentSnippet || item.content || '',
        source: feedUrl,
        sourceType: 'rss' as const,
        url: item.link,
        publishedAt: item.pubDate,
      }));
      
      results.push(...items);
    } catch (error) {
      console.error(`Error crawling RSS ${feedUrl}:`, error);
    }
  }
  
  return results;
}

export async function crawlSeries(): Promise<CrawledItem[]> {
  const results = await Promise.all([
    fetchTVMaze(),
    fetchTrakt(),
    fetchTMDBTV(),
    fetchTMDBOnTheAir(),
    fetchSIMKL(),
    fetchJikanTV(),
    fetchKitsuTV(),
    fetchAniListTV(),
    fetchCrunchyrollSeries(),
    fetchNetflixAnimeSeries(),
    fetchHIDIVESeries(),
    fetchVikiSeries(),
    fetchViuSeries(),
    fetchMyDramaList(),
    crawlSeriesRSS(),
  ]);
  
  return results.flat();
}
