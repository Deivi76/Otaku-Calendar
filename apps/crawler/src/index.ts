import 'dotenv/config';
import { crawlSites } from './sources/sites';
import { crawlRSSFeeds } from './sources/rss';
import { crawlAniList } from './sources/anilist';
import { crawlJikan } from './sources/jikan';
import { SOURCES, getEnvConfig } from './sources/config';
import { normalize, classifyItem } from '@otaku-calendar/core';
import { deduplicate } from '@otaku-calendar/core';

const CRAWLER_CONFIG = {
  sites: (process.env.CRAWLER_SITES || '').split(',').filter(Boolean),
  rss: (process.env.CRAWLER_RSS || '').split(',').filter(Boolean),
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
  console.log('📡 Loading sources from config...');
  
  const envConfig = getEnvConfig();
  console.log(`   - ${envConfig.apis.split(',').length} APIs configured`);
  console.log(`   - ${envConfig.sites.split(',').length} sites configured`);
  console.log(`   - ${envConfig.rss.split(',').length} RSS feeds configured`);

  const [siteResults, rssResults, anilistResults, jikanResults] = await Promise.all([
    crawlSites(CRAWLER_CONFIG.sites),
    crawlRSSFeeds(CRAWLER_CONFIG.rss),
    crawlAniList(),
    crawlJikan(),
  ]);

  console.log(`📊 Crawled results:`);
  console.log(`   - Sites: ${siteResults.length} items`);
  console.log(`   - RSS: ${rssResults.length} items`);
  console.log(`   - AniList: ${anilistResults.length} items`);
  console.log(`   - Jikan: ${jikanResults.length} items`);

  const allResults = [
    ...siteResults,
    ...rssResults,
    ...anilistResults,
    ...jikanResults,
  ];

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
      console.log(`   ${i + 1}. ${event.title?.substring(0, 50)}... [${event.type}]`);
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
