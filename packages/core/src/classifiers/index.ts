import type { NormalizedAnimeItem } from '../normalizer';
import { SOURCES_DATABASE } from '../sources-database';

export type ClassificationType = 'confirmed' | 'rumor' | 'announcement' | 'live_action';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type MediaType = 'anime' | 'manga' | 'manhwa' | 'live_action' | 'film' | 'series' | 'rumor';
export type ReliabilityTier = 'tier1' | 'tier2' | 'tier3' | 'tier4' | 'tier5';

export interface ClassificationResult {
  type: ClassificationType;
  confidence: number;
  level: ConfidenceLevel;
  reasons: string[];
  mediaType?: MediaType;
  tier?: ReliabilityTier;
}

export interface CrossVerificationResult {
  verified: boolean;
  confidence: number;
  tier: ReliabilityTier;
  supportingSources: number;
  conflictingSources: number;
}

export const RELIABILITY_TIERS = {
  tier1: { score: 1.0, description: 'Official/Government' },
  tier2: { score: 0.85, description: 'Established Database' },
  tier3: { score: 0.7, description: 'Trusted News' },
  tier4: { score: 0.5, description: 'Community' },
  tier5: { score: 0.3, description: 'Unverified (Rumors)' },
} as const;

export const SOURCE_TO_TIER: Record<string, ReliabilityTier> = {
  anilist: 'tier1',
  kitsu: 'tier1',
  mal: 'tier2',
  jikan: 'tier2',
  'nag library': 'tier1',
  myanimelist: 'tier2',
  animeplanet: 'tier2',
  notify: 'tier2',
  rss_database: 'tier2',
  rss_news: 'tier3',
  rss: 'tier2',
  site_official: 'tier1',
  site_news: 'tier3',
  site: 'tier3',
  social_twitter: 'tier4',
  social_discord: 'tier4',
  social_reddit: 'tier4',
  social: 'tier4',
  rumor: 'tier5',
  unknown: 'tier5',
};

export const MEDIA_TYPE_PATTERNS: Record<MediaType, RegExp[]> = {
  anime: [
    /anime/i,
    /animated series/i,
    /动画/i,
    /시리즈.*动画/i,
  ],
  manga: [
    /manga/i,
    /漫画/i,
    /\s漫画$/i,
  ],
  manhwa: [
    /manhwa/i,
    /웹툰/i,
    /webtoon/i,
    /digital manhwa/i,
  ],
  live_action: [
    /live[-\s]action/i,
    /live action/i,
    /drama/i,
    /真人/i,
    /실사/i,
  ],
  film: [
    /movie/i,
    /film/i,
    /映画/i,
    /영화/i,
    /\s电影$/i,
  ],
  series: [
    /tv series/i,
    /tv show/i,
    /series/i,
    /드라마/i,
    /\s电视剧$/i,
  ],
  rumor: [
    /rumor/i,
    /rumour/i,
    /speculation/i,
    /unconfirmed/i,
    /possible/i,
  ],
};

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

export function detectMediaType(item: NormalizedAnimeItem): MediaType {
  const content = `${item.anime} ${item.content || ''} ${item.type || ''}`.toLowerCase();

  for (const [mediaType, patterns] of Object.entries(MEDIA_TYPE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        return mediaType as MediaType;
      }
    }
  }

  return 'anime';
}

export function getSourceTier(sourceKey: string): ReliabilityTier {
  const normalizedKey = sourceKey.toLowerCase().trim();
  return SOURCE_TO_TIER[normalizedKey] || SOURCE_TO_TIER.unknown;
}

export function getTierScore(tier: ReliabilityTier): number {
  return RELIABILITY_TIERS[tier].score;
}

function getSourceReliability(sourceName: string): number {
  const normalizedSource = sourceName.toLowerCase().trim();
  
  const allSources = [
    ...SOURCES_DATABASE.apis.priority1,
    ...SOURCES_DATABASE.apis.priority2,
    ...SOURCES_DATABASE.apis.priority3,
    ...SOURCES_DATABASE.rss.group1,
    ...SOURCES_DATABASE.rss.group2,
    ...SOURCES_DATABASE.sites.group1,
    ...SOURCES_DATABASE.sites.group2,
    ...SOURCES_DATABASE.social.group1,
    ...SOURCES_DATABASE.social.group2,
  ];

  const source = allSources.find(s => 
    s.name.toLowerCase().includes(normalizedSource) || 
    normalizedSource.includes(s.name.toLowerCase())
  );
  
  return source?.reliability || 0.5;
}

export function classifyItem(item: NormalizedAnimeItem): ClassificationResult {
  const reasons: string[] = [];
  let type: ClassificationType = item.type;
  let confidence = SOURCE_SCORES[item.sourceType] || 0.5;

  const content = `${item.anime} ${item.content || ''}`.toLowerCase();

  const tier = getSourceTier(item.source || item.sourceType);
  const tierScore = getTierScore(tier);

  confidence = Math.max(confidence, tierScore);
  reasons.push(`source tier: ${tier} (${RELIABILITY_TIERS[tier].description})`);

  const sourceReliability = getSourceReliability(item.source || item.sourceType);
  confidence = Math.min(confidence * sourceReliability, 1.0);
  reasons.push(`source reliability: ${sourceReliability} (from SOURCES_DATABASE)`);

  const mediaType = detectMediaType(item);
  reasons.push(`media type: ${mediaType}`);

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
    mediaType,
    tier,
  };
}

export function crossVerify(
  items: NormalizedAnimeItem[]
): Map<string, CrossVerificationResult> {
  const results = new Map<string, CrossVerificationResult>();

  const grouped = new Map<string, NormalizedAnimeItem[]>();
  for (const item of items) {
    const key = `${item.anime.toLowerCase()}-${item.episode ?? 'unknown'}`;
    const existing = grouped.get(key) || [];
    existing.push(item);
    grouped.set(key, existing);
  }

  for (const [key, groupItems] of grouped) {
    const tierCounts = { tier1: 0, tier2: 0, tier3: 0, tier4: 0, tier5: 0 };
    let totalConfidence = 0;

    for (const item of groupItems) {
      const tier = getSourceTier(item.source || item.sourceType);
      tierCounts[tier]++;
      totalConfidence += getTierScore(tier);
    }

    const highTierSources = tierCounts.tier1 + tierCounts.tier2;
    const lowTierSources = tierCounts.tier4 + tierCounts.tier5;
    const avgConfidence = totalConfidence / groupItems.length;

    const verified = highTierSources >= 2;
    
    let finalConfidence = avgConfidence;
    if (lowTierSources > 0 && highTierSources === 0) {
      finalConfidence *= 0.7;
    } else if (highTierSources >= 3) {
      finalConfidence = Math.min(finalConfidence * 1.1, 1.0);
    }

    let dominantTier: ReliabilityTier = 'tier5';
    const maxCount = Math.max(...Object.values(tierCounts));
    for (const [tier, count] of Object.entries(tierCounts)) {
      if (count === maxCount) {
        dominantTier = tier as ReliabilityTier;
        break;
      }
    }

    results.set(key, {
      verified,
      confidence: finalConfidence,
      tier: dominantTier,
      supportingSources: groupItems.length,
      conflictingSources: 0,
    });
  }

  return results;
}

export function classifyBatch(items: NormalizedAnimeItem[]): Map<string, ClassificationResult> {
  const results = new Map<string, ClassificationResult>();
  
  for (const item of items) {
    const key = `${item.anime}-${item.episode}`;
    results.set(key, classifyItem(item));
  }
  
  return results;
}