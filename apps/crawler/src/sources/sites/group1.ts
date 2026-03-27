import { crawlSites, CrawledItem } from '../sites';

export async function crawlSites_Group1(): Promise<CrawledItem[]> {
  const sites = [
    'https://www.animenewsnetwork.com',
    'https://myanimelist.net/news',
    'https://animecorner.me',
    'https://www.crunchyroll.com/news',
    'https://animeuknews.net',
    'https://otakuusamagazine.com',
    'https://animehunch.com',
  ];
  
  return await crawlSites(sites);
}