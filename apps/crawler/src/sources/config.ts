export const SOURCES = {
  apis: {
    primary: [
      { name: 'AniList', url: 'https://graphql.anilist.co', type: 'graphql' as const },
      { name: 'Jikan', url: 'https://api.jikan.moe/v4', type: 'rest' as const },
      { name: 'Kitsu', url: 'https://kitsu.io/api/edge', type: 'rest' as const },
      { name: 'SIMKL', url: 'https://api.simkl.com', type: 'rest' as const },
      { name: 'TMDB', url: 'https://api.themoviedb.org', type: 'rest' as const },
      { name: 'TVMaze', url: 'https://api.tvmaze.com', type: 'rest' as const },
      { name: 'Trakt', url: 'https://api.trakt.tv', type: 'rest' as const },
      { name: 'MyAnimeList', url: 'https://api.myanimelist.net', type: 'rest' as const },
    ],
    anime: [
      { name: 'AniAPI', url: 'https://api.aniapi.com', type: 'rest' as const },
      { name: 'TraceMoe', url: 'https://api.trace.moe', type: 'rest' as const },
      { name: 'AnimeChan', url: 'https://api.animechan.xyz', type: 'rest' as const },
      { name: 'AnimeThemes', url: 'https://api.animethemes.moe', type: 'rest' as const },
      { name: 'LiveChart', url: 'https://api.livechart.me', type: 'rest' as const },
      { name: 'AniChart', url: 'https://api.anichart.net', type: 'rest' as const },
      { name: 'Waifu.im', url: 'https://api.waifu.im', type: 'rest' as const },
    ],
    manga: [
      { name: 'MangaDex', url: 'https://api.mangadex.org', type: 'rest' as const },
      { name: 'Comick', url: 'https://api.comick.fun', type: 'rest' as const },
      { name: 'MAL Scraper', url: 'https://api.mal-scraper.herokuapp.com', type: 'rest' as const },
      { name: 'OtakuMode', url: 'https://api.otakumode.com', type: 'rest' as const },
    ],
    streaming: [
      { name: 'Crunchyroll API', url: 'https://api.crunchyroll.com', type: 'rest' as const },
      { name: 'Netflix', url: 'https://api.netflix.com', type: 'rest' as const },
      { name: 'Disney+', url: 'https://api.disneyplus.com', type: 'rest' as const },
      { name: 'Hulu', url: 'https://api.hulu.com', type: 'rest' as const },
      { name: 'Prime Video', url: 'https://api.primevideo.com', type: 'rest' as const },
    ],
  },

  rss: {
    news: [
      { name: 'ANN', url: 'https://www.animenewsnetwork.com/all/rss.xml?ann-edition=us', category: 'news' },
      { name: 'MAL News', url: 'https://myanimelist.net/rss/news.xml', category: 'news' },
      { name: 'Anime Corner', url: 'https://animecorner.me/feed/', category: 'news' },
      { name: 'Crunchyroll', url: 'https://feeds.feedburner.com/crunchyroll', category: 'news' },
      { name: 'Anime UK News', url: 'https://animeuknews.net/feed', category: 'news' },
      { name: 'Honey\'s Anime', url: 'https://honeysanime.com/feed', category: 'news' },
      { name: 'Otaku News', url: 'https://otakunews.com/rss/rss.xml', category: 'news' },
      { name: 'Anime Trending', url: 'https://anitrendz.net/news/feed', category: 'news' },
      { name: 'Anime Daily', url: 'https://theanimedaily.com/feed', category: 'news' },
      { name: 'Anime Hunch', url: 'https://animehunch.com/feed', category: 'news' },
      { name: 'Random C', url: 'https://randomc.net/feed', category: 'news' },
      { name: 'Wrong Every Time', url: 'https://wrongeverytime.com/feed', category: 'reviews' },
      { name: '9TailedKitsune', url: 'https://9tailedkitsune.com/feed', category: 'news' },
      { name: 'All Ages of Geek', url: 'https://allagesofgeek.com/feed', category: 'news' },
      { name: 'Tenka', url: 'https://tenka.seiha.org/feed', category: 'reviews' },
    ] as { name: string; url: string; category: string }[],
    manga: [
      { name: 'Manga Bookshelf', url: 'https://mangabookshelf.com/feed', category: 'manga' },
    ] as { name: string; url: string; category: string }[],
    community: [] as { name: string; url: string; category: string }[],
  },

  sites: {
    news: [
      { name: 'Anime News Network', url: 'https://www.animenewsnetwork.com', category: 'news' },
      { name: 'MyAnimeList News', url: 'https://myanimelist.net/news', category: 'news' },
      { name: 'Anime Corner', url: 'https://animecorner.me', category: 'news' },
      { name: 'Otaku USA Magazine', url: 'https://otakuusamagazine.com', category: 'news' },
      { name: 'Crunchyroll News', url: 'https://www.crunchyroll.com/news', category: 'news' },
      { name: 'Anime Hunch', url: 'https://www.animehunch.com', category: 'news' },
      { name: 'Otaku News', url: 'https://www.otakunews.com', category: 'news' },
      { name: 'Anime Trending', url: 'https://anitrendz.net', category: 'news' },
      { name: 'AnimeNation', url: 'https://www.animenation.net/blog', category: 'news' },
      { name: 'Anime UK News', url: 'https://animeuknews.net', category: 'news' },
      { name: 'Honey\'s Anime', url: 'https://www.honeysanime.com', category: 'reviews' },
      { name: 'Anime Daily', url: 'https://www.animedaily.com', category: 'news' },
      { name: 'Random C', url: 'https://www.randomc.net', category: 'reviews' },
      { name: 'Wrong Every Time', url: 'https://wrongeverytime.com', category: 'reviews' },
      { name: 'AllTheAnime Blog', url: 'https://blog.alltheanime.com', category: 'news' },
      { name: 'Sakuga Blog', url: 'https://www.sakugablog.com', category: 'news' },
      { name: 'Anime News Biz', url: 'https://www.animenews.biz', category: 'news' },
      { name: 'Kaika', url: 'https://www.kaika.com', category: 'news' },
      { name: 'AnimeLab', url: 'https://www.animelab.com/news', category: 'news' },
      { name: 'Comic Book Resources', url: 'https://comicbook.com/anime', category: 'news' },
      { name: 'Screen Rant', url: 'https://screenrant.com/anime', category: 'news' },
      { name: 'Collider', url: 'https://collider.com/tag/anime', category: 'news' },
      { name: 'Deadline', url: 'https://deadline.com/tag/anime', category: 'news' },
      { name: 'Variety', url: 'https://variety.com/t/anime', category: 'news' },
      { name: 'Hollywood Reporter', url: 'https://hollywoodreporter.com/tag/anime', category: 'news' },
      { name: 'Kotaku', url: 'https://kotaku.com/tag/anime', category: 'news' },
      { name: 'IGN Japan', url: 'https://www.ign.com/japan', category: 'news' },
    ],
    liveAction: [
      { name: 'ANN Live-Action', url: 'https://www.animenewsnetwork.com/all/?topic=live-action', category: 'live-action' },
      { name: 'ANN Interest Live-Action', url: 'https://www.animenewsnetwork.com/interest/?topic=live-action', category: 'live-action' },
    ],
    manga: [
      { name: 'MangaUpdates', url: 'https://www.mangaupdates.com', category: 'manga' },
      { name: 'Anime-Planet', url: 'https://www.anime-planet.com', category: 'manga' },
      { name: 'Manga Bookshelf', url: 'https://www.mangabookshelf.com', category: 'manga' },
    ],
    film: [
      { name: 'IMDb', url: 'https://www.imdb.com', category: 'film' },
      { name: 'TMDB', url: 'https://www.themoviedb.org', category: 'film' },
      { name: 'Letterboxd', url: 'https://letterboxd.com', category: 'film' },
      { name: 'Rotten Tomatoes', url: 'https://www.rottentomatoes.com', category: 'film' },
    ],
  },

  social: {
    x: [
      'AniList',
      'myanimelist',
      'Anime',
      'Crunchyroll',
      'NetflixAnime',
      'AniTrendz',
      'animecorner_ac',
      'MangaMoguraRE',
      'WSJ_manga',
      'SugoiLITE',
    ],
    instagram: [
      'animecornernews',
      'crunchyroll',
      'netflixanime',
      'anitrendz',
      'otakumode',
      'manga_news_jp',
      'animeupdate',
      'animelover',
      'mangadaily',
      'weebcentral',
    ],
    youtube: [
      'Crunchyroll',
      'NetflixAnime',
      'AniplexUSA',
      'ToeiAnimation',
      'KadokawaAnime',
      'MuseAsia',
      'AniOneAsia',
      'VizMedia',
      'Kodansha',
      'MAPPA',
    ],
  },

  webtoon: {
    official: [
      { name: 'WEBTOON', url: 'https://www.webtoons.com', category: 'webtoon' },
      { name: 'Tapas', url: 'https://www.tapas.io', category: 'webtoon' },
      { name: 'Lezhin', url: 'https://www.lezhin.com', category: 'webtoon' },
      { name: 'Manta', url: 'https://www.manta.net', category: 'webtoon' },
      { name: 'Tappytoon', url: 'https://www.tappytoon.com', category: 'webtoon' },
      { name: 'Kakao Page', url: 'https://page.kakao.com', category: 'webtoon' },
      { name: 'Naver Webtoon', url: 'https://comic.naver.com', category: 'webtoon' },
    ],
    scans: [
      { name: 'Toonily', url: 'https://toonily.com', category: 'scan' },
      { name: 'Asura Scans', url: 'https://asurascans.com', category: 'scan' },
      { name: 'Manhwa Club', url: 'https://manhwa.club', category: 'scan' },
    ],
  },
};

export type SourceType = 'api' | 'rss' | 'site' | 'social';

export interface Source {
  name: string;
  url: string;
  category?: string;
  type: SourceType;
}

export function getAllSources(): Source[] {
  const sources: Source[] = [];

  for (const api of SOURCES.apis.primary) {
    sources.push({ ...api, type: 'api' });
  }
  for (const api of SOURCES.apis.anime) {
    sources.push({ ...api, type: 'api' });
  }
  for (const api of SOURCES.apis.manga) {
    sources.push({ ...api, type: 'api' });
  }
  for (const api of SOURCES.apis.streaming) {
    sources.push({ ...api, type: 'api' });
  }

  for (const feed of SOURCES.rss.news) {
    sources.push({ ...feed, type: 'rss' });
  }
  for (const feed of SOURCES.rss.manga) {
    sources.push({ ...feed, type: 'rss' });
  }
  for (const feed of SOURCES.rss.community) {
    sources.push({ ...feed, type: 'rss' });
  }

  for (const site of SOURCES.sites.news) {
    sources.push({ ...site, type: 'site' });
  }
  for (const site of SOURCES.sites.liveAction) {
    sources.push({ ...site, type: 'site' });
  }
  for (const site of SOURCES.sites.manga) {
    sources.push({ ...site, type: 'site' });
  }
  for (const site of SOURCES.sites.film) {
    sources.push({ ...site, type: 'site' });
  }

  return sources;
}

export function getEnvConfig() {
  return {
    apis: [
      'https://graphql.anilist.co',
      'https://api.jikan.moe/v4',
      'https://kitsu.io/api/edge',
      'https://api.simkl.com',
      'https://api.themoviedb.org',
      'https://api.tvmaze.com',
      'https://api.trakt.tv',
      'https://api.myanimelist.net',
      'https://api.aniapi.com',
      'https://api.trace.moe',
      'https://api.animechan.xyz',
      'https://api.animethemes.moe',
      'https://api.mangadex.org',
      'https://api.comick.fun',
      'https://api.myanimelist.net/v2',
      'https://api.livechart.me',
      'https://api.anichart.net',
      'https://api.waifu.im',
    ].join(','),
    
    sites: [
      'https://www.animenewsnetwork.com',
      'https://myanimelist.net/news',
      'https://animecorner.me',
      'https://otakuusamagazine.com',
      'https://www.crunchyroll.com/news',
      'https://www.animehunch.com',
      'https://www.otakunews.com',
      'https://anitrendz.net',
      'https://www.animenation.net/blog',
      'https://animeuknews.net',
      'https://www.honeysanime.com',
      'https://www.animedaily.com',
      'https://www.randomc.net',
      'https://wrongeverytime.com',
      'https://blog.alltheanime.com',
      'https://www.sakugablog.com',
      'https://comicbook.com/anime',
      'https://screenrant.com/anime',
      'https://collider.com/tag/anime',
      'https://deadline.com/tag/anime',
      'https://variety.com/t/anime',
      'https://hollywoodreporter.com/tag/anime',
      'https://kotaku.com/tag/anime',
      'https://ign.com/anime',
      'https://www.imdb.com',
    ].join(','),

    rss: [
      'https://www.animenewsnetwork.com/all/rss.xml?ann-edition=us',
      'https://myanimelist.net/rss/news.xml',
      'https://animecorner.me/feed/',
      'https://feeds.feedburner.com/crunchyroll',
      'https://animeuknews.net/feed',
      'https://honeysanime.com/feed',
      'https://otakunews.com/rss/rss.xml',
      'https://anitrendz.net/news/feed',
      'https://theanimedaily.com/feed',
      'https://animehunch.com/feed',
      'https://randomc.net/feed',
      'https://wrongeverytime.com/feed',
      'https://9tailedkitsune.com/feed',
      'https://allagesofgeek.com/feed',
      'https://tenka.seiha.org/feed',
      'https://mangabookshelf.com/feed',
    ].join(','),
  };
}
