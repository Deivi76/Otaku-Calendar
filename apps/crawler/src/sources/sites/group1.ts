import { crawlSites, CrawledItem } from '../sites';
import { getSourcesByTypeAndCategory } from '../manager';

export async function crawlSites_Group1(): Promise<CrawledItem[]> {
  const newsSources = getSourcesByTypeAndCategory('site', 'news');
  const databasesSources = getSourcesByTypeAndCategory('site', 'databases');

  const allSources = [...newsSources, ...databasesSources];

  const filteredSources = allSources
    .filter(source => source.reliability >= 0.7)
    .sort((a, b) => b.reliability - a.reliability)
    .slice(0, 50);

  const urls = filteredSources.map(source => source.url).filter(Boolean);

  if (urls.length === 0) {
    return [];
  }

  return await crawlSites(urls);
}