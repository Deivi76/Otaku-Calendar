import { getSourcesByTypeAndCategory, type SourceConfig } from '../manager';
import type { CrawledItem } from '../social';

interface SocialSource extends SourceConfig {
  handle?: string;
}

function getFilteredSources(category: 'twitter' | 'reddit' | 'youtube'): SocialSource[] {
  return getSourcesByTypeAndCategory('social', category)
    .filter((source): source is SocialSource => source.reliability >= 0.6)
    .slice(0, 40);
}

async function fetchTwitterGroup1(sources: SocialSource[]): Promise<CrawledItem[]> {
  if (sources.length === 0) return [];

  const results: CrawledItem[] = [];

  for (const source of sources) {
    const handle = source.handle || source.name;
    try {
      const response = await fetch(
        `https://api.twitter.com/2/users/by/username/${handle}/tweets?max_results=10`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
          },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) continue;

      const data: any = await response.json();

      if (data.data) {
        for (const tweet of data.data) {
          results.push({
            title: tweet.text?.substring(0, 100) || '',
            content: tweet.text || '',
            source: `twitter.com/${handle}`,
            sourceType: 'social',
            url: `https://twitter.com/${handle}/status/${tweet.id}`,
            publishedAt: tweet.created_at,
          });
        }
      }
    } catch (error) {
      console.error(`Error fetching Twitter ${handle}:`, error);
    }
  }

  return results;
}

async function fetchRedditGroup1(sources: SocialSource[]): Promise<CrawledItem[]> {
  if (sources.length === 0) return [];

  const results: CrawledItem[] = [];

  for (const source of sources) {
    try {
      const response = await fetch(
        `https://www.reddit.com/r/${source.name}/hot.json?limit=25`,
        {
          headers: {
            'User-Agent': 'OtakuCalendar/1.0',
          },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) continue;

      const data: any = await response.json();

      if (data.data?.children) {
        for (const post of data.data.children) {
          const p = post.data;
          results.push({
            title: p.title?.substring(0, 100) || '',
            content: p.selftext?.substring(0, 500) || p.title || '',
            source: `reddit.com/r/${source.name}`,
            sourceType: 'social',
            url: `https://reddit.com${p.permalink}`,
            publishedAt: new Date(p.created_utc * 1000).toISOString(),
          });
        }
      }
    } catch (error) {
      console.error(`Error fetching Reddit r/${source.name}:`, error);
    }
  }

  return results;
}

async function fetchYouTubeGroup1(sources: SocialSource[]): Promise<CrawledItem[]> {
  if (sources.length === 0) return [];

  const results: CrawledItem[] = [];

  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    console.warn('YouTube API key not configured, skipping YouTube fetch');
    return results;
  }

  for (const source of sources) {
    const channelId = source.name;
    try {
      const searchResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&q=anime&channelId=${channelId}&order=date&maxResults=10&part=snippet`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (!searchResponse.ok) continue;

      const data: any = await searchResponse.json();

      if (data.items) {
        for (const video of data.items) {
          results.push({
            title: video.snippet?.title || '',
            content: video.snippet?.description || '',
            source: `youtube.com/channel/${channelId}`,
            sourceType: 'social',
            url: `https://www.youtube.com/watch?v=${video.id?.videoId}`,
            publishedAt: video.snippet?.publishedAt,
          });
        }
      }
    } catch (error) {
      console.error(`Error fetching YouTube channel ${channelId}:`, error);
    }
  }

  return results;
}

export async function crawlSocial_Group1(): Promise<CrawledItem[]> {
  const twitterSources = getFilteredSources('twitter');
  const redditSources = getFilteredSources('reddit');
  const youtubeSources = getFilteredSources('youtube');

  const [twitterResults, redditResults, youtubeResults] = await Promise.all([
    fetchTwitterGroup1(twitterSources),
    fetchRedditGroup1(redditSources),
    fetchYouTubeGroup1(youtubeSources),
  ]);

  return [...twitterResults, ...redditResults, ...youtubeResults];
}
