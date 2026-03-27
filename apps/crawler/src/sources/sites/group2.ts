import { crawlSites, CrawledItem } from '../sites';
import { getSourcesByTypeAndGroup } from '../manager';

export async function crawlSites_Group2(): Promise<CrawledItem[]> {
  const allSources = getSourcesByTypeAndGroup('site', 'group2');

  const filteredSources = allSources
    .sort((a, b) => b.reliability - a.reliability)
    .slice(0, 50);

  const urls = filteredSources.map(source => source.url).filter(Boolean);

  if (urls.length === 0) {
    return [];
  }

  return await crawlSites(urls);
}
