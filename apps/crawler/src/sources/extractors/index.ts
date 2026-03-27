import { normalize, classifyItem } from '@otaku-calendar/core';
import type { CrawledItem, NormalizedItem } from '../../utils/queue';

export async function extractAndClassify(items: CrawledItem[]): Promise<NormalizedItem[]> {
  if (!items || items.length === 0) {
    return [];
  }

  const normalized = items.map(item => normalize(item));

  const classified = normalized.map(item => {
    const classification = classifyItem(item);
    return {
      ...item,
      confidence: classification.confidence,
      type: classification.type as 'confirmed' | 'rumor' | 'announcement' | 'live_action',
      mediaType: classification.mediaType,
    };
  });

  return classified;
}