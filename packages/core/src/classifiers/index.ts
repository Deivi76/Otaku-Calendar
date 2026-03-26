import type { NormalizedAnimeItem } from '../normalizer';

export type ClassificationType = 'confirmed' | 'rumor' | 'announcement' | 'live_action';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ClassificationResult {
  type: ClassificationType;
  confidence: number;
  level: ConfidenceLevel;
  reasons: string[];
}

const SOURCE_SCORES: Record<string, number> = {
  api: 0.9,
  rss: 0.8,
  site: 0.6,
  social: 0.4,
};

const KEYWORD_SCORES: Record<string, number> = {
  oficial: 1.0,
  official: 1.0,
  confirmado: 1.0,
  confirmed: 1.0,
  announced: 0.9,
  announcement: 0.9,
  'anúncio': 0.9,
  premiere: 0.9,
  estreias: 0.9,
  debut: 0.9,
  rumor: 0.3,
  rumour: 0.3,
  speculation: 0.3,
  possible: 0.4,
  pode: 0.4,
  might: 0.4,
  'possível': 0.4,
};

export function classifyItem(item: NormalizedAnimeItem): ClassificationResult {
  const reasons: string[] = [];
  let type: ClassificationType = item.type;
  let confidence = SOURCE_SCORES[item.sourceType] || 0.5;
  
  const content = `${item.anime} ${item.content || ''}`.toLowerCase();

  for (const [keyword, score] of Object.entries(KEYWORD_SCORES)) {
    if (content.includes(keyword)) {
      if (score === 1.0) {
        type = 'confirmed';
      } else if (score <= 0.4 && type !== 'confirmed') {
        type = 'rumor';
      }
      confidence = Math.max(confidence, score);
      reasons.push(`found keyword: ${keyword}`);
    }
  }

  if (item.sourceType === 'api') {
    confidence = Math.min(confidence + 0.2, 1.0);
    reasons.push('source is API (high reliability)');
  }

  if (item.episode === null) {
    confidence *= 0.8;
    reasons.push('no episode number found');
  }

  let level: ConfidenceLevel;
  if (confidence >= 0.8) {
    level = 'high';
  } else if (confidence >= 0.5) {
    level = 'medium';
  } else {
    level = 'low';
  }

  return {
    type,
    confidence,
    level,
    reasons,
  };
}

export function classifyBatch(items: NormalizedAnimeItem[]): Map<string, ClassificationResult> {
  const results = new Map<string, ClassificationResult>();
  
  for (const item of items) {
    const key = `${item.anime}-${item.episode}`;
    results.set(key, classifyItem(item));
  }
  
  return results;
}
