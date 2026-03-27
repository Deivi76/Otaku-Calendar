import { crawlSites, CrawledItem } from '../sites';
import { getSourcesByTypeAndCategory } from '../manager';

export async function crawlSites_Group2(): Promise<CrawledItem[]> {
  const manhwaSources = getSourcesByTypeAndCategory('site', 'manhwa');
  const streamingSources = getSourcesByTypeAndCategory('site', 'streaming');
  const filmSources = getSourcesByTypeAndCategory('site', 'film');
  const liveActionSources = getSourcesByTypeAndCategory('site', 'liveAction');
  const mangaSources = getSourcesByTypeAndCategory('site', 'manga');
  const communitySources = getSourcesByTypeAndCategory('site', 'community');

  const allSources = [
    ...manhwaSources,
    ...streamingSources,
    ...filmSources,
    ...liveActionSources,
    ...mangaSources,
    ...communitySources,
  ];

  const filteredSources = allSources
    .filter(source => source.reliability >= 0.6)
    .sort((a, b) => b.reliability - a.reliability)
    .slice(0, 50);

  const urls = filteredSources.map(source => source.url).filter(Boolean);

  if (urls.length === 0) {
    return [];
  }

  return await crawlSites(urls);
}
