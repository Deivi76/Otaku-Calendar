import * as cheerio from 'cheerio';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const RUMOR_SOURCES = {
    sites: {
        worstGen: 'https://worstgen.com',
        onePieceSpoiler: 'https://onepiece.fandom.com/wiki/One_Piece_Spoilers',
        mangaPredictions: 'https://mangapredictions.com',
        arlongPark: 'https://arlongpark.net',
        cubariMoe: 'https://cubari.moe',
    },
    fourChan: {
        animeBoard: 'a',
        visualNovels: 'vr',
    },
    twitter: [
        'SugoiLITE',
        'MangaMoguraRE',
        'WorstGen',
        'Mugiwara_23',
        'mangaraw_jp',
    ],
    youtube: [
        'Hassan Javed',
        'Anime Hearsay',
        'Otaku Kart',
    ],
    forums: {
        reddit: [
            'r/MangaCollectors',
            'r/Kagurabachi',
        ],
        myAnimeList: 'https://myanimelist.net/forum',
    },
};
async function fetchWorstGen() {
    try {
        const html = await fetch(RUMOR_SOURCES.sites.worstGen, {
            signal: AbortSignal.timeout(10000),
            headers: { 'User-Agent': USER_AGENT },
        }).then(r => r.text());
        const $ = cheerio.load(html);
        const items = [];
        $('article, .post, .thread, .topic').each((_, el) => {
            const title = $(el).find('h2, h3, .title, .thread-title').first().text().trim();
            const content = $(el).find('.content, .excerpt, .post-content, p').first().text().trim();
            const link = $(el).find('a').first().attr('href');
            const date = $(el).find('.date, .timestamp, time').first().text().trim();
            if (title && link) {
                items.push({
                    title,
                    content: content.substring(0, 300),
                    source: 'WorstGen',
                    sourceType: 'rumor',
                    url: link,
                    publishedAt: date,
                    type: 'rumor',
                    confidence: 0.25,
                });
            }
        });
        return items.slice(0, 10);
    }
    catch (error) {
        console.error('Error fetching WorstGen:', error);
        return [];
    }
}
async function fetchOnePieceSpoiler() {
    try {
        const html = await fetch(RUMOR_SOURCES.sites.onePieceSpoiler, {
            signal: AbortSignal.timeout(10000),
            headers: { 'User-Agent': USER_AGENT },
        }).then(r => r.text());
        const $ = cheerio.load(html);
        const items = [];
        $('article, .spoiler-box, .news-item').each((_, el) => {
            const title = $(el).find('h2, h3, .title').first().text().trim();
            const content = $(el).find('.content, p').first().text().trim();
            if (title) {
                items.push({
                    title,
                    content: content.substring(0, 300),
                    source: 'One Piece Spoiler',
                    sourceType: 'rumor',
                    type: 'rumor',
                    confidence: 0.3,
                });
            }
        });
        return items.slice(0, 10);
    }
    catch (error) {
        console.error('Error fetching One Piece Spoiler:', error);
        return [];
    }
}
async function fetchArlongPark() {
    try {
        const html = await fetch(RUMOR_SOURCES.sites.arlongPark, {
            signal: AbortSignal.timeout(10000),
            headers: { 'User-Agent': USER_AGENT },
        }).then(r => r.text());
        const $ = cheerio.load(html);
        const items = [];
        $('article, .thread, .post').each((_, el) => {
            const title = $(el).find('h2, h3, .thread-title').first().text().trim();
            const content = $(el).find('.content, .post-content').first().text().trim();
            const link = $(el).find('a').first().attr('href');
            if (title) {
                items.push({
                    title,
                    content: content.substring(0, 300),
                    source: 'Arlong Park Forums',
                    sourceType: 'rumor',
                    url: link,
                    type: 'rumor',
                    confidence: 0.3,
                });
            }
        });
        return items.slice(0, 10);
    }
    catch (error) {
        console.error('Error fetching Arlong Park:', error);
        return [];
    }
}
async function fetch4chan(board, keywords = []) {
    try {
        const catalogUrl = `https://boards.4chan.org/${board}/catalog`;
        const html = await fetch(catalogUrl, {
            signal: AbortSignal.timeout(10000),
            headers: { 'User-Agent': USER_AGENT },
        }).then(r => r.text());
        const $ = cheerio.load(html);
        const items = [];
        $('div.thread').each((_, el) => {
            const title = $(el).find('.subject, .post-title').first().text().trim();
            const content = $(el).find('.post-content, .reply').first().text().trim();
            const postNum = $(el).attr('id')?.replace('t', '');
            const link = postNum ? `https://boards.4chan.org/${board}/thread/${postNum}` : undefined;
            if (title) {
                const hasKeyword = keywords.length === 0 || keywords.some(k => title.toLowerCase().includes(k.toLowerCase()) ||
                    content.toLowerCase().includes(k.toLowerCase()));
                if (hasKeyword) {
                    items.push({
                        title,
                        content: content.substring(0, 300),
                        source: `/${board}/ - 4chan`,
                        sourceType: 'rumor',
                        url: link,
                        type: 'rumor',
                        confidence: 0.2,
                    });
                }
            }
        });
        return items.slice(0, 15);
    }
    catch (error) {
        console.error(`Error fetching 4chan /${board}/:`, error);
        return [];
    }
}
async function fetch4chanAnime() {
    return fetch4chan('a', ['spoiler', 'leak', 'rumor', 'announcement', 'preview']);
}
async function fetch4chanVN() {
    return fetch4chan('vr', ['announcement', 'release']);
}
async function fetchRedditForum(subreddit) {
    try {
        const url = `https://www.reddit.com/${subreddit}/hot.json`;
        const response = await fetch(url, {
            signal: AbortSignal.timeout(10000),
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'application/json',
            },
        });
        const data = await response.json();
        const items = [];
        if (data.data?.children) {
            for (const post of data.data.children) {
                const postData = post.data;
                items.push({
                    title: postData.title,
                    content: (postData.selftext || postData.title).substring(0, 300),
                    source: subreddit,
                    sourceType: 'rumor',
                    url: `https://reddit.com${postData.permalink}`,
                    publishedAt: new Date(postData.created_utc * 1000).toISOString(),
                    type: 'rumor',
                    confidence: 0.35,
                });
            }
        }
        return items.slice(0, 15);
    }
    catch (error) {
        console.error(`Error fetching Reddit ${subreddit}:`, error);
        return [];
    }
}
async function fetchMALForums() {
    try {
        const html = await fetch(RUMOR_SOURCES.forums.myAnimeList, {
            signal: AbortSignal.timeout(10000),
            headers: { 'User-Agent': USER_AGENT },
        }).then(r => r.text());
        const $ = cheerio.load(html);
        const items = [];
        $('div.forum-row, li.forum-topic').each((_, el) => {
            const title = $(el).find('.topic-title, .title').first().text().trim();
            const content = $(el).find('.description, .excerpt').first().text().trim();
            const link = $(el).find('a').first().attr('href');
            if (title) {
                items.push({
                    title,
                    content: content.substring(0, 300),
                    source: 'MyAnimeList Forums',
                    sourceType: 'rumor',
                    url: link,
                    type: 'rumor',
                    confidence: 0.35,
                });
            }
        });
        return items.slice(0, 15);
    }
    catch (error) {
        console.error('Error fetching MAL Forums:', error);
        return [];
    }
}
async function fetchLeakerTwitter() {
    const items = [];
    const twitterHandles = RUMOR_SOURCES.twitter;
    for (const handle of twitterHandles) {
        try {
            const url = `https://nitter.net/${handle}`;
            const html = await fetch(url, {
                signal: AbortSignal.timeout(10000),
                headers: { 'User-Agent': USER_AGENT },
            }).then(r => r.text());
            const $ = cheerio.load(html);
            $('div.tweet').each((_, el) => {
                const content = $(el).find('.tweet-content, . tweet-text').first().text().trim();
                const timestamp = $(el).find('.tweet-date, .date').first().text().trim();
                const link = $(el).find('a').first().attr('href');
                if (content) {
                    items.push({
                        title: `Tweet de @${handle}`,
                        content: content.substring(0, 300),
                        source: `@${handle} (Twitter/X)`,
                        sourceType: 'rumor',
                        url: link,
                        publishedAt: timestamp,
                        type: 'rumor',
                        confidence: 0.3,
                    });
                }
            });
            if (items.length >= 20)
                break;
        }
        catch (error) {
            console.error(`Error fetching Twitter ${handle}:`, error);
        }
    }
    return items.slice(0, 20);
}
async function fetchLeakYouTubers() {
    const channels = RUMOR_SOURCES.youtube;
    const items = [];
    for (const channel of channels) {
        try {
            const searchQuery = encodeURIComponent(`${channel} anime leak`);
            const url = `https://www.youtube.com/results?search_query=${searchQuery}`;
            const html = await fetch(url, {
                signal: AbortSignal.timeout(10000),
                headers: { 'User-Agent': USER_AGENT },
            }).then(r => r.text());
            const $ = cheerio.load(html);
            const jsonMatch = html.match(/var ytInitialData = ({.*?});/);
            if (jsonMatch) {
                try {
                    const data = JSON.parse(jsonMatch[1]);
                    const videos = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];
                    for (const video of videos.slice(0, 3)) {
                        const videoRenderer = video.videoRenderer;
                        if (videoRenderer) {
                            const title = videoRenderer.title?.runs?.[0]?.text || '';
                            const videoId = videoRenderer.videoId;
                            const views = videoRenderer.viewCountText?.simpleText || '';
                            const date = videoRenderer.publishedTimeText?.simpleText || '';
                            if (title) {
                                items.push({
                                    title,
                                    content: `${channel} - ${views} views - ${date}`,
                                    source: channel,
                                    sourceType: 'rumor',
                                    url: `https://www.youtube.com/watch?v=${videoId}`,
                                    publishedAt: date,
                                    type: 'rumor',
                                    confidence: 0.25,
                                });
                            }
                        }
                    }
                }
                catch {
                    console.error(`Error parsing YouTube data for ${channel}`);
                }
            }
        }
        catch (error) {
            console.error(`Error fetching YouTube ${channel}:`, error);
        }
    }
    return items.slice(0, 15);
}
async function fetchTelegramChannels() {
    const channels = [
        'AniDL_Release',
        'OngoingAnime',
        'anime_otaku_leaks',
    ];
    const items = [];
    for (const channel of channels) {
        try {
            const searchQuery = encodeURIComponent(`telegram ${channel} channel`);
            const url = `https://web.telegram.org/a/search?q=${searchQuery}`;
            const html = await fetch(url, {
                signal: AbortSignal.timeout(10000),
                headers: { 'User-Agent': USER_AGENT },
            }).then(r => r.text());
            const $ = cheerio.load(html);
            $('.message, .tgme_message').each((_, el) => {
                const content = $(el).find('.text, .message-text').first().text().trim();
                const date = $(el).find('.date, .datetime').first().text().trim();
                if (content) {
                    items.push({
                        title: `Mensagem em ${channel}`,
                        content: content.substring(0, 300),
                        source: `Telegram: ${channel}`,
                        sourceType: 'rumor',
                        publishedAt: date,
                        type: 'rumor',
                        confidence: 0.25,
                    });
                }
            });
        }
        catch (error) {
            console.error(`Error fetching Telegram ${channel}:`, error);
        }
    }
    return items.slice(0, 10);
}
async function fetchCubariMoe() {
    try {
        const html = await fetch(RUMOR_SOURCES.sites.cubariMoe, {
            signal: AbortSignal.timeout(10000),
            headers: { 'User-Agent': USER_AGENT },
        }).then(r => r.text());
        const $ = cheerio.load(html);
        const items = [];
        $('article, .series-item, .manga-item').each((_, el) => {
            const title = $(el).find('h2, h3, .title').first().text().trim();
            const content = $(el).find('.description, .excerpt').first().text().trim();
            const link = $(el).find('a').first().attr('href');
            if (title) {
                items.push({
                    title,
                    content: content.substring(0, 300),
                    source: 'Cubari.moe',
                    sourceType: 'rumor',
                    url: link,
                    type: 'rumor',
                    confidence: 0.3,
                });
            }
        });
        return items.slice(0, 10);
    }
    catch (error) {
        console.error('Error fetching Cubari.moe:', error);
        return [];
    }
}
async function fetchMangaPredictions() {
    try {
        const html = await fetch(RUMOR_SOURCES.sites.mangaPredictions, {
            signal: AbortSignal.timeout(10000),
            headers: { 'User-Agent': USER_AGENT },
        }).then(r => r.text());
        const $ = cheerio.load(html);
        const items = [];
        $('article, .prediction, .speculation').each((_, el) => {
            const title = $(el).find('h2, h3, .title').first().text().trim();
            const content = $(el).find('.content, p').first().text().trim();
            const link = $(el).find('a').first().attr('href');
            if (title) {
                items.push({
                    title,
                    content: content.substring(0, 300),
                    source: 'MangaPredictions',
                    sourceType: 'rumor',
                    url: link,
                    type: 'rumor',
                    confidence: 0.35,
                });
            }
        });
        return items.slice(0, 10);
    }
    catch (error) {
        console.error('Error fetching MangaPredictions:', error);
        return [];
    }
}
export function markAsRumor(items) {
    return items.map(item => ({
        ...item,
        type: 'rumor',
        confidence: Math.min(item.confidence, 0.35),
    }));
}
export async function crawlRumors() {
    console.log('🔍 Crawling rumor sources (Tier 4-5)...');
    const [worstGenItems, onePieceItems, arlongParkItems, fourChanAItems, fourChanVrItems, redditMangaCollectors, redditKagurabachi, malForums, twitterLeaks, youtubeLeaks, telegramItems, cubariItems, predictionsItems,] = await Promise.all([
        fetchWorstGen(),
        fetchOnePieceSpoiler(),
        fetchArlongPark(),
        fetch4chanAnime(),
        fetch4chanVN(),
        fetchRedditForum('r/MangaCollectors'),
        fetchRedditForum('r/Kagurabachi'),
        fetchMALForums(),
        fetchLeakerTwitter(),
        fetchLeakYouTubers(),
        fetchTelegramChannels(),
        fetchCubariMoe(),
        fetchMangaPredictions(),
    ]);
    const allResults = [
        ...worstGenItems,
        ...onePieceItems,
        ...arlongParkItems,
        ...fourChanAItems,
        ...fourChanVrItems,
        ...redditMangaCollectors,
        ...redditKagurabachi,
        ...malForums,
        ...twitterLeaks,
        ...youtubeLeaks,
        ...telegramItems,
        ...cubariItems,
        ...predictionsItems,
    ];
    console.log(`   - Found ${allResults.length} rumor items`);
    const markedResults = markAsRumor(allResults);
    return markedResults;
}
export async function runRumorsCrawler() {
    return crawlRumors();
}
if (require.main === module) {
    crawlRumors()
        .then(items => {
        console.log(`\n✅ Collected ${items.length} rumor items`);
        console.log(JSON.stringify(items.slice(0, 5), null, 2));
        process.exit(0);
    })
        .catch(error => {
        console.error('❌ Error running rumors crawler:', error);
        process.exit(1);
    });
}
