import { SOURCES_DATABASE } from '@otaku-calendar/core';
import type { Source, ApiSource, RssSource, SiteSource, SocialSource } from '@otaku-calendar/core';

export interface SourceConfig {
  name: string;
  url: string;
  type: 'api' | 'rss' | 'site' | 'social';
  category: string;
  reliability: number;
}

function convertToSourceConfig(sources: Source[], type: 'api' | 'rss' | 'site' | 'social', category: string): SourceConfig[] {
  return sources.map((source) => {
    let url = '';
    if ('url' in source && source.url) {
      url = source.url;
    } else if ('handle' in source && source.handle) {
      url = `https://twitter.com/${source.handle}`;
    } else if ('invite' in source && source.invite) {
      url = `https://discord.gg/${source.invite}`;
    }
    return {
      name: source.name,
      url,
      type,
      category,
      reliability: source.reliability,
    };
  });
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

export function getSourcesByTypeAndGroup(
  type: 'api' | 'rss' | 'site' | 'social',
  group: string
): SourceConfig[] {
  if (type === 'api' && group in SOURCES_DATABASE.apis) {
    return convertToSourceConfig(SOURCES_DATABASE.apis[group as keyof typeof SOURCES_DATABASE.apis] as unknown as Source[], 'api', group);
  }
  if (type === 'rss' && group in SOURCES_DATABASE.rss) {
    return convertToSourceConfig(SOURCES_DATABASE.rss[group as keyof typeof SOURCES_DATABASE.rss] as unknown as Source[], 'rss', group);
  }
  if (type === 'site' && group in SOURCES_DATABASE.sites) {
    return convertToSourceConfig(SOURCES_DATABASE.sites[group as keyof typeof SOURCES_DATABASE.sites] as unknown as Source[], 'site', group);
  }
  if (type === 'social' && group in SOURCES_DATABASE.social) {
    return convertToSourceConfig(SOURCES_DATABASE.social[group as keyof typeof SOURCES_DATABASE.social] as unknown as Source[], 'social', group);
  }
  return [];
}

export function getSourcesByTypeAndCategory(
  type: 'api' | 'rss' | 'site' | 'social',
  category: string
): SourceConfig[] {
  return getSourcesByTypeAndGroup(type, category);
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

export interface CrawlerSourceConfig {
  apis: SourceConfig[];
  rss: SourceConfig[];
  sites: SourceConfig[];
  social: SourceConfig[];
}

export function getHighPrioritySources(): CrawlerSourceConfig {
  return {
    apis: getSourcesByTypeAndGroup('api', 'priority1'),
    rss: getSourcesByTypeAndGroup('rss', 'group1'),
    sites: getSourcesByTypeAndGroup('site', 'group1'),
    social: getSourcesByTypeAndGroup('social', 'group1'),
  };
}

export function getMediumPrioritySources(): CrawlerSourceConfig {
  return {
    apis: getSourcesByTypeAndGroup('api', 'priority2'),
    rss: getSourcesByTypeAndGroup('rss', 'group2'),
    sites: getSourcesByTypeAndGroup('site', 'group2'),
    social: getSourcesByTypeAndGroup('social', 'group2'),
  };
}

export function getAllAPISources(): SourceConfig[] {
  return getSourcesByType('api');
}

export function getAllRSSSources(): SourceConfig[] {
  return getSourcesByType('rss');
}

export function getAllSiteSources(): SourceConfig[] {
  return getSourcesByType('site');
}

export function getAllSocialSources(): SourceConfig[] {
  return getSourcesByType('social');
}

export function getSourcesByMinimumReliability(type: 'api' | 'rss' | 'site' | 'social', minReliability: number): SourceConfig[] {
  const sources = getSourcesByType(type);
  return sources.filter(source => source.reliability >= minReliability);
}

export function getAPISourcesByPriority(priority: 'priority1' | 'priority2' | 'priority3'): SourceConfig[] {
  return getSourcesByTypeAndGroup('api', priority);
}

export function getSourcesByGroup(
  type: 'rss' | 'site' | 'social',
  group: 'group1' | 'group2'
): SourceConfig[] {
  return getSourcesByTypeAndGroup(type, group);
}
