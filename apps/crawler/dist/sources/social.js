const TWITTER_HASHTAGS = [
    '#anime',
    '#manga',
    '#JujutsuKaisen',
    '#OnePiece',
    '#Naruto',
    '#DemonSlayer',
    '#AOT',
    '#ChainsawMan',
    '#SpyXFamily',
    '#MyHeroAcademia',
    '#DragonBall',
    '#Bleach',
    '#TokyoRevengers',
];
const TWITTER_ACCOUNTS = {
    news: [
        'animecorner_ac',
        'CrunchyrollNews',
        'mangaupdates',
        'animenewsource',
        'otaku_news_en',
    ],
    insiders: [
        'SugoiLITE',
        'MangaMoguraRE',
        'MangaKoi',
        'JishoManga',
        'NewWorldUpdate',
        'JujutsuKaisenF',
        'OP_Spoilers',
    ],
    fanAccounts: [
        'Anime_Impact',
        'AnimeDotPlus',
        'AnimeHypee',
        'MangaUpdates',
    ],
};
const REDDIT_SUBREDDITS = [
    'anime',
    'manga',
    'manhwa',
    'isekai',
    'BLanime',
    'OnePiece',
    'JuJutsuKaisen',
    'Naruto',
    'AnimeSpoilers',
    ' DemonSlayer',
    'ChainsawMan',
    'TokyoRevengers',
    'BokuNoHeroAcademia',
    'AttackOnTitan',
    'ShingekiNoKyojin',
    'HunterXHunter',
    'JoJo',
    'DragonBall',
    'Bleach',
    'DeathNote',
];
const YOUTUBE_CHANNELS = {
    official: [
        'Crunchyroll',
        'Netflix Anime',
        'AniplexUSA',
        'ToeiAnimation',
        'KadokawaAnime',
        'Muse Asia',
        'Ani-One Asia',
        'Viz Media',
        'Madhouse',
        'MAPPA',
    ],
    analysis: [
        'Gigguk',
        'Mother\'s Basement',
        'The Anime Man',
        'Senpai Admin',
        'Nux Taku',
        'SuperEyepatchWolf',
        'Rambalac',
        'CDawgVA',
        'Kazoo',
    ],
    reviews: [
        'AnimeZone',
        'AnimeDred',
        'OtakuReviewer',
        'AnimeLouise',
        'Alexwith质量',
    ],
};
const TIKTOK_HASHTAGS = [
    '#anime',
    '#animeedit',
    '#manga',
    '#animeamv',
    '#animeart',
    '#animecosplay',
    '#animememes',
    '#animetok',
    '#japanimation',
    '#weeb',
    '#otaku',
    '#animenews',
    '#animespoiler',
];
const TIKTOK_CREATORS = [
    'animecorner',
    'mangamemes',
    'animequotes',
    'animeedits',
    'otaku.life',
    'anime.news',
    'mangalover',
];
const FACEBOOK_GROUPS = [
    'Anime-Manga-Fans-103',
    'Anime-Lovers-Worldwide',
    'Manga-Readers-Community',
    'One-Piece-Fans',
    'Naruto-Forever',
    'Anime-Spoilers-Discussion',
];
const FACEBOOK_PAGES = [
    'AnimeNewsNetwork',
    'Crunchyroll',
    'MyAnimeList',
    'AnimeCorner',
    'AnimeTrending',
    'OtakuUSA',
];
export async function fetchTwitter() {
    const accounts = [
        ...TWITTER_ACCOUNTS.news,
        ...TWITTER_ACCOUNTS.insiders,
        ...TWITTER_ACCOUNTS.fanAccounts,
    ];
    const results = [];
    for (const account of accounts) {
        try {
            const response = await fetch(`https://api.twitter.com/2/users/by/username/${account}/tweets?max_results=10`, {
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
                        source: `twitter.com/${account}`,
                        sourceType: 'social',
                        url: `https://twitter.com/${account}/status/${tweet.id}`,
                        publishedAt: tweet.created_at,
                    });
                }
            }
        }
        catch (error) {
            console.error(`Error fetching Twitter ${account}:`, error);
        }
    }
    return results;
}
export async function fetchReddit() {
    const results = [];
    for (const subreddit of REDDIT_SUBREDDITS) {
        try {
            const response = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=25`, {
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
                        source: `reddit.com/r/${subreddit}`,
                        sourceType: 'social',
                        url: `https://reddit.com${p.permalink}`,
                        publishedAt: new Date(p.created_utc * 1000).toISOString(),
                    });
                }
            }
        }
        catch (error) {
            console.error(`Error fetching Reddit r/${subreddit}:`, error);
        }
    }
    return results;
}
export async function fetchYouTube() {
    const channels = [
        ...YOUTUBE_CHANNELS.official,
        ...YOUTUBE_CHANNELS.analysis,
        ...YOUTUBE_CHANNELS.reviews,
    ];
    const results = [];
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        console.warn('YouTube API key not configured, skipping YouTube fetch');
        return results;
    }
    for (const channel of channels) {
        try {
            const searchResponse = await fetch(`https://www.googleapis.com/youtube/v3/search?key=${apiKey}&q=anime&channelId=${channel}&order=date&maxResults=10&part=snippet`, { signal: AbortSignal.timeout(10000) });
            if (!searchResponse.ok)
                continue;
            const data = await searchResponse.json();
            if (data.items) {
                for (const video of data.items) {
                    results.push({
                        title: video.snippet?.title || '',
                        content: video.snippet?.description || '',
                        source: `youtube.com/channel/${channel}`,
                        sourceType: 'social',
                        url: `https://www.youtube.com/watch?v=${video.id?.videoId}`,
                        publishedAt: video.snippet?.publishedAt,
                    });
                }
            }
        }
        catch (error) {
            console.error(`Error fetching YouTube channel ${channel}:`, error);
        }
    }
    return results;
}
export async function fetchDiscord() {
    const results = [];
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
        console.warn('Discord webhook not configured, skipping Discord fetch');
        return results;
    }
    const discordServers = [
        { name: 'Anime News', id: 'anime-discussion' },
        { name: 'Manga Readers', id: 'manga-community' },
        { name: 'One Piece', id: 'one-piece-fans' },
        { name: 'Jujutsu Kaisen', id: 'jjk-fans' },
    ];
    for (const server of discordServers) {
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
                    content: `Connected to ${server.id}`,
                    source: 'discord',
                    sourceType: 'social',
                    url: `https://discord.gg/${server.id}`,
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
    const results = [];
    const apiKey = process.env.TIKTOK_API_KEY;
    if (!apiKey) {
        console.warn('TikTok API key not configured, skipping TikTok fetch');
        return results;
    }
    for (const hashtag of TIKTOK_HASHTAGS) {
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
    const results = [];
    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
    if (!accessToken) {
        console.warn('Facebook access token not configured, skipping Facebook fetch');
        return results;
    }
    for (const page of FACEBOOK_PAGES) {
        try {
            const response = await fetch(`https://graph.facebook.com/v18.0/${page}/posts?access_token=${accessToken}&limit=10`, { signal: AbortSignal.timeout(10000) });
            if (!response.ok)
                continue;
            const data = await response.json();
            if (data.data) {
                for (const post of data.data) {
                    results.push({
                        title: post.message?.substring(0, 100) || '',
                        content: post.message || '',
                        source: `facebook.com/${page}`,
                        sourceType: 'social',
                        url: `https://facebook.com/${post.id}`,
                        publishedAt: post.created_time,
                    });
                }
            }
        }
        catch (error) {
            console.error(`Error fetching Facebook page ${page}:`, error);
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
export { TWITTER_HASHTAGS, TWITTER_ACCOUNTS, REDDIT_SUBREDDITS, YOUTUBE_CHANNELS, TIKTOK_HASHTAGS, TIKTOK_CREATORS, FACEBOOK_GROUPS, FACEBOOK_PAGES, };
