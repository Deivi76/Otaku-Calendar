import { SOURCES_DATABASE } from '@otaku-calendar/core';

export interface SourceConfig {
  name: string;
  url: string;
  type: 'api' | 'rss' | 'site' | 'social';
  category: string;
  reliability: number;
}

function convertToSourceConfig(sources: any[], type: 'api' | 'rss' | 'site' | 'social', category: string): SourceConfig[] {
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
  const dbType = type === 'api' ? 'apis' : type;
  
  if (SOURCES_DATABASE[dbType as keyof typeof SOURCES_DATABASE]) {
    for (const [category, sourcesList] of Object.entries(SOURCES_DATABASE[dbType as keyof typeof SOURCES_DATABASE] as Record<string, any[]>)) {
      sources.push(...convertToSourceConfig(sourcesList, type, category));
    }
  }
  
  return sources;
}

export function getSourcesByType(type: 'api' | 'rss' | 'site' | 'social'): SourceConfig[] {
  return getAllSourcesByType(type);
}

export function getSourcesByTypeAndCategory(type: 'api' | 'rss' | 'site' | 'social', category: string): SourceConfig[] {
  const allSources = getAllSourcesByType(type);
  return allSources.filter(source => source.category === category);
}

export function getSourcesByReliability(minReliability: number): SourceConfig[] {
  const allSources: SourceConfig[] = [
    ...getAllSourcesByType('api'),
    ...getAllSourcesByType('rss'),
    ...getAllSourcesByType('site'),
    ...getAllSourcesByType('social'),
  ];
  return allSources.filter(source => source.reliability >= minReliability);
}
