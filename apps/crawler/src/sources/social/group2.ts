import { getSourcesByTypeAndCategory, type SourceConfig } from '../manager';
import type { CrawledItem } from '../social';

interface SocialSource extends SourceConfig {
  handle?: string;
}

function getFilteredSources(category: 'discord' | 'tiktok' | 'facebook' | 'twitch' | 'telegram'): SocialSource[] {
  return getSourcesByTypeAndCategory('social', category)
    .filter((source): source is SocialSource => source.reliability >= 0.5)
    .slice(0, 20);
}

async function fetchDiscordGroup2(sources: SocialSource[]): Promise<CrawledItem[]> {
  if (sources.length === 0) return [];

  const results: CrawledItem[] = [];
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('Discord webhook not configured, skipping Discord fetch');
    return results;
  }

  for (const source of sources) {
    try {
      const response = await fetch(`${webhookUrl}?wait=1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `Fetch messages from ${source.name}`,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        results.push({
          title: `Discord server: ${source.name}`,
          content: `Connected to ${source.url}`,
          source: 'discord',
          sourceType: 'social',
          url: `https://discord.gg/${source.url}`,
        });
      }
    } catch (error) {
      console.error(`Error fetching Discord ${source.name}:`, error);
    }
  }

  return results;
}

async function fetchTikTokGroup2(sources: SocialSource[]): Promise<CrawledItem[]> {
  if (sources.length === 0) return [];

  const results: CrawledItem[] = [];
  const apiKey = process.env.TIKTOK_API_KEY;

  if (!apiKey) {
    console.warn('TikTok API key not configured, skipping TikTok fetch');
    return results;
  }

  for (const source of sources) {
    const hashtag = source.name.startsWith('#') ? source.name : `#${source.name}`;
    try {
      const response = await fetch(
        `https://api.tiktok.com/v2/hashtag/list/?hashtag_name=${hashtag.replace('#', '')}`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) continue;

      const data: any = await response.json();

      if (data.data?.videos) {
        for (const video of data.data.videos.slice(0, 5)) {
          results.push({
            title: video.desc?.substring(0, 100) || hashtag,
            content: video.desc || '',
            source: `tiktok.com/tag/${hashtag.replace('#', '')}`,
            sourceType: 'social',
            url: `https://www.tiktok.com/@${video.author?.uniqueId}/video/${video.id}`,
            publishedAt: video.create_time,
          });
        }
      }
    } catch (error) {
      console.error(`Error fetching TikTok ${hashtag}:`, error);
    }
  }

  return results;
}

async function fetchFacebookGroup2(sources: SocialSource[]): Promise<CrawledItem[]> {
  if (sources.length === 0) return [];

  const results: CrawledItem[] = [];
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;

  if (!accessToken) {
    console.warn('Facebook access token not configured, skipping Facebook fetch');
    return results;
  }

  for (const source of sources) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${source.name}/posts?access_token=${accessToken}&limit=10`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (!response.ok) continue;

      const data: any = await response.json();

      if (data.data) {
        for (const post of data.data) {
          results.push({
            title: post.message?.substring(0, 100) || '',
            content: post.message || '',
            source: `facebook.com/${source.name}`,
            sourceType: 'social',
            url: `https://facebook.com/${post.id}`,
            publishedAt: post.created_time,
          });
        }
      }
    } catch (error) {
      console.error(`Error fetching Facebook page ${source.name}:`, error);
    }
  }

  return results;
}

async function fetchTwitchGroup2(sources: SocialSource[]): Promise<CrawledItem[]> {
  if (sources.length === 0) return [];

  const results: CrawledItem[] = [];
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn('Twitch API credentials not configured, skipping Twitch fetch');
    return results;
  }

  let accessToken = '';
  try {
    const tokenResponse = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
      { method: 'POST', signal: AbortSignal.timeout(10000) }
    );
    if (!tokenResponse.ok) throw new Error('Failed to get Twitch access token');
    const tokenData: any = await tokenResponse.json();
    accessToken = tokenData.access_token;
  } catch (error) {
    console.error('Error getting Twitch access token:', error);
    return results;
  }

  for (const source of sources) {
    const channelName = source.name;
    try {
      const response = await fetch(
        `https://api.twitch.tv/helix/streams?user_login=${channelName}`,
        {
          headers: {
            'Client-ID': clientId,
            'Authorization': `Bearer ${accessToken}`,
          },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) continue;

      const data: any = await response.json();

      if (data.data && data.data.length > 0) {
        for (const stream of data.data) {
          results.push({
            title: stream.title?.substring(0, 100) || '',
            content: stream.title || '',
            source: `twitch.tv/${channelName}`,
            sourceType: 'social',
            url: `https://www.twitch.tv/${channelName}`,
            publishedAt: stream.started_at,
          });
        }
      }
    } catch (error) {
      console.error(`Error fetching Twitch channel ${channelName}:`, error);
    }
  }

  return results;
}

async function fetchTelegramGroup2(sources: SocialSource[]): Promise<CrawledItem[]> {
  if (sources.length === 0) return [];

  const results: CrawledItem[] = [];
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    console.warn('Telegram bot token not configured, skipping Telegram fetch');
    return results;
  }

  for (const source of sources) {
    const chatId = source.name;
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/getUpdates?chat_id=${chatId}&limit=10`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (!response.ok) continue;

      const data: any = await response.json();

      if (data.result) {
        for (const update of data.result.slice(0, 10)) {
          const message = update.message;
          if (message?.text) {
            results.push({
              title: message.text?.substring(0, 100) || '',
              content: message.text || '',
              source: `t.me/${chatId}`,
              sourceType: 'social',
              url: `https://t.me/${chatId}`,
              publishedAt: new Date(message.date * 1000).toISOString(),
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching Telegram chat ${chatId}:`, error);
    }
  }

  return results;
}

export async function crawlSocial_Group2(): Promise<CrawledItem[]> {
  const discordSources = getFilteredSources('discord');
  const tiktokSources = getFilteredSources('tiktok');
  const facebookSources = getFilteredSources('facebook');
  const twitchSources = getFilteredSources('twitch');
  const telegramSources = getFilteredSources('telegram');

  const [discordResults, tiktokResults, facebookResults, twitchResults, telegramResults] = await Promise.all([
    fetchDiscordGroup2(discordSources),
    fetchTikTokGroup2(tiktokSources),
    fetchFacebookGroup2(facebookSources),
    fetchTwitchGroup2(twitchSources),
    fetchTelegramGroup2(telegramSources),
  ]);

  return [...discordResults, ...tiktokResults, ...facebookResults, ...twitchResults, ...telegramResults];
}