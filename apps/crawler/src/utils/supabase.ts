import { createClient } from '@supabase/supabase-js';
import type { NormalizedItem } from '../utils/queue';
import { CacheManager } from './cache';

const supabase = (() => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set');
    }
    return null;
  }
  return createClient(url, key);
})();
const cache = new CacheManager();

export interface SaveResult {
  success: boolean;
  saved: number;
  errors: string[];
}

export async function saveToSupabase(items: NormalizedItem[]): Promise<SaveResult> {
  if (!supabase) {
    console.error('❌ Supabase client not initialized');
    return { success: false, saved: 0, errors: ['Supabase client not initialized'] };
  }

  const errors: string[] = [];
  let saved = 0;

  const animeUpdates: any[] = [];
  const animes: Map<string, any> = new Map();
  const rumors: any[] = [];
  const schedules: any[] = [];

  for (const item of items) {
    try {
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
    } catch (err) {
      errors.push(`Error processing item ${item.anime}: ${err}`);
    }
  }

  try {
    if (animeUpdates.length > 0) {
      const { error } = await supabase.from('anime_updates').insert(animeUpdates);
      if (error) {
        errors.push(`anime_updates insert error: ${error.message}`);
      } else {
        saved += animeUpdates.length;
      }
    }

    if (animes.size > 0) {
      const animeArray = Array.from(animes.values());
      const { error } = await supabase.from('animes').upsert(animeArray, { onConflict: 'title' });
      if (error) {
        errors.push(`animes upsert error: ${error.message}`);
      } else {
        saved += animeArray.length;
      }
    }

    if (rumors.length > 0) {
      const { error } = await supabase.from('rumors').insert(rumors);
      if (error) {
        errors.push(`rumors insert error: ${error.message}`);
      } else {
        saved += rumors.length;
      }
    }

    if (schedules.length > 0) {
      const { error } = await supabase.from('schedule').insert(schedules);
      if (error) {
        errors.push(`schedule insert error: ${error.message}`);
      } else {
        saved += schedules.length;
      }
    }

  } catch (err) {
    errors.push(`Supabase save error: ${err}`);
  }

  return { success: errors.length === 0, saved, errors };
}

export function saveToCache(items: NormalizedItem[]): void {
  const key = `crawl_${new Date().toISOString().split('T')[0]}`;
  cache.set(key, items, { ttl: 24 * 60 * 60 * 1000 });
  console.log(`💾 Saved ${items.length} items to local cache`);
}

export async function getFromCache(): Promise<NormalizedItem[] | null> {
  const key = `crawl_${new Date().toISOString().split('T')[0]}`;
  return cache.get<NormalizedItem[]>(key, 'crawl');
}
