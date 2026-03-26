import 'dotenv/config';
import { crawlSites } from './sources/sites';
import { crawlRSSFeeds } from './sources/rss';
import { crawlAniList } from './sources/anilist';
import { crawlJikan } from './sources/jikan';
import { normalize, classifyItem } from '@otaku-calendar/core';
import { deduplicate } from '@otaku-calendar/core';

const SOURCES = {
  sites: (process.env.CRAWLER_SITES || '').split(',').filter(Boolean),
  rss: (process.env.CRAWLER_RSS || '').split(',').filter(Boolean),
};

async function runCrawler() {
  console.log('🚀 Starting crawler...');

  const [siteResults, rssResults, anilistResults, jikanResults] = await Promise.all([
    crawlSites(SOURCES.sites),
    crawlRSSFeeds(SOURCES.rss),
    crawlAniList(),
    crawlJikan(),
  ]);

  console.log(`📊 Crawled: ${siteResults.length} sites, ${rssResults.length} RSS, ${anilistResults.length} AniList, ${jikanResults.length} Jikan`);

  const allResults = [...siteResults, ...rssResults, ...anilistResults, ...jikanResults];

  console.log('🔍 Normalizing...');
  const normalized = allResults.map(item => normalize(item));

  console.log('🏷️ Classifying...');
  const classified = normalized.map(item => {
    const classification = classifyItem(item);
    return { ...item, confidence: classification.confidence, type: classification.type };
  });

  console.log('🔄 Deduplicating...');
  const { unique } = deduplicate(classified);

  console.log(`✅ Final: ${unique.length} unique events`);
  
  return unique;
}

if (require.main === module) {
  runCrawler()
    .then(events => {
      console.log('📋 Events:', JSON.stringify(events, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Crawler error:', error);
      process.exit(1);
    });
}

export { runCrawler };
