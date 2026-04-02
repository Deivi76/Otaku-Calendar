import { inngest } from '../client';
import type { NormalizedItem } from '../../utils/queue';

interface WorkerCompletedData {
  domain: string;
  normalizedItems: NormalizedItem[];
  crawlId: string;
}

const CHUNK_SIZE = 1000;
const SIMILARITY_THRESHOLD = 0.7;

function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .replace(/\s+/g, '');
}

function levenshtein(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + 1);
      }
    }
  }

  return dp[m][n];
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeKey(str1);
  const s2 = normalizeKey(str2);

  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.includes(shorter)) {
    return shorter.length / longer.length;
  }

  const editDistance = levenshtein(shorter, longer);
  return (longer.length - editDistance) / longer.length;
}

async function deduplicateWithChunks(items: NormalizedItem[]): Promise<NormalizedItem[]> {
  const unique = new Set<string>();
  const result: NormalizedItem[] = [];

  console.log(`[Collector] Starting deduplicate with ${items.length} items...`);

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    
    for (const item of chunk) {
      const key = `${normalizeKey(item.anime)}-${item.episode ?? 'null'}`;
      
      if (!unique.has(key)) {
        unique.add(key);
        result.push(item);
      }
    }

    console.log(`[Collector] Processed ${Math.min(i + CHUNK_SIZE, items.length)}/${items.length} items, unique so far: ${result.length}`);
  }

  console.log(`[Collector] Deduplicate complete: ${items.length} → ${result.length} unique items`);
  return result;
}

function filterRumors(items: NormalizedItem[]): NormalizedItem[] {
  const rumors: NormalizedItem[] = [];
  const nonRumors: NormalizedItem[] = [];

  for (const item of items) {
    if (item.type === 'rumor') {
      rumors.push(item);
    } else {
      nonRumors.push(item);
    }
  }

  if (rumors.length === 0) {
    return items;
  }

  console.log(`[Collector] Filtering ${rumors.length} rumors using similarity...`);

  const filteredRumors: NormalizedItem[] = [];
  const seenContent = new Set<string>();

  for (const rumor of rumors) {
    const rumorContent = `${rumor.anime} ${rumor.content || ''}`.toLowerCase();
    const normalizedContent = normalizeKey(rumorContent);

    let isDuplicate = false;

    for (const existing of filteredRumors) {
      const existingContent = `${existing.anime} ${existing.content || ''}`.toLowerCase();
      const normalizedExisting = normalizeKey(existingContent);

      const similarity = calculateSimilarity(normalizedContent, normalizedExisting);

      if (similarity >= SIMILARITY_THRESHOLD) {
        if (rumor.confidence > existing.confidence) {
          const idx = filteredRumors.indexOf(existing);
          filteredRumors[idx] = rumor;
        }
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      filteredRumors.push(rumor);
    }
  }

  console.log(`[Collector] Rumors filtered: ${rumors.length} → ${filteredRumors.length} unique rumors`);

  return [...nonRumors, ...filteredRumors];
}

async function saveToCache(items: NormalizedItem[]): Promise<void> {
  try {
    const cacheKey = `crawl_${new Date().toISOString().split('T')[0]}`;
    
    const { CacheManager } = await import('../../utils/cache');
    const cache = new CacheManager();
    
    cache.set(cacheKey, items, { ttl: 24 * 60 * 60 * 1000 });
    console.log(`[Collector] Saved ${items.length} items to cache`);
  } catch (error) {
    console.error(`[Collector] Error saving to cache:`, error);
  }
}

async function saveToSupabase(items: NormalizedItem[]): Promise<void> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = (() => {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !key) return null;
      return createClient(url, key);
    })();

    if (!supabase) {
      console.error('[Collector] Supabase client not initialized');
      return;
    }

    const animeUpdates: any[] = [];
    const animes: Map<string, any> = new Map();
    const rumors: any[] = [];
    const schedules: any[] = [];

    for (const item of items) {
      const baseData = {
        anime: item.anime,
        source: item.source,
        content: item.content || null,
        url: item.url || null,
        confidence: item.confidence,
      };

      switch (item.type) {
        case 'confirmed':
          animeUpdates.push({
            ...baseData,
            episode: item.episode,
            aired_at: item.date?.toISOString() || null,
          });

          if (!animes.has(item.anime)) {
            animes.set(item.anime, {
              title: item.anime,
              type: item.mediaType || 'tv',
              status: 'airing',
            });
          }
          break;

        case 'rumor':
        case 'announcement':
        case 'live_action':
          rumors.push({
            title: item.anime,
            content: item.content || null,
            media_type: item.mediaType || 'anime',
            status: item.type === 'rumor' ? 'circulating' : 'unverified',
            confidence_score: item.confidence,
            first_seen_at: new Date().toISOString(),
            last_updated: new Date().toISOString(),
          });
          break;
      }

      if (item.date) {
        schedules.push({
          anime: item.anime,
          episode_number: item.episode,
          airing_at: item.date.toISOString(),
          day_of_week: item.date.toLocaleDateString('en-US', { weekday: 'long' }),
        });
      }
    }

    if (animeUpdates.length > 0) {
      const { error } = await supabase.from('anime_updates').insert(animeUpdates);
      if (error) console.error('[Collector] anime_updates insert error:', error);
    }

    if (animes.size > 0) {
      const animeArray = Array.from(animes.values());
      const { error } = await supabase.from('animes').upsert(animeArray, { onConflict: 'title' });
      if (error) console.error('[Collector] animes upsert error:', error);
    }

    if (rumors.length > 0) {
      const { error } = await supabase.from('rumors').insert(rumors);
      if (error) console.error('[Collector] rumors insert error:', error);
    }

    if (schedules.length > 0) {
      const { error } = await supabase.from('schedule').insert(schedules);
      if (error) console.error('[Collector] schedule insert error:', error);
    }

    console.log(`[Collector] Saved to Supabase: ${animeUpdates.length} updates, ${animes.size} animes, ${rumors.length} rumors, ${schedules.length} schedules`);
  } catch (error) {
    console.error('[Collector] Error saving to Supabase:', error);
  }
}

export const runCollector = inngest.createFunction(
  {
    id: 'crawler-collector',
    name: 'crawler-collector',
    batchEvents: {
      maxSize: 50,
      timeout: '300s',
      key: 'event.data.crawlId',
    },
  },
  { event: 'crawler/worker.completed' },
  async ({ events }) => {
    console.log(`[Collector] Received ${events.length} worker events`);

    const crawlId = events[0]?.data?.crawlId || new Date().toISOString();

    const allItems: NormalizedItem[] = events.flatMap(e => e.data.normalizedItems || []);
    console.log(`[Collector] Total items to process: ${allItems.length}`);

    if (allItems.length === 0) {
      console.log('[Collector] No items to process');
      return { status: 'no_items', processed: 0 };
    }

    const deduplicated = await deduplicateWithChunks(allItems);

    const filtered = filterRumors(deduplicated);

    await saveToSupabase(filtered);
    await saveToCache(filtered);

    console.log(`[Collector] Complete: ${allItems.length} → ${deduplicated.length} deduped → ${filtered.length} final`);

    return {
      status: 'success',
      totalInput: allItems.length,
      afterDedup: deduplicated.length,
      finalCount: filtered.length,
      crawlId,
    };
  }
);