import { SOURCES_DATABASE } from '@otaku-calendar/core';
import type { Source } from '@otaku-calendar/core';

export interface SourceConfig {
  name: string;
  url: string;
  type: 'api' | 'rss' | 'site' | 'social';
  category: string;
  reliability: number;
}

function convertToSourceConfig(sources: Source[], type: 'api' | 'rss' | 'site' | 'social', category: string): SourceConfig[] {
  return sources.map((source) => ({
    name: source.name,
    url: source.url || '',
    type,
    category,
    reliability: source.reliability,
  }));
}

function getAllSourcesByType(type: 'api' | 'rss' | 'site' | 'social'): SourceConfig[] {
  const sources: SourceConfig[] = [];
  
  if (type === 'api') {
    for (const [category, sourcesList] of Object.entries(SOURCES_DATABASE.apis)) {
      sources.push(...convertToSourceConfig(sourcesList as unknown as Source[], 'api', category));
    }
  } else if (type === 'rss') {
    for (const [category, sourcesList] of Object.entries(SOURCES_DATABASE.rss)) {
      sources.push(...convertToSourceConfig(sourcesList as unknown as Source[], 'rss', category));
    }
  } else if (type === 'site') {
    for (const [category, sourcesList] of Object.entries(SOURCES_DATABASE.sites)) {
      sources.push(...convertToSourceConfig(sourcesList as unknown as Source[], 'site', category));
    }
  } else if (type === 'social') {
    for (const [category, sourcesList] of Object.entries(SOURCES_DATABASE.social)) {
      sources.push(...convertToSourceConfig(sourcesList as unknown as Source[], 'social', category));
    }
  }
  
  return sources;
}

export function getSourcesByType(type: 'api' | 'rss' | 'site' | 'social'): SourceConfig[] {
  return getAllSourcesByType(type);
}

export function getSourcesByTypeAndCategory(
  type: 'api' | 'rss' | 'site' | 'social',
  category: string
): SourceConfig[] {
  if (type === 'api' && category in SOURCES_DATABASE.apis) {
    return convertToSourceConfig(SOURCES_DATABASE.apis[category as keyof typeof SOURCES_DATABASE.apis] as unknown as Source[], 'api', category);
  }
  if (type === 'rss' && category in SOURCES_DATABASE.rss) {
    return convertToSourceConfig(SOURCES_DATABASE.rss[category as keyof typeof SOURCES_DATABASE.rss] as unknown as Source[], 'rss', category);
  }
  if (type === 'site' && category in SOURCES_DATABASE.sites) {
    return convertToSourceConfig(SOURCES_DATABASE.sites[category as keyof typeof SOURCES_DATABASE.sites] as unknown as Source[], 'site', category);
  }
  if (type === 'social' && category in SOURCES_DATABASE.social) {
    return convertToSourceConfig(SOURCES_DATABASE.social[category as keyof typeof SOURCES_DATABASE.social] as unknown as Source[], 'social', category);
  }
  return [];
}

export function getRSSSources(): SourceConfig[] {
  return getAllSourcesByType('rss');
}

export function getSourcesByReliability(minReliability: number): SourceConfig[] {
  const allSources: SourceConfig[] = [
    ...getAllSourcesByType('api'),
    ...getAllSourcesByType('rss'),
    ...getAllSourcesByType('site'),
    ...getAllSourcesByType('social'),
  ];
  return allSources.filter((source) => source.reliability >= minReliability);
}

export function getSourcesByCategory(category: 'anime' | 'manga' | 'manhwa' | 'film' | 'series' | 'liveAction'): SourceConfig[] {
  const sources: SourceConfig[] = [];
  
  if (category in SOURCES_DATABASE.apis) {
    sources.push(...convertToSourceConfig(SOURCES_DATABASE.apis[category as keyof typeof SOURCES_DATABASE.apis] as unknown as Source[], 'api', category));
  }
  if (category in SOURCES_DATABASE.rss) {
    sources.push(...convertToSourceConfig(SOURCES_DATABASE.rss[category as keyof typeof SOURCES_DATABASE.rss] as unknown as Source[], 'rss', category));
  }
  if (category in SOURCES_DATABASE.sites) {
    sources.push(...convertToSourceConfig(SOURCES_DATABASE.sites[category as keyof typeof SOURCES_DATABASE.sites] as unknown as Source[], 'site', category));
  }
  if (category in SOURCES_DATABASE.social) {
    sources.push(...convertToSourceConfig(SOURCES_DATABASE.social[category as keyof typeof SOURCES_DATABASE.social] as unknown as Source[], 'social', category));
  }
  
  return sources;
}

export interface CrawlerSourceConfig {
  apis: SourceConfig[];
  rss: SourceConfig[];
  sites: SourceConfig[];
  social: SourceConfig[];
}

export function getAnimeSources(): CrawlerSourceConfig {
  return {
    apis: getSourcesByTypeAndCategory('api', 'anime'),
    rss: getSourcesByTypeAndCategory('rss', 'anime'),
    sites: getSourcesByTypeAndCategory('site', 'anime'),
    social: getSourcesByTypeAndCategory('social', 'anime'),
  };
}

export function getMangaSources(): CrawlerSourceConfig {
  return {
    apis: getSourcesByTypeAndCategory('api', 'manga'),
    rss: getSourcesByTypeAndCategory('rss', 'manga'),
    sites: getSourcesByTypeAndCategory('site', 'manga'),
    social: getSourcesByTypeAndCategory('social', 'manga'),
  };
}

export function getManhwaSources(): CrawlerSourceConfig {
  return {
    apis: getSourcesByTypeAndCategory('api', 'manhwa'),
    rss: getSourcesByTypeAndCategory('rss', 'manhwa'),
    sites: getSourcesByTypeAndCategory('site', 'manhwa'),
    social: getSourcesByTypeAndCategory('social', 'manhwa'),
  };
}

export function getFilmSources(): CrawlerSourceConfig {
  return {
    apis: getSourcesByTypeAndCategory('api', 'film'),
    rss: getSourcesByTypeAndCategory('rss', 'film'),
    sites: getSourcesByTypeAndCategory('site', 'film'),
    social: getSourcesByTypeAndCategory('social', 'film'),
  };
}

export function getSeriesSources(): CrawlerSourceConfig {
  return {
    apis: getSourcesByTypeAndCategory('api', 'series'),
    rss: getSourcesByTypeAndCategory('rss', 'series'),
    sites: getSourcesByTypeAndCategory('site', 'series'),
    social: getSourcesByTypeAndCategory('social', 'series'),
  };
}

export function getLiveActionSources(): CrawlerSourceConfig {
  return {
    apis: getSourcesByTypeAndCategory('api', 'liveAction'),
    rss: getSourcesByTypeAndCategory('rss', 'liveAction'),
    sites: getSourcesByTypeAndCategory('site', 'liveAction'),
    social: getSourcesByTypeAndCategory('social', 'liveAction'),
  };
}

export function getChineseSources(): CrawlerSourceConfig {
  return {
    apis: getSourcesByTypeAndCategory('api', 'chinese'),
    rss: getSourcesByTypeAndCategory('rss', 'chinese'),
    sites: getSourcesByTypeAndCategory('site', 'chinese'),
    social: getSourcesByTypeAndCategory('social', 'chinese'),
  };
}

export function getJapaneseSources(): CrawlerSourceConfig {
  return {
    apis: getSourcesByTypeAndCategory('api', 'japanese'),
    rss: getSourcesByTypeAndCategory('rss', 'japanese'),
    sites: getSourcesByTypeAndCategory('site', 'japanese'),
    social: getSourcesByTypeAndCategory('social', 'japanese'),
  };
}

export function getRumorsSources(): CrawlerSourceConfig {
  return {
    apis: [],
    rss: getSourcesByTypeAndCategory('rss', 'rumors'),
    sites: getSourcesByTypeAndCategory('site', 'rumors'),
    social: getSourcesByTypeAndCategory('social', 'rumors'),
  };
}
