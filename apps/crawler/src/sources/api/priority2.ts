import { fetchTrendingAnime, fetchUpcomingAnime } from '../anilist';
import { fetchTopAnime, fetchSeasonNow } from '../jikan';
import { fetchSeasonAnime, fetchManga } from '../kitsu';
import type { CrawledItem } from '../../utils/queue';

export async function crawlAPI_Priority2(): Promise<CrawledItem[]> {
  const now = new Date();
  const year = now.getFullYear();
  const season = ['winter', 'spring', 'summer', 'fall'][Math.floor(now.getMonth() / 3)];

  const [anilistData, jikanData, kitsuData] = await Promise.all([
    Promise.all([
      fetchTrendingAnime(),
      fetchUpcomingAnime(),
    ]),
    Promise.all([
      fetchTopAnime(),
      fetchSeasonNow(),
    ]),
    Promise.all([
      fetchSeasonAnime(year, season),
      fetchManga(),
    ]),
  ]);

  return [
    ...anilistData.flat(),
    ...jikanData.flat(),
    ...kitsuData.flat(),
  ];
}
