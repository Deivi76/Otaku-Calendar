export interface RawAnimeItem {
  title: string;
  content: string;
  source: string;
  sourceType: 'site' | 'rss' | 'api' | 'social' | 'platform' | 'community' | 'rumor';
  url?: string;
  publishedAt?: string;
}

export interface NormalizedAnimeItem {
  anime: string;
  episode: number | null;
  date: Date | null;
  type: 'confirmed' | 'rumor' | 'announcement' | 'live_action';
  source: string;
  sourceType: 'site' | 'rss' | 'api' | 'social' | 'platform' | 'community' | 'rumor';
  confidence: number;
  url?: string;
  content?: string;
}

const ANIME_NAME_PATTERNS = [
  /(?:[\w\s:]+?)\s*[-–]\s*(?:episode\s*)?(\d+)/i,
  /(?:episode\s*)(\d+)\s*[-–]\s*([\w\s:]+)/i,
  /([\w\s:]+?)\s*Episode\s*(\d+)/i,
  /episode\s*(\d+)/i,
];

const DATE_PATTERNS = [
  /(\d{4})-(\d{2})-(\d{2})/,
  /(\d{2})\/(\d{2})\/(\d{4})/,
  /(\d{2})\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})/i,
];

export function normalize(item: RawAnimeItem): NormalizedAnimeItem {
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

export function extractAnimeName(text: string): string {
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

export function extractEpisode(text: string): number | null {
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

export function extractDate(text: string): Date | null {
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

function classifyType(item: RawAnimeItem): NormalizedAnimeItem['type'] {
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
