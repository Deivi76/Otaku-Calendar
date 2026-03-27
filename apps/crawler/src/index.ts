import 'dotenv/config';
import { crawlAPI_Priority1 } from './sources/api/priority1';
import { crawlAPI_Priority2 } from './sources/api/priority2';
import { crawlAPI_Priority3 } from './sources/api/priority3';
import { crawlRSS_Group1 } from './sources/rss/group1';
import { crawlRSS_Group2 } from './sources/rss/group2';
import { crawlSites_Group1 } from './sources/sites/group1';
import { crawlSites_Group2 } from './sources/sites/group2';
import { crawlSocial_Group1 } from './sources/social/group1';
import { crawlSocial_Group2 } from './sources/social/group2';
import { extractAndClassify } from './sources/extractors';
import { getEnvConfig } from './sources/config';
import { deduplicate } from '@otaku-calendar/core';
import { CrawlerQueue, CrawledItem, NormalizedItem } from './utils/queue';

const CRAWLER_CONFIG = {
  apis: {
    priority1: ['AniList', 'Jikan', 'Kitsu'],
    priority2: ['TMDB', 'MangaDex', 'Comick', 'TVmaze', 'Trakt', 'SIMKL'],
    priority3: ['Other APIs'],
  },
  rss: {
    group1: 'news (141 feeds)',
    group2: 'manga+community+scanlation (46 feeds)',
  },
  sites: {
    group1: 'news+databases (167 sites)',
    group2: 'other categories (198 sites)',
  },
  social: {
    group1: 'Twitter+Reddit+YouTube (290)',
    group2: 'Discord+TikTok+Facebook+Twitch+Telegram (97)',
  },
};

async function runCrawler() {
  console.log('🚀 Starting Otaku Calendar Crawler (Type-Based)...');
  console.log('⏰ Time:', new Date().toISOString());
  
  const envConfig = getEnvConfig();
  console.log(`📡 Loading sources from config...`);
  console.log(`   - APIs: priority1, priority2, priority3`);
  console.log(`   - RSS: group1, group2`);
  console.log(`   - Sites: group1, group2`);
  console.log(`   - Social: group1, group2`);

  const queue = new CrawlerQueue();

  queue.add('API_Priority1', crawlAPI_Priority1, 1, extractAndClassify);
  queue.add('API_Priority2', crawlAPI_Priority2, 2, extractAndClassify);
  queue.add('API_Priority3', crawlAPI_Priority3, 3, extractAndClassify);
  queue.add('RSS_Group1', crawlRSS_Group1, 1, extractAndClassify);
  queue.add('RSS_Group2', crawlRSS_Group2, 2, extractAndClassify);
  queue.add('Sites_Group1', crawlSites_Group1, 1, extractAndClassify);
  queue.add('Sites_Group2', crawlSites_Group2, 2, extractAndClassify);
  queue.add('Social_Group1', crawlSocial_Group1, 1, extractAndClassify);
  queue.add('Social_Group2', crawlSocial_Group2, 2, extractAndClassify);

  const results = await queue.processAll();

  const normalizedResults = queue.getNormalizedResults();

  const counts: Record<string, number> = {};
  const allResults: CrawledItem[] = [];

  results.forEach(result => {
    counts[result.name] = result.items.length;
    allResults.push(...result.items);
  });

  const total = allResults.length;
  console.log(`\n📊 Crawled ${total} total items`);
  Object.entries(counts).forEach(([name, count]) => {
    console.log(`   - ${name}: ${count}`);
  });

  console.log(`\n🔍 Normalized ${normalizedResults.length} items (via extractors)`);

  console.log('🔄 Deduplicating...');
  const { unique, duplicates } = deduplicate(normalizedResults as any);

  console.log(`\n✅ Final: ${unique.length} unique events (${duplicates} duplicates removed)`);
  
  if (unique.length > 0) {
    console.log('\n📋 Sample events:');
    unique.slice(0, 3).forEach((event: any, i) => {
      console.log(`   ${i + 1}. ${event.anime?.substring(0, 50)}... [${event.type}] [${event.mediaType || 'unknown'}]`);
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

export { runCrawler, CRAWLER_CONFIG };