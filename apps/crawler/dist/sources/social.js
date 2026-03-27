import { getSourcesByTypeAndCategory } from './manager';
function getTwitterAccounts() {
    const sources = getSourcesByTypeAndCategory('social', 'twitter');
    return sources.length > 0 ? sources : [];
}
function getRedditSubreddits() {
    const sources = getSourcesByTypeAndCategory('social', 'reddit');
    return sources.length > 0 ? sources : [];
}
function getYouTubeChannels() {
    const sources = getSourcesByTypeAndCategory('social', 'youtube');
    return sources.length > 0 ? sources : [];
}
function getTikTokSources() {
    const sources = getSourcesByTypeAndCategory('social', 'tiktok');
    return sources.length > 0 ? sources : [];
}
function getFacebookSources() {
    const sources = getSourcesByTypeAndCategory('social', 'facebook');
    return sources.length > 0 ? sources : [];
}
function getDiscordSources() {
    const sources = getSourcesByTypeAndCategory('social', 'discord');
    return sources.length > 0 ? sources : [];
}
export async function fetchTwitter() {
    const accounts = getTwitterAccounts();
    if (accounts.length === 0) {
        return [];
    }
    const results = [];
    for (const account of accounts) {
        try {
            const response = await fetch(`https://api.twitter.com/2/users/by/username/${account.name}/tweets?max_results=10`, {
                headers: {
                    'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
                },
                signal: AbortSignal.timeout(10000),
            });
            if (!response.ok)
                continue;
            const data = await response.json();
            if (data.data) {
                for (const tweet of data.data) {
                    results.push({
                        title: tweet.text?.substring(0, 100) || '',
                        content: tweet.text || '',
                        source: `twitter.com/${account.name}`,
                        sourceType: 'social',
                        url: `https://twitter.com/${account.name}/status/${tweet.id}`,
                        publishedAt: tweet.created_at,
                    });
                }
            }
        }
        catch (error) {
            console.error(`Error fetching Twitter ${account.name}:`, error);
        }
    }
    return results;
}
export async function fetchReddit() {
    const subreddits = getRedditSubreddits();
    if (subreddits.length === 0) {
        return [];
    }
    const results = [];
    for (const subreddit of subreddits) {
        try {
            const response = await fetch(`https://www.reddit.com/r/${subreddit.name}/hot.json?limit=25`, {
                headers: {
                    'User-Agent': 'OtakuCalendar/1.0',
                },
                signal: AbortSignal.timeout(10000),
            });
            if (!response.ok)
                continue;
            const data = await response.json();
            if (data.data?.children) {
                for (const post of data.data.children) {
                    const p = post.data;
                    results.push({
                        title: p.title?.substring(0, 100) || '',
                        content: p.selftext?.substring(0, 500) || p.title || '',
                        source: `reddit.com/r/${subreddit.name}`,
                        sourceType: 'social',
                        url: `https://reddit.com${p.permalink}`,
                        publishedAt: new Date(p.created_utc * 1000).toISOString(),
                    });
                }
            }
        }
        catch (error) {
            console.error(`Error fetching Reddit r/${subreddit.name}:`, error);
        }
    }
    return results;
}
export async function fetchYouTube() {
    const channels = getYouTubeChannels();
    if (channels.length === 0) {
        return [];
    }
    const results = [];
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        console.warn('YouTube API key not configured, skipping YouTube fetch');
        return results;
    }
    for (const channel of channels) {
        try {
            const searchResponse = await fetch(`https://www.googleapis.com/youtube/v3/search?key=${apiKey}&q=anime&channelId=${channel.name}&order=date&maxResults=10&part=snippet`, { signal: AbortSignal.timeout(10000) });
            if (!searchResponse.ok)
                continue;
            const data = await searchResponse.json();
            if (data.items) {
                for (const video of data.items) {
                    results.push({
                        title: video.snippet?.title || '',
                        content: video.snippet?.description || '',
                        source: `youtube.com/channel/${channel.name}`,
                        sourceType: 'social',
                        url: `https://www.youtube.com/watch?v=${video.id?.videoId}`,
                        publishedAt: video.snippet?.publishedAt,
                    });
                }
            }
        }
        catch (error) {
            console.error(`Error fetching YouTube channel ${channel.name}:`, error);
        }
    }
    return results;
}
export async function fetchDiscord() {
    const discordSources = getDiscordSources();
    if (discordSources.length === 0) {
        return [];
    }
    const results = [];
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
        console.warn('Discord webhook not configured, skipping Discord fetch');
        return results;
    }
    for (const server of discordSources) {
        try {
            const response = await fetch(`${webhookUrl}?wait=1`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: `Fetch messages from ${server.name}`,
                }),
                signal: AbortSignal.timeout(5000),
            });
            if (response.ok) {
                results.push({
                    title: `Discord server: ${server.name}`,
                    content: `Connected to ${server.url}`,
                    source: 'discord',
                    sourceType: 'social',
                    url: `https://discord.gg/${server.url}`,
                });
            }
        }
        catch (error) {
            console.error(`Error fetching Discord ${server.name}:`, error);
        }
    }
    return results;
}
export async function fetchTikTok() {
    const tiktokSources = getTikTokSources();
    if (tiktokSources.length === 0) {
        return [];
    }
    const results = [];
    const apiKey = process.env.TIKTOK_API_KEY;
    if (!apiKey) {
        console.warn('TikTok API key not configured, skipping TikTok fetch');
        return results;
    }
    for (const source of tiktokSources) {
        const hashtag = source.name.startsWith('#') ? source.name : `#${source.name}`;
        try {
            const response = await fetch(`https://api.tiktok.com/v2/hashtag/list/?hashtag_name=${hashtag.replace('#', '')}`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
                signal: AbortSignal.timeout(10000),
            });
            if (!response.ok)
                continue;
            const data = await response.json();
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
        }
        catch (error) {
            console.error(`Error fetching TikTok ${hashtag}:`, error);
        }
    }
    return results;
}
export async function fetchFacebook() {
    const facebookSources = getFacebookSources();
    if (facebookSources.length === 0) {
        return [];
    }
    const results = [];
    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
    if (!accessToken) {
        console.warn('Facebook access token not configured, skipping Facebook fetch');
        return results;
    }
    for (const page of facebookSources) {
        try {
            const response = await fetch(`https://graph.facebook.com/v18.0/${page.name}/posts?access_token=${accessToken}&limit=10`, { signal: AbortSignal.timeout(10000) });
            if (!response.ok)
                continue;
            const data = await response.json();
            if (data.data) {
                for (const post of data.data) {
                    results.push({
                        title: post.message?.substring(0, 100) || '',
                        content: post.message || '',
                        source: `facebook.com/${page.name}`,
                        sourceType: 'social',
                        url: `https://facebook.com/${post.id}`,
                        publishedAt: post.created_time,
                    });
                }
            }
        }
        catch (error) {
            console.error(`Error fetching Facebook page ${page.name}:`, error);
        }
    }
    return results;
}
export async function crawlSocial() {
    const results = await Promise.all([
        fetchTwitter(),
        fetchReddit(),
        fetchYouTube(),
        fetchDiscord(),
        fetchTikTok(),
        fetchFacebook(),
    ]);
    return results.flat();
}
export { getTwitterAccounts, getRedditSubreddits, getYouTubeChannels, getTikTokSources, getFacebookSources, getDiscordSources, };
