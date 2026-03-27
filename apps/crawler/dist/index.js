import 'dotenv/config';
import { crawlAnime } from './sources/anime';
import { crawlManga } from './sources/manga';
import { crawlFilms } from './sources/film';
import { crawlSeries } from './sources/series';
import { crawlManhwa } from './sources/manhwa';
import { crawlLiveActions } from './sources/liveAction';
import { crawlRumors } from './sources/rumors';
import { SOURCES, getEnvConfig } from './sources/config';
import { normalize, classifyItem } from '@otaku-calendar/core';
import { deduplicate } from '@otaku-calendar/core';
import { CrawlerQueue } from './utils/queue';
const rssFromEnv = process.env.CRAWLER_RSS ? process.env.CRAWLER_RSS.split(',').filter(Boolean) : [];
const rssFallback = [
    ...SOURCES.rss.news.map(f => f.url),
    ...SOURCES.rss.manga.map(f => f.url),
    ...SOURCES.rss.community.map(f => f.url),
];
const CRAWLER_CONFIG = {
    sites: process.env.CRAWLER_SITES ? process.env.CRAWLER_SITES.split(',').filter(Boolean) : SOURCES.sites.news.map(s => s.url),
    rss: rssFromEnv.length ? rssFromEnv : rssFallback,
    apis: (process.env.CRAWLER_APIS || '').split(',').filter(Boolean),
    webtoon: (process.env.CRAWLER_WEBTOON || '').split(',').filter(Boolean),
    social: {
        x: (process.env.CRAWLER_SOCIAL_X || '').split(',').filter(Boolean),
        instagram: (process.env.CRAWLER_SOCIAL_INSTAGRAM || '').split(',').filter(Boolean),
        youtube: (process.env.CRAWLER_SOCIAL_YOUTUBE || '').split(',').filter(Boolean),
    },
};
async function runCrawler() {
    console.log('🚀 Starting Otaku Calendar Crawler...');
    console.log('⏰ Time:', new Date().toISOString());
    const envConfig = getEnvConfig();
    console.log(`📡 Loading sources from config...`);
    console.log(`   - ${envConfig.apis.split(',').length} APIs configured`);
    console.log(`   - ${envConfig.sites.split(',').length} sites configured`);
    console.log(`   - ${envConfig.rss.split(',').length} RSS feeds configured`);
    const queue = new CrawlerQueue();
    queue.add('Anime', crawlAnime, 1);
    queue.add('Manga', crawlManga, 1);
    queue.add('Films', crawlFilms, 2);
    queue.add('Series', crawlSeries, 2);
    queue.add('Manhwa', crawlManhwa, 3);
    queue.add('LiveActions', crawlLiveActions, 3);
    queue.add('Rumors', crawlRumors, 4);
    const results = await queue.processAll();
    const counts = {
        Anime: 0,
        Manga: 0,
        Films: 0,
        Series: 0,
        Manhwa: 0,
        LiveActions: 0,
        Rumors: 0,
    };
    const allResults = [];
    results.forEach(result => {
        counts[result.name] = result.items.length;
        allResults.push(...result.items);
    });
    const total = allResults.length;
    console.log(`\n📊 Crawled ${total} total items`);
    console.log(`   - Anime: ${counts.Anime}`);
    console.log(`   - Manga: ${counts.Manga}`);
    console.log(`   - Films: ${counts.Films}`);
    console.log(`   - Series: ${counts.Series}`);
    console.log(`   - Manhwa: ${counts.Manhwa}`);
    console.log(`   - LiveActions: ${counts.LiveActions}`);
    console.log(`   - Rumors: ${counts.Rumors}`);
    console.log(`\n🔍 Normalizing ${allResults.length} items...`);
    const normalized = allResults.map(item => normalize(item));
    console.log('🏷️ Classifying items...');
    const classified = normalized.map(item => {
        const classification = classifyItem(item);
        return { ...item, confidence: classification.confidence, type: classification.type };
    });
    console.log('🔄 Deduplicating...');
    const { unique, duplicates } = deduplicate(classified);
    console.log(`\n✅ Final: ${unique.length} unique events (${duplicates} duplicates removed)`);
    if (unique.length > 0) {
        console.log('\n📋 Sample events:');
        unique.slice(0, 3).forEach((event, i) => {
            console.log(`   ${i + 1}. ${event.anime?.substring(0, 50)}... [${event.type}]`);
        });
    }
    return unique;
}
if (require.main === module) {
    runCrawler()
        .then(events => {
        console.log('\n📋 All events:', JSON.stringify(events, null, 2));
        process.exit(0);
    })
        .catch(error => {
        console.error('❌ Crawler error:', error);
        process.exit(1);
    });
}
export { runCrawler, CRAWLER_CONFIG, SOURCES };
