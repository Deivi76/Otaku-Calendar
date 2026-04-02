import type { CrawledItem, NormalizedItem } from '../../utils/queue';

function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .replace(/\s+/g, '');
}

function extractAnimeName(text: string): string {
  let name = text
    .replace(/episode\s*\d+/gi, '')
    .replace(/[-–]\s*episode\s*\d+/gi, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .trim();

  const colonIndex = name.lastIndexOf(':');
  if (colonIndex > 0) {
    name = name.substring(0, colonIndex).trim();
  }

  return name;
}

function extractEpisode(text: string): number | null {
  const patterns = [
    /(?:episode|ep\.?|ep)\s*(\d+)/i,
    /(?:[\w\s]+)\s*-\s*episode\s*(\d+)/i,
    /(\d+)\s*(?:voz|leg|dub)/i,
    /第(\d+)話/i,
    /第(\d+)集/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > 0 && num < 1000) {
        return num;
      }
    }
  }

  return null;
}

function extractDate(text: string): Date | null {
  const now = new Date();
  
  const relativePatterns = [
    { pattern: /hoje|today/i, offset: 0 },
    { pattern: /amanhã|tomorrow/i, offset: 1 },
    { pattern: /ontem|yesterday/i, offset: -1 },
    { pattern: /próxima?\s*semana|next\s*week/i, offset: 7 },
  ];

  for (const { pattern, offset } of relativePatterns) {
    if (pattern.test(text)) {
      const date = new Date(now);
      date.setDate(date.getDate() + offset);
      return date;
    }
  }

  const datePatterns = [
    { regex: /(\d{4})-(\d{2})-(\d{2})/, format: 'ymd' },
    { regex: /(\d{2})\/(\d{2})\/(\d{4})/, format: 'mdy' },
    { regex: /(\d{2})-(\d{2})-(\d{4})/, format: 'mdy' },
  ];

  for (const { regex, format } of datePatterns) {
    const match = text.match(regex);
    if (match) {
      let year: number, month: number, day: number;
      
      if (format === 'ymd') {
        year = parseInt(match[1], 10);
        month = parseInt(match[2], 10) - 1;
        day = parseInt(match[3], 10);
      } else {
        month = parseInt(match[1], 10) - 1;
        day = parseInt(match[2], 10);
        year = parseInt(match[3], 10);
      }

      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  return null;
}

function classifyType(item: CrawledItem): 'confirmed' | 'rumor' | 'announcement' | 'live_action' {
  const content = (item.content || item.title).toLowerCase();
  
  if (content.includes('oficial') || content.includes('official') || content.includes('confirmado')) {
    return 'confirmed';
  }
  if (content.includes('rumor') || content.includes('rumour') || content.includes('speculation')) {
    return 'rumor';
  }
  if (content.includes('anúncio') || content.includes('announcement') || content.includes('announced')) {
    return 'announcement';
  }
  if (content.includes('live action') || content.includes('真人') || content.includes('live-action')) {
    return 'live_action';
  }
  
  return 'confirmed';
}

function normalize(item: CrawledItem): NormalizedItem {
  const anime = extractAnimeName(item.title);
  const episode = extractEpisode(item.content || item.title);
  const date = extractDate(item.content || item.title);
  const type = classifyType(item);

  return {
    anime,
    episode,
    date,
    type,
    source: item.source,
    sourceType: item.sourceType,
    confidence: 0.5,
    url: item.url,
    content: item.content,
  };
}

function getSourceTier(source: string): string {
  const normalizedSource = source.toLowerCase().trim();
  
  if (normalizedSource.includes('anilist') || normalizedSource.includes('kitsu')) return 'tier1';
  if (normalizedSource.includes('jikan') || normalizedSource.includes('mal') || normalizedSource.includes('myanimelist')) return 'tier2';
  if (normalizedSource.includes('rss')) return 'tier2';
  if (normalizedSource.includes('site')) return 'tier3';
  if (normalizedSource.includes('social') || normalizedSource.includes('twitter') || normalizedSource.includes('reddit')) return 'tier4';
  
  return 'tier3';
}

function classifyItem(item: NormalizedItem): { confidence: number; type: string; mediaType: string } {
  const sourceScore: Record<string, number> = {
    api: 0.9,
    rss: 0.8,
    site: 0.6,
    social: 0.4,
  };

  const tierScore: Record<string, number> = {
    tier1: 1.0,
    tier2: 0.85,
    tier3: 0.7,
    tier4: 0.5,
    tier5: 0.3,
  };

  let confidence = sourceScore[item.sourceType] || 0.5;
  const tier = getSourceTier(item.source);
  const tierConf = tierScore[tier] || 0.5;
  confidence = Math.max(confidence, tierConf);

  const keywordBoost: Record<string, number> = {
    oficial: 1.0,
    official: 1.0,
    confirmed: 1.0,
    announced: 0.9,
    rumor: 0.3,
    speculation: 0.3,
  };

  const content = `${item.anime} ${item.content || ''}`.toLowerCase();
  for (const [keyword, boost] of Object.entries(keywordBoost)) {
    if (content.includes(keyword)) {
      confidence = Math.min(confidence + boost, 1.0);
    }
  }

  if (item.sourceType === 'api') {
    confidence = Math.min(confidence + 0.2, 1.0);
  }

  let mediaType = 'anime';
  if (/manga|漫画/i.test(content)) mediaType = 'manga';
  if (/manhwa|웹툰|webtoon/i.test(content)) mediaType = 'manhwa';
  if (/live[-\s]?action|真人/i.test(content)) mediaType = 'live_action';
  if (/movie|film|映画/i.test(content)) mediaType = 'film';

  return {
    confidence,
    type: item.type,
    mediaType,
  };
}

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