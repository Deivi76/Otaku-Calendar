export interface CrawledItem {
  title: string;
  content: string;
  source: string;
  sourceType: 'api';
  url?: string;
  publishedAt?: string;
}

const ANILIST_API = process.env.ANILIST_API || 'https://graphql.anilist.co';

const TRENDING_QUERY = `
  query {
    Page(perPage: 50) {
      media(type: ANIME, status: RELEASING) {
        id
        title {
          romaji
          english
          native
        }
        nextAiringEpisode {
          episode
          airingAt
        }
        siteUrl
      }
    }
  }
`;

const UPCOMING_QUERY = `
  query {
    Page(perPage: 50) {
      media(type: ANIME, status: NOT_YET_RELEASED) {
        id
        title {
          romaji
          english
          native
        }
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

async function fetchAniList<T>(query: string): Promise<T> {
  const res = await fetch(ANILIST_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    throw new Error(`AniList API error: ${res.status}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`AniList GraphQL error: ${json.errors[0].message}`);
  }

  return json.data;
}

export async function fetchTrendingAnime(): Promise<CrawledItem[]> {
  try {
    const data = await fetchAniList<any>(TRENDING_QUERY);
    
    return data.Page.media.map((media: any) => ({
      title: media.title.romaji || media.title.english || media.title.native,
      content: media.nextAiringEpisode 
        ? `Episode ${media.nextAiringEpisode.episode} airing soon`
        : 'Currently releasing',
      source: ANILIST_API,
      sourceType: 'api',
      url: media.siteUrl,
      publishedAt: media.nextAiringEpisode?.airingAt 
        ? new Date(media.nextAiringEpisode.airingAt * 1000).toISOString()
        : undefined,
    }));
  } catch (error) {
    console.error('Error fetching trending anime from AniList:', error);
    return [];
  }
}

export async function fetchUpcomingAnime(): Promise<CrawledItem[]> {
  try {
    const data = await fetchAniList<any>(UPCOMING_QUERY);
    
    return data.Page.media.map((media: any) => ({
      title: media.title.romaji || media.title.english || media.title.native,
      content: 'Upcoming anime',
      source: ANILIST_API,
      sourceType: 'api',
      url: media.siteUrl,
      publishedAt: media.startDate 
        ? new Date(media.startDate.year, media.startDate.month - 1, media.startDate.day).toISOString()
        : undefined,
    }));
  } catch (error) {
    console.error('Error fetching upcoming anime from AniList:', error);
    return [];
  }
}

export async function crawlAniList(): Promise<CrawledItem[]> {
  const [trending, upcoming] = await Promise.all([
    fetchTrendingAnime(),
    fetchUpcomingAnime(),
  ]);
  
  return [...trending, ...upcoming];
}
