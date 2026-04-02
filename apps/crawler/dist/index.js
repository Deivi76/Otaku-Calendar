"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  CRAWLER_CONFIG: () => CRAWLER_CONFIG,
  runCrawler: () => runCrawler
});
module.exports = __toCommonJS(index_exports);
var import_config = require("dotenv/config");

// src/utils/rateLimiter.ts
var RateLimiter = class {
  buckets = /* @__PURE__ */ new Map();
  queues = /* @__PURE__ */ new Map();
  configs;
  processing = /* @__PURE__ */ new Map();
  constructor(configs) {
    this.configs = configs;
    this.initializeBuckets();
  }
  initializeBuckets() {
    for (const source of Object.keys(this.configs)) {
      this.buckets.set(source, {
        tokens: this.configs[source].maxRequests,
        lastRefill: Date.now()
      });
      this.queues.set(source, []);
    }
  }
  async refillBucket(source) {
    const config = this.configs[source];
    if (!config) return;
    const bucket = this.buckets.get(source);
    if (!bucket) return;
    const now = Date.now();
    const timePassed = now - bucket.lastRefill;
    const refills = Math.floor(timePassed / config.windowMs);
    if (refills > 0) {
      bucket.tokens = Math.min(
        config.maxRequests,
        bucket.tokens + refills * config.maxRequests
      );
      bucket.lastRefill = now;
    }
  }
  async waitForToken(source) {
    const config = this.configs[source];
    const bucket = this.buckets.get(source);
    if (!config || !bucket) return;
    await this.refillBucket(source);
    if (bucket.tokens < 1) {
      const waitTime = config.windowMs - (Date.now() - bucket.lastRefill);
      await this.sleep(Math.max(waitTime, 0));
      await this.refillBucket(source);
    }
  }
  consumeToken(source) {
    const bucket = this.buckets.get(source);
    if (bucket) {
      bucket.tokens -= 1;
    }
  }
  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  async throttle(source, fn) {
    const config = this.configs[source];
    if (!config) {
      return fn();
    }
    if (!this.buckets.has(source)) {
      this.buckets.set(source, {
        tokens: config.maxRequests,
        lastRefill: Date.now()
      });
      this.queues.set(source, []);
    }
    return new Promise((resolve, reject) => {
      const queue = this.queues.get(source);
      queue.push({ fn, resolve, reject });
      this.processQueue(source);
    });
  }
  async processQueue(source) {
    if (this.processing.get(source)) return;
    const queue = this.queues.get(source);
    if (!queue || queue.length === 0) return;
    this.processing.set(source, true);
    while (queue.length > 0) {
      await this.waitForToken(source);
      const request = queue[0];
      const MAX_RETRIES = 1;
      const BASE_DELAY = 1e3;
      const MAX_DELAY = 6e4;
      const JITTER = 1e3;
      let retries = 0;
      while (retries < MAX_RETRIES) {
        try {
          this.consumeToken(source);
          const result = await request.fn();
          request.resolve(result);
          queue.shift();
          break;
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          const isRetryable = err.message.includes("429") || err.message.match(/5\d{2}/);
          if (isRetryable && retries < MAX_RETRIES - 1) {
            const delay = Math.min(
              BASE_DELAY * Math.pow(2, retries) + Math.random() * JITTER,
              MAX_DELAY
            );
            console.log(`[RateLimiter] ${source}: Retry ${retries + 1}/${MAX_RETRIES} after ${Math.round(delay)}ms`);
            await this.sleep(delay);
            retries++;
            continue;
          }
          request.reject(err);
          queue.shift();
          break;
        }
      }
    }
    this.processing.set(source, false);
  }
  getWaitTime(source) {
    const config = this.configs[source];
    const bucket = this.buckets.get(source);
    if (!config || !bucket) return 0;
    if (bucket.tokens >= 1) return 0;
    return config.windowMs - (Date.now() - bucket.lastRefill);
  }
  reset(source) {
    const config = this.configs[source];
    if (config) {
      this.buckets.set(source, {
        tokens: config.maxRequests,
        lastRefill: Date.now()
      });
    }
    this.queues.set(source, []);
  }
};
var DEFAULT_CONFIGS = {
  anilist: {
    maxRequests: 30,
    windowMs: 6e4,
    retryAfter: 6e4
  },
  jikan: {
    maxRequests: 3,
    windowMs: 1e3,
    retryAfter: 1500
  },
  kitsu: {
    maxRequests: 50,
    windowMs: 6e4,
    retryAfter: 6e4
  },
  tmdb: {
    maxRequests: 30,
    windowMs: 1e3,
    retryAfter: 1500
  },
  mangadex: {
    maxRequests: 5,
    windowMs: 1e3,
    retryAfter: 2e3
  }
};
var rateLimiter = new RateLimiter(DEFAULT_CONFIGS);

// src/sources/anilist.ts
var ANILIST_API = process.env.ANILIST_API || "https://graphql.anilist.co";
var DEFAULT_HEADERS = {
  "User-Agent": "Otaku-Calendar/1.0 (https://github.com/anomalyco/Otaku-Calendar)",
  "Accept": "application/json"
};
var TIMEOUT_MS = 1e4;
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...DEFAULT_HEADERS,
        ...options.headers
      }
    });
    if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After");
      if (retryAfter) {
        console.log(`[AniList] Rate limited, Retry-After: ${retryAfter}s`);
      }
    }
    return res;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
var ANIME_QUERY = `
  query {
    releasing: Page(perPage: 50) {
      media(type: ANIME, status: RELEASING) {
        id
        title {
          romaji
          english
          native
        }
        nextAiringEpisode {
          episode
          airingAt
        }
        siteUrl
      }
    }
    upcoming: Page(perPage: 50) {
      media(type: ANIME, status: NOT_YET_RELEASED) {
        id
        title {
          romaji
          english
          native
        }
        startDate {
          year
          month
          day
        }
        siteUrl
      }
    }
  }
`;
async function fetchAniListData(query) {
  const res = await fetchWithTimeout(ANILIST_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query })
  });
  if (!res.ok) {
    throw new Error(`AniList API error: ${res.status}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error(`AniList GraphQL error: ${json.errors[0].message}`);
  }
  return json.data;
}
function transformReleasing(media) {
  return {
    title: media.title.romaji || media.title.english || media.title.native,
    content: media.nextAiringEpisode ? `Episode ${media.nextAiringEpisode.episode} airing soon` : "Currently releasing",
    source: ANILIST_API,
    sourceType: "api",
    url: media.siteUrl,
    publishedAt: media.nextAiringEpisode?.airingAt ? new Date(media.nextAiringEpisode.airingAt * 1e3).toISOString() : void 0
  };
}
function transformUpcoming(media) {
  return {
    title: media.title.romaji || media.title.english || media.title.native,
    content: "Upcoming anime",
    source: ANILIST_API,
    sourceType: "api",
    url: media.siteUrl,
    publishedAt: media.startDate ? new Date(media.startDate.year, media.startDate.month - 1, media.startDate.day).toISOString() : void 0
  };
}
async function crawlAniList() {
  try {
    const data = await rateLimiter.throttle("anilist", () => fetchAniListData(ANIME_QUERY));
    const trending = data.releasing.Page.media.map(transformReleasing);
    const upcoming = data.upcoming.Page.media.map(transformUpcoming);
    return [...trending, ...upcoming];
  } catch (error) {
    console.error("Error fetching anime from AniList:", error);
    return [];
  }
}

// src/sources/jikan.ts
var JIKAN_API = process.env.JIKAN_API || "https://api.jikan.moe/v4";
var DEFAULT_HEADERS2 = {
  "User-Agent": "Otaku-Calendar/1.0 (https://github.com/anomalyco/Otaku-Calendar)",
  "Accept": "application/json"
};
var TIMEOUT_MS2 = 1e4;
async function fetchWithTimeout2(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS2);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...DEFAULT_HEADERS2,
        ...options.headers
      }
    });
    if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After");
      if (retryAfter) {
        console.log(`[Jikan] Rate limited, Retry-After: ${retryAfter}s`);
      }
    }
    return res;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${TIMEOUT_MS2}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
async function fetchSchedule() {
  try {
    const res = await fetchWithTimeout2(`${JIKAN_API}/schedules`);
    if (!res.ok) {
      throw new Error(`Jikan API error: ${res.status}`);
    }
    const data = await res.json();
    return data.data?.map((anime) => ({
      title: anime.title || anime.title_japanese,
      content: `Episode ${anime.episodes?.[0]?.episode || "TBA"}`,
      source: JIKAN_API,
      sourceType: "api",
      url: anime.url,
      publishedAt: anime.episodes?.[0]?.aired
    })) || [];
  } catch (error) {
    console.error("Error fetching schedule from Jikan:", error);
    return [];
  }
}
async function fetchTopAnime() {
  try {
    const res = await fetchWithTimeout2(`${JIKAN_API}/top/anime?limit=25`);
    if (!res.ok) {
      throw new Error(`Jikan API error: ${res.status}`);
    }
    const data = await res.json();
    return data.data?.map((anime) => ({
      title: anime.title || anime.title_japanese,
      content: `Score: ${anime.score || "N/A"}`,
      source: JIKAN_API,
      sourceType: "api",
      url: anime.url,
      publishedAt: anime.aired?.from
    })) || [];
  } catch (error) {
    console.error("Error fetching top anime from Jikan:", error);
    return [];
  }
}
async function fetchSeasonNow() {
  try {
    const res = await fetchWithTimeout2(`${JIKAN_API}/seasons/now?limit=50`);
    if (!res.ok) {
      throw new Error(`Jikan API error: ${res.status}`);
    }
    const data = await res.json();
    return data.data?.map((anime) => ({
      title: anime.title || anime.title_japanese,
      content: anime.synopsis?.substring(0, 200) || "Currently airing",
      source: JIKAN_API,
      sourceType: "api",
      url: anime.url,
      publishedAt: anime.aired?.from
    })) || [];
  } catch (error) {
    console.error("Error fetching season from Jikan:", error);
    return [];
  }
}
async function crawlJikan() {
  const [schedule, top, season] = await Promise.all([
    rateLimiter.throttle("jikan", () => fetchSchedule()),
    rateLimiter.throttle("jikan", () => fetchTopAnime()),
    rateLimiter.throttle("jikan", () => fetchSeasonNow())
  ]);
  return [...schedule, ...top, ...season];
}

// src/sources/kitsu.ts
var KITSU_API = process.env.KITSU_API || "https://kitsu.io/api/edge";
var RATE_LIMIT_DELAY = 250;
var DEFAULT_HEADERS3 = {
  "User-Agent": "Otaku-Calendar/1.0 (https://github.com/anomalyco/Otaku-Calendar)",
  "Accept": "application/vnd.api+json"
};
var TIMEOUT_MS3 = 1e4;
async function fetchWithTimeout3(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS3);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...DEFAULT_HEADERS3,
        ...options.headers
      }
    });
    if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After");
      if (retryAfter) {
        console.log(`[Kitsu] Rate limited, Retry-After: ${retryAfter}s`);
      }
    }
    return res;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${TIMEOUT_MS3}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
async function rateLimitedFetch(url) {
  await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
  const res = await fetchWithTimeout3(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Kitsu API error: ${res.status} - ${text.substring(0, 100)}`);
  }
  return res.json();
}
async function fetchSeasonAnime(year, season) {
  try {
    const res = await rateLimitedFetch(
      `${KITSU_API}/anime?filter[seasonYear]=${year}&filter[season]=${season}&sort=-userCount&page[limit]=20`
    );
    return res.data?.map((anime) => ({
      title: anime.attributes.titles.en_jp || anime.attributes.titles.en || anime.attributes.canonicalTitle,
      content: anime.attributes.synopsis?.substring(0, 200) || "Currently airing",
      source: KITSU_API,
      sourceType: "api",
      url: anime.attributes.url,
      publishedAt: anime.attributes.startDate
    })) || [];
  } catch (error) {
    console.error("Error fetching season from Kitsu:", error);
    return [];
  }
}
async function fetchTrendingAnime() {
  try {
    const res = await rateLimitedFetch(
      `${KITSU_API}/anime?sort=-userCount&page[limit]=20`
    );
    return res.data?.map((anime) => ({
      title: anime.attributes.titles.en_jp || anime.attributes.titles.en || anime.attributes.canonicalTitle,
      content: `Rating: ${anime.attributes.averageRating || "N/A"}`,
      source: KITSU_API,
      sourceType: "api",
      url: anime.attributes.url,
      publishedAt: anime.attributes.startDate
    })) || [];
  } catch (error) {
    console.error("Error fetching trending from Kitsu:", error);
    return [];
  }
}
async function fetchManga() {
  try {
    const res = await rateLimitedFetch(
      `${KITSU_API}/manga?sort=-userCount&page[limit]=20`
    );
    return res.data?.map((manga) => ({
      title: manga.attributes.titles.en_jp || manga.attributes.titles.en || manga.attributes.canonicalTitle,
      content: manga.attributes.synopsis?.substring(0, 200) || "Manga",
      source: KITSU_API,
      sourceType: "api",
      url: manga.attributes.url,
      publishedAt: manga.attributes.startDate
    })) || [];
  } catch (error) {
    console.error("Error fetching manga from Kitsu:", error);
    return [];
  }
}
async function crawlKitsu() {
  const now = /* @__PURE__ */ new Date();
  const year = now.getFullYear();
  const season = ["winter", "spring", "summer", "fall"][Math.floor(now.getMonth() / 3)];
  const [seasonAnime, trending, manga] = await Promise.all([
    rateLimiter.throttle("kitsu", () => fetchSeasonAnime(year, season)),
    rateLimiter.throttle("kitsu", () => fetchTrendingAnime()),
    rateLimiter.throttle("kitsu", () => fetchManga())
  ]);
  return [...seasonAnime, ...trending, ...manga];
}

// src/sources/api/priority1.ts
async function crawlAPI_Priority1() {
  const results = [];
  const anilistData = await crawlAniList();
  results.push(...anilistData);
  const jikanData = await crawlJikan();
  results.push(...jikanData);
  const kitsuData = await crawlKitsu();
  results.push(...kitsuData);
  return results;
}

// src/sources/api/priority2.ts
async function crawlAPI_Priority2() {
  const now = /* @__PURE__ */ new Date();
  const year = now.getFullYear();
  const season = ["winter", "spring", "summer", "fall"][Math.floor(now.getMonth() / 3)];
  const [anilistData, jikanData, kitsuData] = await Promise.all([
    crawlAniList(),
    Promise.all([
      fetchTopAnime(),
      fetchSeasonNow()
    ]),
    Promise.all([
      fetchSeasonAnime(year, season),
      fetchManga()
    ])
  ]);
  return [
    ...anilistData,
    ...jikanData.flat(),
    ...kitsuData.flat()
  ];
}

// ../../packages/core/src/sources-database.ts
var SOURCES_DATABASE = {
  apis: {
    priority1: [
      { name: "NHK Program API", url: "https://api.nhk.or.jp/nodata", reliability: 0.9 },
      { name: "Media Arts DB", url: "https://mediaarts-db.bunka.go.jp", reliability: 0.9 },
      { name: "Crunchyroll API", url: "https://api.crunchyroll.com", reliability: 0.9 },
      { name: "Netflix", url: "https://netflix.com", reliability: 0.9 },
      { name: "Disney+", url: "https://disneyplus.com", reliability: 0.9 },
      { name: "Hulu", url: "https://hulu.com", reliability: 0.9 },
      { name: "Prime Video", url: "https://primevideo.com", reliability: 0.9 },
      { name: "IMDb API", url: "https://www.imdb.com/interfaces", reliability: 0.9 },
      { name: "MyAnimeList", url: "https://myanimelist.net/apibest", reliability: 0.85 },
      { name: "AniList", url: "https://alistapi.gg", reliability: 0.85 },
      { name: "Jikan (MyAnimeList API)", url: "https://api.jikan.moe/v4", reliability: 0.85 },
      { name: "Kitsu", url: "https://kitsu.io/api/edge", reliability: 0.85 },
      { name: "The Movie Database (TMDB)", url: "https://api.themoviedb.org/3", reliability: 0.85 },
      { name: "AniDB", url: "https://api.anidb.net:9001", reliability: 0.85 },
      { name: "Anime News Network API", url: "https://www.animenewsnetwork.com/encyclopedia/reports.xml", reliability: 0.85 },
      { name: "AniList API v2", url: "https://anilist.co/api/v2", reliability: 0.85 },
      { name: "Kitsu JSON:API", url: "https://kitsu.io/api/edge", reliability: 0.85 },
      { name: "MangaDex", url: "https://api.mangadex.org", reliability: 0.85 },
      { name: "Manga Plus", url: "https://mangaplus.shueisha.co.jp/api", reliability: 0.85 },
      { name: "Naver Webtoon API", url: "https://webtoon.naver.com/api", reliability: 0.85 },
      { name: "Kakao Page API", url: "https://page.kakao.com/api", reliability: 0.85 },
      { name: "WEBTOON API", url: "https://www.webtoons.com/api", reliability: 0.85 },
      { name: "HIDIVE", url: "https://hidive.com/api", reliability: 0.85 },
      { name: "Rotten Tomatoes", url: "https://www.rottentomatoes.com/api", reliability: 0.85 },
      { name: "Box Office Mojo", url: "https://boxofficemojo.com/api", reliability: 0.85 },
      { name: "Studio Ghibli API", url: "https://ghibliapi.herokuapp.com", reliability: 0.85 },
      { name: "Studio Ghibli", url: "https://www.ghibli.jp", reliability: 0.85 },
      { name: "Shueisha API", url: "https://shueisha.co.jp/api", reliability: 0.85 },
      { name: "Kodansha API", url: "https://kodansha.co.jp/api", reliability: 0.85 },
      { name: "Shogakukan API", url: "https://shogakukan.co.jp/api", reliability: 0.85 },
      { name: "Shueisha Shonen Jump", url: "https://jump.shueisha.co.jp/api", reliability: 0.85 },
      { name: "Weekly Shonen Jump API", url: "https://shonenjump.com/api", reliability: 0.85 },
      { name: "Anime Industry Database", url: "https://www.animenewsnetwork.com/industry", reliability: 0.85 },
      { name: "MyAnimeList API v2", url: "https://myanimelist.net/v1/api", reliability: 0.85 },
      { name: "AniList GraphQL", url: "https://graphql.anilist.co", reliability: 0.85 },
      { name: "TMDB TV", url: "https://api.themoviedb.org/3/tv", reliability: 0.85 }
    ],
    priority2: [
      { name: "Annict", url: "https://api.annict.com/v1", reliability: 0.8 },
      { name: "Shikimori", url: "https://shikimori.com/api", reliability: 0.8 },
      { name: "Comick", url: "https://api.comick.fun", reliability: 0.8 },
      { name: "Crunchyroll Manga", url: "https://manga.crunchyroll.com/api", reliability: 0.8 },
      { name: "J-Novel Club API", url: "https://api.j-novel.club", reliability: 0.8 },
      { name: "Kakao Webtoon", url: "https://webtoon.kakao.com/api", reliability: 0.8 },
      { name: "VRV", url: "https://vrv.co/api", reliability: 0.8 },
      { name: "Bilibili", url: "https://api.bilibili.com", reliability: 0.8 },
      { name: "iQIYI", url: "https://iq.com/api", reliability: 0.75 },
      { name: "WeTV", url: "https://wetv.vip/api", reliability: 0.75 },
      { name: "Viki", url: "https://www.viki.com/api", reliability: 0.75 },
      { name: "SIMKL", url: "https://api.simkl.com", reliability: 0.75 },
      { name: "TVmaze", url: "https://api.tvmaze.com", reliability: 0.75 },
      { name: "Trakt", url: "https://api.trakt.tv", reliability: 0.75 },
      { name: "LiveChart", url: "https://api.livechart.me/api/v1", reliability: 0.75 },
      { name: "notify.moe", url: "https://notify.moe/api", reliability: 0.75 },
      { name: "MangaUpdates", url: "https://www.mangaupdates.com/api", reliability: 0.75 },
      { name: "MAL Scraper", url: "https://myanimelist.net", reliability: 0.75 },
      { name: "Tapas", url: "https://tapas.io/api", reliability: 0.75 },
      { name: "Manta", url: "https://manta.net/api", reliability: 0.75 },
      { name: "OMDb API", url: "https://www.omdbapi.com", reliability: 0.8 },
      { name: "Letterboxd", url: "https://letterboxd.com/data", reliability: 0.8 },
      { name: "The Numbers", url: "https://the-numbers.com/api", reliability: 0.8 },
      { name: "JustWatch", url: "https://www.justwatch.com/api", reliability: 0.8 },
      { name: "Japan Box Office API", url: "https://www.kogyotsushin.jp", reliability: 0.8 },
      { name: "Eiren Anime API", url: "https://www.eiren.org", reliability: 0.8 },
      { name: "Japan Film Database", url: "https://www.japanesefilms.com", reliability: 0.8 },
      { name: "MyDramaList", url: "https://mydramalist.com/api", reliability: 0.8 },
      { name: "MAPPA API", url: "https://mappa-mpp.com/api", reliability: 0.8 },
      { name: "Kyoto Animation API", url: "https://kyotoanimation.jp/api", reliability: 0.8 },
      { name: "Studio Ghibli Films", url: "https://www.ghibli-movies.com", reliability: 0.8 },
      { name: "Toei Animation", url: "https://www.toei-animation.co.jp", reliability: 0.8 },
      { name: "MAPPA", url: "https://www.mappa.co.jp", reliability: 0.8 },
      { name: "Kyoto Animation", url: "https://www.kyotoanimation.co.jp", reliability: 0.8 },
      { name: "Square Enix API", url: "https://square-enix.co.jp/api", reliability: 0.8 },
      { name: "Kadokawa API", url: "https://kadokawa.co.jp/api", reliability: 0.8 },
      { name: "Kitsu API v2", url: "https://kitsu.io/api/edge/graphql", reliability: 0.8 },
      { name: "AniDB Full API", url: "https://api.anidb.net/v1", reliability: 0.8 },
      { name: "Comick API", url: "https://api.comick.fun/v1", reliability: 0.8 },
      { name: "MangaDex API v2", url: "https://api.mangadex.org/v2", reliability: 0.8 },
      { name: "Gekkan Shonen Magazine API", url: "https://shonenmagazine.com/api", reliability: 0.8 },
      { name: "Toei Animation API", url: "https://toei-anim-api.jp", reliability: 0.75 },
      { name: "Pierrot API", url: "https://pierrot.jp/api", reliability: 0.75 },
      { name: "Madhouse API", url: "https://madhouse.jp/api", reliability: 0.75 },
      { name: "Bones API", url: "https://bones.co.jp/api", reliability: 0.75 },
      { name: "WIT Studio API", url: "https://witstudio.co.jp/api", reliability: 0.75 },
      { name: "Ufotable API", url: "https://ufotable.com/api", reliability: 0.75 },
      { name: "Production I.G API", url: "https://productionig.com/api", reliability: 0.75 },
      { name: "Sunrise API", url: "https://sunrise-inc.jp/api", reliability: 0.75 },
      { name: "Bandai Namco Pictures API", url: "https://bnpictures.co.jp/api", reliability: 0.75 },
      { name: "CloverWorks API", url: "https://cloverworks.co.jp/api", reliability: 0.75 },
      { name: "A-1 Pictures API", url: "https://a1p.jp/api", reliability: 0.75 },
      { name: "Studio Pierrot API", url: "https://pierrot.jp/api", reliability: 0.75 },
      { name: "P.A. Works API", url: "https://pa-works.jp/api", reliability: 0.75 },
      { name: "Science SARU API", url: "https://science-saru.com/api", reliability: 0.75 },
      { name: "White Fox API", url: "https://whitefox.jp/api", reliability: 0.75 },
      { name: "J.C.Staff API", url: "https://jcstaff.co.jp/api", reliability: 0.75 },
      { name: "Studio Deen API", url: "https://studio-deen.co.jp/api", reliability: 0.75 },
      { name: "Studio 4\xB0C API", url: "https://studio4c.co.jp/api", reliability: 0.75 },
      { name: "Trigger API", url: "https://trigger.jp/api", reliability: 0.75 },
      { name: "Doga Kobo API", url: "https://dogakobo.co.jp/api", reliability: 0.75 },
      { name: "Akimoto Shuppan API", url: "https://akimoto.jp/api", reliability: 0.75 },
      { name: "Hakusensha API", url: "https://haku.co.jp/api", reliability: 0.75 },
      { name: "Big Comic Original API", url: "https://bigcomic.co.jp/api", reliability: 0.75 },
      { name: "Morning Manga API", url: "https://manga-action.com/api", reliability: 0.75 },
      { name: "Afternoon API", url: "https://afternoon.co.jp/api", reliability: 0.75 },
      { name: "Shojo Beat API", url: "https://shoebeat.co.jp/api", reliability: 0.75 },
      { name: "LaLa API", url: "https://lala-manga.com/api", reliability: 0.75 },
      { name: "Ribon API", url: "https://ribon.shueisha.co.jp/api", reliability: 0.75 },
      { name: "Nakayoshi API", url: "https://nakayoshi.co.jp/api", reliability: 0.75 },
      { name: "Ciao API", url: "https://ciao.shueisha.co.jp/api", reliability: 0.75 },
      { name: "Margaret API", url: "https://shueisha.co.jp/margaret", reliability: 0.75 },
      { name: "Comic Beam API", url: "https://comic-beam.com/api", reliability: 0.75 },
      { name: "Young Jump API", url: "https://youngjump.co.jp/api", reliability: 0.75 },
      { name: "Weekly Young Magazine API", url: "https://ynym.co.jp/api", reliability: 0.75 },
      { name: "Big Comic Spirits API", url: "https://bigcomicsspirits.co.jp/api", reliability: 0.75 },
      { name: "Manga Box API", url: "https://mangabox.jp/api", reliability: 0.75 },
      { name: "MANGA CLUB API", url: "https://club.manga.jp/api", reliability: 0.75 },
      { name: "Monthly Shonen Sirius API", url: "https://shonensirius.com/api", reliability: 0.75 },
      { name: "Shonen Magazine R", url: "https://magazine-r.jp/api", reliability: 0.75 },
      { name: "Monthly Shonen Ace API", url: "https://shonenace.com/api", reliability: 0.75 },
      { name: "Shonen Sirius", url: "https://shonensirius.jp", reliability: 0.75 },
      { name: "Afternoon", url: "https://afternoon.moe", reliability: 0.75 },
      { name: "Shojo Beat", url: "https://shoobeat.jp", reliability: 0.75 },
      { name: "Ribon", url: "https://ribon-manga.com", reliability: 0.75 },
      { name: "FilmAffinity", url: "https://api.filmaffinity.com", reliability: 0.75 },
      { name: "K-Drama Database", url: "https://kdramalist.com/api", reliability: 0.75 },
      { name: "ANIMAP API", url: "https://animap.jp", reliability: 0.75 },
      { name: "Anime Business Japan", url: "https://animebusiness-japan.com", reliability: 0.75 },
      { name: "Seiyu API", url: "https://seiyuu.com/api", reliability: 0.75 },
      { name: "ComicVine", url: "https://comicvine.gamespot.com/api", reliability: 0.75 },
      { name: "MangaUpdates API v2", url: "https://mangaupdates.com/api", reliability: 0.75 },
      { name: "AniAPI", url: "https://aniapi.com.br/api", reliability: 0.7 },
      { name: "TraceMoe", url: "https://api.trace.moe", reliability: 0.7 },
      { name: "AnimeThemes", url: "https://animethemes.moe/api", reliability: 0.7 },
      { name: "AniChart", url: "https://anichart.net/api", reliability: 0.7 },
      { name: "Anisearch API", url: "https://anisearch.com/api", reliability: 0.7 },
      { name: "AniPub API", url: "https://anipub.com/api", reliability: 0.7 },
      { name: "Bato.to", url: "https://bato.to/api/v3", reliability: 0.7 },
      { name: "Novel Updates", url: "https://www.novelupdates.com/api", reliability: 0.7 },
      { name: "Lezhin", url: "https://www.lezhin.com/api", reliability: 0.7 },
      { name: "Tappytoon", url: "https://tappytoon.com/api", reliability: 0.7 },
      { name: "Toomics", url: "https://toomics.com/api", reliability: 0.7 },
      { name: "MrBlue", url: "https://mrblue.com/api", reliability: 0.7 },
      { name: "Tubi", url: "https://tubi.tv/api", reliability: 0.7 },
      { name: "Pluto TV", url: "https://pluto.tv/api", reliability: 0.7 },
      { name: "RetroCrush", url: "https://retrocrush.tv/api", reliability: 0.7 },
      { name: "Viu", url: "https://viu.com/api", reliability: 0.7 },
      { name: "Anime-Planet Streaming", url: "https://anime-planet.com/watch", reliability: 0.7 },
      { name: "DramaFever", url: "https://dramafever.com/api", reliability: 0.7 },
      { name: "ChineseDrama.info", url: "https://chinesedrama.info/api", reliability: 0.7 },
      { name: "Anime Production Stats", url: "https://animetatsugeki.com", reliability: 0.7 },
      { name: "Tokyo Anime Center API", url: "https://animecenter.jp", reliability: 0.7 },
      { name: "Anime Awards API", url: "https://animeawards.jp", reliability: 0.75 },
      { name: "AnimeDB Japan", url: "https://anime-db.com/api", reliability: 0.7 },
      { name: "AnimeAPI", url: "https://animeapi.com", reliability: 0.7 },
      { name: "MangaStats API", url: "https://mangastats.com/api", reliability: 0.7 },
      { name: "Manhwa API", url: "https://manhwa-api.com", reliability: 0.7 },
      { name: "Webtoon API v2", url: "https://webtoon-api.com", reliability: 0.7 },
      { name: "ShangriLa", url: "https://api.sangrograph.com", reliability: 0.7 },
      { name: "TraceMoe API", url: "https://api.trace.moe/v1", reliability: 0.7 },
      { name: "Diomed\xE9a API", url: "https://diome.jp/api", reliability: 0.7 },
      { name: "Satelight API", url: "https://satelight.co.jp/api", reliability: 0.7 },
      { name: "Bessatsu Margaret", url: "https://shueisha.co.jp/bessatsu_margaret", reliability: 0.7 },
      { name: "Morning 2 API", url: "https://morning2.co.jp/api", reliability: 0.7 },
      { name: "Ura Sunday API", url: "https://urasunday.com/api", reliability: 0.7 }
    ],
    priority3: [
      { name: "Zenshin API", url: "https://zenshin.me/api", reliability: 0.65 },
      { name: "AnimeDB API", url: "https://animedb.org/api", reliability: 0.65 },
      { name: "AnimeInfo API", url: "https://animeinfo.io", reliability: 0.65 },
      { name: "OtakuDB", url: "https://otakudb.com/api", reliability: 0.65 },
      { name: "AnimeAPI.org", url: "https://animeapi.org", reliability: 0.65 },
      { name: "Anime Data API", url: "https://animedata.io", reliability: 0.65 },
      { name: "Manga API", url: "https://manga-api.io", reliability: 0.65 },
      { name: "Comic API", url: "https://comic-api.com", reliability: 0.65 },
      { name: "AniPlanet API", url: "https://aniplanet.io/api", reliability: 0.65 },
      { name: "OtakuMode", url: "https://otakumode.com/api", reliability: 0.6 },
      { name: "Haru API", url: "https://haruyuki.com.br/api", reliability: 0.6 },
      { name: "AniMeta API", url: "https://animeta.io/api", reliability: 0.6 },
      { name: "Kurosagi API", url: "https://kurosagi.xyz/api", reliability: 0.6 },
      { name: "Yonkoma API", url: "https://yonkoma.jp/api", reliability: 0.65 },
      { name: "AnimeFacts API", url: "https://anime-facts.herokuapp.com/api", reliability: 0.55 },
      { name: "Catboy API", url: "https://api.catboy.moe", reliability: 0.55 },
      { name: "NekosBest API", url: "https://nekos.best/api", reliability: 0.55 },
      { name: "AnimeChan", url: "https://animechan.vercel.app/api", reliability: 0.5 },
      { name: "Waifu.im", url: "https://api.waifu.im", reliability: 0.5 },
      { name: "Aniwatch API", url: "https://aniwatch-api.com/v1", reliability: 0.5 },
      { name: "AnimeFLV API", url: "https://animeflv-api.com/api", reliability: 0.5 },
      { name: "AnimeGO API", url: "https://animego.org/api", reliability: 0.5 },
      { name: "AniMix API", url: "https://animixplay.to/api/v2", reliability: 0.5 },
      { name: "GoGoAPI", url: "https://gogoanimeapi.io/api", reliability: 0.5 },
      { name: "9Anime API v2", url: "https://9anime.to/api/v2", reliability: 0.5 },
      { name: "KickAssAnime API", url: "https://kickassanime.am/api", reliability: 0.5 },
      { name: "AnimeHide API", url: "https://animehide.com/api", reliability: 0.5 },
      { name: "9Anime", url: "https://9anime.to/api", reliability: 0.5 },
      { name: "Gogoanime", url: "https://gogoanime.ai/api", reliability: 0.5 },
      { name: "Kissanime", url: "https://kissanime.com/api", reliability: 0.5 },
      { name: "AnimePahe", url: "https://animepahe.com/api", reliability: 0.5 },
      { name: "Animixplay", url: "https://animixplay.to/api", reliability: 0.5 },
      { name: "Vidstreaming", url: "https://vidstreaming.io/api", reliability: 0.5 },
      { name: "AllAnime", url: "https://allanime.site/api", reliability: 0.5 },
      { name: "OtakuMode Manga", url: "https://otakumode.com/manga-api", reliability: 0.6 }
    ]
  },
  rss: {
    group1: [
      { name: "NHK\u30A2\u30CB\u30E1 RSS", url: "https://www.nhk.jp/anime/feed", reliability: 0.8 },
      { name: "The Japan Times Anime RSS", url: "https://japantimes.co.jp/culture/anime/feed", reliability: 0.8 },
      { name: "MangaPlus News RSS", url: "https://mangaplus.shueisha.co.jp/news/rss", reliability: 0.8 },
      { name: "Anime News Network RSS", url: "https://www.animenewsnetwork.com/all/rss.xml", reliability: 0.8 },
      { name: "MyAnimeList RSS", url: "https://myanimelist.net/rss/news.xml", reliability: 0.8 },
      { name: "Seiyu Awards RSS", url: "https://seiyuawards.org/feed", reliability: 0.8 },
      { name: "Japan Media Arts RSS", url: "https://j-mediaarts.jp/feed", reliability: 0.8 },
      { name: "Naver Webtoon RSS", url: "https://comic.naver.com/rss", reliability: 0.8 },
      { name: "Kakao Page RSS", url: "https://page.kakao.com/rss", reliability: 0.8 },
      { name: "Manga Plus RSS", url: "https://mangaplus.shueisha.co.jp/rss", reliability: 0.8 },
      { name: "TV\u6771\u4EAC\u30A2\u30CB\u30E1 RSS", url: "https://tv-tokyo.co.jp/anime/feed", reliability: 0.75 },
      { name: "TBS\u30A2\u30CB\u30E1 RSS", url: "https://tbs.co.jp/anime/feed", reliability: 0.75 },
      { name: "\u65E5\u672C\u30C6\u30EC\u30D3\u30A2\u30CB\u30E1 RSS", url: "https://ntv.co.jp/anime/feed", reliability: 0.75 },
      { name: "\u30D5\u30B8\u30C6\u30EC\u30D3\u30A2\u30CB\u30E1 RSS", url: "https://fujitv.co.jp/anime/feed", reliability: 0.75 },
      { name: "\u30C6\u30EC\u671D\u30A2\u30CB\u30E1 RSS", url: "https://tv-asahi.co.jp/anime/feed", reliability: 0.75 },
      { name: "\u54D4\u54E9\u54D4\u54E9 RSS", url: "https://www.bilibili.com/rss", reliability: 0.75 },
      { name: "Crunchyroll News RSS", url: "https://crunchyroll.com/news/rss", reliability: 0.75 },
      { name: "Crunchyroll Expo RSS", url: "https://crunchyrollexpo.com/feed", reliability: 0.75 },
      { name: "Anime News Network Headlines RSS", url: "https://www.animenewsnetwork.com/news/rss.xml", reliability: 0.75 },
      { name: "Nikkei Anime RSS", url: "https://nikkei.com/anime/feed", reliability: 0.75 },
      { name: "MangaDex RSS", url: "https://mangadex.org/rss", reliability: 0.75 },
      { name: "Crunchyroll Manga RSS", url: "https://manga.crunchyroll.com/rss", reliability: 0.75 },
      { name: "Webtoons RSS", url: "https://www.webtoons.com/rss", reliability: 0.75 },
      { name: "J-Novel Club RSS", url: "https://j-novel.club/rss", reliability: 0.75 },
      { name: "Yen Press RSS", url: "https://yenpress.com/rss", reliability: 0.75 },
      { name: "Kodansha USA RSS", url: "https://kodansha.us/rss", reliability: 0.75 },
      { name: "Seven Seas RSS", url: "https://seventheavens.com/rss", reliability: 0.75 },
      { name: "Viz Media RSS", url: "https://viz.com/rss", reliability: 0.75 },
      { name: "Vertical RSS", url: "https://vertical manga.com/rss", reliability: 0.75 },
      { name: "\u30A2\u30CB\u30E1\uFF01\u30A2\u30CB\u30E1\uFF01RSS", url: "https://animeanime.jp/feed", reliability: 0.7 },
      { name: "ASCII.jp \u30A2\u30CB\u30E1 RSS", url: "https://ascii.jp/feed", reliability: 0.7 },
      { name: "\u30A2\u30AD\u30D0\u7DCF\u7814 RSS", url: "https://akiba-souken.jp/feed", reliability: 0.7 },
      { name: "AnimeUKNews RSS", url: "https://animeuknews.net/feed", reliability: 0.7 },
      { name: "Bilibili Animation RSS", url: "https://bilibili.com/feed/animation", reliability: 0.7 },
      { name: "Webtoon Updates RSS", url: "https://webtoons.com/feed/updates", reliability: 0.7 },
      { name: "AnimeCorner RSS", url: "https://animecorner.me/feed", reliability: 0.7 },
      { name: "Japan Forward RSS", url: "https://japanforward.com/feed", reliability: 0.7 },
      { name: "The Mainichi RSS", url: "https://mainichi.jp/english/news/culture/rss2.xml", reliability: 0.7 },
      { name: "Asahi Shimbun RSS", url: "https://asahi.com/feed/rss", reliability: 0.7 },
      { name: "Yomiuri Shimbun RSS", url: "https://yomiuri.co.jp/feed/rss", reliability: 0.7 },
      { name: "MangaUpdates RSS", url: "https://www.mangaupdates.com/rss", reliability: 0.7 },
      { name: "Anime-Planet RSS", url: "https://anime-planet.com/rss", reliability: 0.7 },
      { name: "Anime Expo TV RSS", url: "https://animeexpotv.com/feed", reliability: 0.7 },
      { name: "Anime Awards News RSS", url: "https://animeawards.com/feed", reliability: 0.7 },
      { name: "Anime Schedule JP RSS", url: "https://animeschedule.jp/feed", reliability: 0.7 },
      { name: "Anime News Biz RSS", url: "https://animenewsbiz.com/feed", reliability: 0.7 },
      { name: "IGN Anime RSS", url: "https://www.ign.com/articles/anime?feed", reliability: 0.7 },
      { name: "\u8C46\u74E3 RSS", url: "https://www.douban.com/feed", reliability: 0.7 },
      { name: "\u7231\u5947\u827A RSS", url: "https://www.iqiyi.com/feed", reliability: 0.7 },
      { name: "\u817E\u8BAF\u89C6\u9891 RSS", url: "https://v.qq.com/feed", reliability: 0.7 },
      { name: "MangaDex Scanlations RSS", url: "https://mangadex.org/rss/follows", reliability: 0.7 },
      { name: "Dark Horse RSS", url: "https://darkhorse.com/rss", reliability: 0.7 },
      { name: "Comick RSS", url: "https://comick.fun/rss", reliability: 0.7 }
    ],
    group2: [
      { name: "AnimeHunch RSS", url: "https://animehunch.com/feed", reliability: 0.65 },
      { name: "Otaku News RSS", url: "https://otakunews.com/feed", reliability: 0.65 },
      { name: "Anime Trending RSS", url: "https://animetrending.com/feed", reliability: 0.65 },
      { name: "Honey's Anime RSS", url: "https://honeysanime.com/feed", reliability: 0.65 },
      { name: "Kaiju Quarterly RSS", url: "https://kaijuquarterly.com/feed", reliability: 0.65 },
      { name: "Tokyo Shimbun RSS", url: "https://tokyo-np.co.jp/rss", reliability: 0.65 },
      { name: "Animeblog RSS", url: "https://animeblog.com/feed", reliability: 0.55 },
      { name: "Anime Raptor RSS", url: "https://animerap tor.com/feed", reliability: 0.55 },
      { name: "Anime Obsessive RSS", url: "https://animeobsessive.com/feed", reliability: 0.6 },
      { name: "Anime Feminist RSS", url: "https://animefeminist.com/feed", reliability: 0.6 },
      { name: "Anime News Brasil RSS", url: "https://animenews.com.br/feed", reliability: 0.65 },
      { name: "Anime News Italy RSS", url: "https://animenews.it/feed", reliability: 0.6 },
      { name: "Anime News France RSS", url: "https://animenewsfrance.fr/feed", reliability: 0.6 },
      { name: "Anime News Germany RSS", url: "https://animenews.de/feed", reliability: 0.6 },
      { name: "Anime News Spain RSS", url: "https://animenews.es/feed", reliability: 0.6 },
      { name: "Anime News Korea RSS", url: "https://animenewskorea.com/feed", reliability: 0.65 },
      { name: "Anime Central News RSS", url: "https://animecentralnews.com/feed", reliability: 0.65 },
      { name: "Anime Industry News RSS", url: "https://animeindustrynews.com/feed", reliability: 0.65 },
      { name: "Anime Business RSS", url: "https://animebusiness.com/feed", reliability: 0.65 },
      { name: "Anime Calendar RSS", url: "https://animecalendar.com/feed", reliability: 0.65 },
      { name: "Animation Magazine RSS", url: "https://animationmagazine.net/feed", reliability: 0.65 },
      { name: "Japan Animation RSS", url: "https://japananimation.com/feed", reliability: 0.65 },
      { name: "Anime Insider JP RSS", url: "https://animeinsider.jp/feed", reliability: 0.65 },
      { name: "Otaku Magazine RSS", url: "https://otakumagazine.com/feed", reliability: 0.6 },
      { name: "Manga Magazine RSS", url: "https://mangamagazine.com/feed", reliability: 0.6 },
      { name: "Anime Asia RSS", url: "https://animeasia.com/feed", reliability: 0.6 },
      { name: "Anime Europe RSS", url: "https://animeeurope.com/feed", reliability: 0.6 },
      { name: "Anime USA RSS", url: "https://animeusa.com/feed", reliability: 0.6 },
      { name: "Anime Canada RSS", url: "https://animecanada.com/feed", reliability: 0.6 },
      { name: "Anime Australia RSS", url: "https://animeaustralia.com/feed", reliability: 0.6 },
      { name: "Anime UK RSS", url: "https://animeuk.com/feed", reliability: 0.6 },
      { name: "Anime Germany RSS", url: "https://animegermany.com/feed", reliability: 0.6 },
      { name: "Anime France RSS", url: "https://animefrance.com/feed", reliability: 0.6 },
      { name: "Anime Italy RSS", url: "https://animeitaly.com/feed", reliability: 0.6 },
      { name: "Anime Spain RSS", url: "https://animespain.com/feed", reliability: 0.6 },
      { name: "Anime Brazil RSS", url: "https://animebrasil.com/feed", reliability: 0.6 },
      { name: "Anime Latin America RSS", url: "https://animelatam.com/feed", reliability: 0.6 },
      { name: "Anime World RSS", url: "https://animeworld.com/feed", reliability: 0.55 },
      { name: "AnimeHub News RSS", url: "https://animehub.news/feed", reliability: 0.55 },
      { name: "AnimeZone RSS", url: "https://animezone.com/feed", reliability: 0.55 },
      { name: "AnimeSphere RSS", url: "https://animesphere.com/feed", reliability: 0.55 },
      { name: "AnimeOverflow RSS", url: "https://animeoverflow.com/feed", reliability: 0.55 },
      { name: "J-Entropy RSS", url: "https://j-entropy.com/feed", reliability: 0.6 },
      { name: "Japanimation RSS", url: "https://japanimation.org/feed", reliability: 0.55 },
      { name: "\u30A2\u30CB\u30E1BOX RSS", url: "https://animebox.jp/feed", reliability: 0.65 },
      { name: "\u306D\u3044\u308D\u901F\u5831 RSS", url: "https://neiro.jp/feed", reliability: 0.65 },
      { name: "\u5FAE\u535A RSS", url: "https://www.weibo.com/feed", reliability: 0.65 },
      { name: "\u4F18\u9177 RSS", url: "https://www.youku.com/feed", reliability: 0.65 },
      { name: "\u8292\u679CTV RSS", url: "https://www.mgtv.com/feed", reliability: 0.65 },
      { name: "AcFun RSS", url: "https://www.acfun.cn/feed", reliability: 0.65 },
      { name: "\u6F2B\u753B\u4EBA RSS", url: "https://www.manhuaren.com/feed", reliability: 0.65 },
      { name: "\u6709\u5996\u6C14 RSS", url: "https://www.u17.com/feed", reliability: 0.6 },
      { name: "Screen Rant Anime RSS", url: "https://screenrant.com/category/anime/feed", reliability: 0.65 },
      { name: "Comic Book Resources Anime RSS", url: "https://www.cbr.com/category/anime/feed", reliability: 0.65 },
      { name: "Kotaku Anime RSS", url: "https://kotaku.com/tag/anime/rss", reliability: 0.65 },
      { name: "AnimeDB RSS", url: "https://animedb.me/feed", reliability: 0.55 },
      { name: "AnimePro RSS", url: "https://animepro.com/feed", reliability: 0.55 },
      { name: "Anime Style Guide RSS", url: "https://animestyleguide.com/feed", reliability: 0.55 },
      { name: "Anime Research RSS", url: "https://animeresearch.com/feed", reliability: 0.55 },
      { name: "Random Curiosity RSS", url: "https://random-c.com/feed", reliability: 0.6 },
      { name: "Wrong Every Time RSS", url: "https://wrongeverytime.com/feed", reliability: 0.6 },
      { name: "All Ages of Geek RSS", url: "https://allagesofgeek.com/feed", reliability: 0.6 },
      { name: "Tenka RSS", url: "https://tenka.jp/feed", reliability: 0.6 },
      { name: "Anime Superhero RSS", url: "https://animesuperhero.com/feed", reliability: 0.65 },
      { name: "The Otaku Observer RSS", url: "https://otakuobserver.com/feed", reliability: 0.6 },
      { name: "Ani.me RSS", url: "https://ani.me/feed", reliability: 0.65 },
      { name: "OtakuZone RSS", url: "https://otakuzone.com/feed", reliability: 0.55 },
      { name: "AnimeNow RSS", url: "https://animedelivery.com.br/feed", reliability: 0.6 },
      { name: "J-Entropy RSS", url: "https://j-entropy.com/feed", reliability: 0.65 },
      { name: "H\u884C\u60C5\u52A8\u6F2B RSS", url: "https://hualib.cn/feed", reliability: 0.55 },
      { name: "\u8C46\u74E3\u52A8\u6F2B RSS", url: "https://douban.com/subject/feed/anime", reliability: 0.6 },
      { name: "Netease Anime RSS", url: "https://163.com/dy/animation/feed", reliability: 0.6 },
      { name: "Sohu Anime RSS", url: "https://sohu.com/a/feed/animation", reliability: 0.55 },
      { name: "Tencent Anime RSS", url: "https://v.qq.com/animation/feed", reliability: 0.6 },
      { name: "Comick Scanlations RSS", url: "https://comick.fun/rss/follows", reliability: 0.65 },
      { name: "Batoto RSS", url: "https://bato.to/rss", reliability: 0.6 },
      { name: "Novel Updates Scanlations RSS", url: "https://www.novelupdates.com/feed", reliability: 0.65 },
      { name: "Tapas RSS", url: "https://tapas.io/rss", reliability: 0.65 },
      { name: "Leftorum RSS", url: "https://leftorum.net/rss", reliability: 0.6 },
      { name: "Webcomic RSS", url: "https://webcomic.com/rss", reliability: 0.55 },
      { name: "Manhua Plus RSS", url: "https://manhuaplus.com/feed", reliability: 0.5 },
      { name: "Manga Rock RSS", url: "https://mangarock.com/feed", reliability: 0.45 },
      { name: "ReadMangaToday RSS", url: "https://readmanga.today/feed", reliability: 0.45 },
      { name: "MangaFreak RSS", url: "https://mangafreak.com/feed", reliability: 0.4 },
      { name: "Zinmanga RSS", url: "https://zinmanga.com/feed", reliability: 0.45 },
      { name: "MangaHere RSS", url: "https://mangahere.com/feed", reliability: 0.45 },
      { name: "Tenshi Manga RSS", url: "https://tenshimanga.com/feed", reliability: 0.5 },
      { name: "MangaPark RSS", url: "https://mangapark.io/feed", reliability: 0.5 },
      { name: "Webcomic RSS", url: "https://webcomic.com/feed", reliability: 0.55 },
      { name: "Comic Cave RSS", url: "https://comiccave.com/feed", reliability: 0.45 },
      { name: "MangaRock RSS", url: "https://mangarock.com/rss", reliability: 0.5 },
      { name: "MyAnimeList Forums RSS", url: "https://myanimelist.net/forum/rss", reliability: 0.45 },
      { name: "Anime-Planet Forums RSS", url: "https://anime-planet.com/forum/rss", reliability: 0.4 },
      { name: "AnimeSuki RSS", url: "https://www.animesuki.com/rss", reliability: 0.4 },
      { name: "AniDB RSS", url: "https://anidb.net/rss", reliability: 0.4 },
      { name: "Crunchyroll Forums RSS", url: "https://www.crunchyroll.com/forum/rss", reliability: 0.45 },
      { name: "Reddit r/anime RSS", url: "https://reddit.com/r/anime.rss", reliability: 0.4 },
      { name: "Reddit r/manga RSS", url: "https://reddit.com/r/manga.rss", reliability: 0.4 },
      { name: "Reddit r/manhwa RSS", url: "https://reddit.com/r/manhwa.rss", reliability: 0.4 },
      { name: "Reddit r/isekai RSS", url: "https://reddit.com/r/isekai.rss", reliability: 0.4 },
      { name: "4chan /a/ RSS", url: "https://boards.4channel.org/a/index.rss", reliability: 0.25 },
      { name: "4chan /m/ RSS", url: "https://boards.4channel.org/m/index.rss", reliability: 0.3 }
    ]
  },
  sites: {
    group1: [
      { name: "IMDb", url: "https://www.imdb.com", reliability: 0.9 },
      { name: "Crunchyroll API", url: "https://api.crunchyroll.com", reliability: 0.9 },
      { name: "Netflix", url: "https://netflix.com", reliability: 0.9 },
      { name: "Disney+", url: "https://disneyplus.com", reliability: 0.9 },
      { name: "Hulu", url: "https://hulu.com", reliability: 0.9 },
      { name: "Prime Video", url: "https://primevideo.com", reliability: 0.9 },
      { name: "NHK\u30A2\u30CB\u30E1", url: "https://www.nhk.jp/anime", reliability: 0.85 },
      { name: "Anime News Network", url: "https://www.animenewsnetwork.com", reliability: 0.85 },
      { name: "MyAnimeList", url: "https://myanimelist.net", reliability: 0.85 },
      { name: "Crunchyroll News", url: "https://www.crunchyroll.com/news", reliability: 0.85 },
      { name: "The Japan Times", url: "https://japantimes.co.jp", reliability: 0.85 },
      { name: "AniList", url: "https://anilist.co", reliability: 0.85 },
      { name: "Kitsu", url: "https://kitsu.io", reliability: 0.85 },
      { name: "AniDB", url: "https://anidb.net", reliability: 0.85 },
      { name: "Anime News Network Database", url: "https://www.animenewsnetwork.com/encyclopedia", reliability: 0.85 },
      { name: "The Movie Database", url: "https://www.themoviedb.org", reliability: 0.85 },
      { name: "Rotten Tomatoes", url: "https://www.rottentomatoes.com", reliability: 0.85 },
      { name: "WEBTOONS", url: "https://www.webtoons.com", reliability: 0.85 },
      { name: "Naver Webtoon", url: "https://comic.naver.com", reliability: 0.85 },
      { name: "Kakao Page", url: "https://page.kakao.com", reliability: 0.85 },
      { name: "Naver", url: "https://www.naver.com", reliability: 0.85 },
      { name: "\u30E1\u30C7\u30A3\u30A2\u82B8\u8853\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9", url: "https://mediaarts-db.bunka.go.jp", reliability: 0.85 },
      { name: "Seiyu Awards", url: "https://seiyuawards.org", reliability: 0.85 },
      { name: "Japan Media Arts", url: "https://j-mediaarts.jp", reliability: 0.85 },
      { name: "Japan Box Office", url: "https://www.kogyotsushin.jp", reliability: 0.85 },
      { name: "Eiren", url: "https://www.eiren.org", reliability: 0.85 },
      { name: "Crunchyroll Premium", url: "https://www.crunchyroll.com/premium", reliability: 0.9 },
      { name: "Crunchyroll Free", url: "https://www.crunchyroll.com/free", reliability: 0.85 },
      { name: "Netflix Anime", url: "https://www.netflix.com/browse/genre/7424", reliability: 0.85 },
      { name: "Netflix Anime Movies", url: "https://www.netflix.com/browse/genre/3063", reliability: 0.85 },
      { name: "Netflix Anime TV", url: "https://www.netflix.com/browse/genre/6732", reliability: 0.85 },
      { name: "TV\u6771\u4EAC\u30A2\u30CB\u30E1", url: "https://tv-tokyo.co.jp/anime", reliability: 0.8 },
      { name: "TBS\u30A2\u30CB\u30E1", url: "https://tbs.co.jp/anime", reliability: 0.8 },
      { name: "\u65E5\u672C\u30C6\u30EC\u30D3\u30A2\u30CB\u30E1", url: "https://ntv.co.jp/anime", reliability: 0.8 },
      { name: "\u30D5\u30B8\u30C6\u30EC\u30D3\u30A2\u30CB\u30E1", url: "https://fujitv.co.jp/anime", reliability: 0.8 },
      { name: "\u30C6\u30EC\u671D\u30A2\u30CB\u30E1", url: "https://tv-asahi.co.jp/anime", reliability: 0.8 },
      { name: "\u54D4\u54E9\u54D4\u54E9", url: "https://www.bilibili.com", reliability: 0.8 },
      { name: "HIDIVE Simulan", url: "https://www.hidive.com/simulcast", reliability: 0.8 },
      { name: "Hulu Anime", url: "https://www.hulu.com/anime", reliability: 0.8 },
      { name: "Hulu Japan", url: "https://www.hulu.jp", reliability: 0.8 },
      { name: "Prime Video Anime", url: "https://www.primevideo.com/ajax/gtv/browse?ContentType=TVSHOW&Genre=76197", reliability: 0.8 },
      { name: "Disney+ Star", url: "https://www.disneyplus.com/star", reliability: 0.8 },
      { name: "Apple TV+ Anime", url: "https://tv.apple.com/jp/category/anime", reliability: 0.8 },
      { name: "Amazon Prime Japan", url: "https://www.amazon.co.jp/primevideo", reliability: 0.8 },
      { name: "U-NEXT", url: "https://video.unext.jp", reliability: 0.8 },
      { name: "FOD", url: "https://fod.fujitv.co.jp", reliability: 0.8 },
      { name: "ABEMA", url: "https://abema.tv", reliability: 0.8 },
      { name: "Nikkei Anime", url: "https://nikkei.com/anime", reliability: 0.8 },
      { name: "Anime Expo", url: "https://anime-expo.org", reliability: 0.8 },
      { name: "Crunchyroll Expo", url: "https://crunchyrollexpo.com", reliability: 0.8 },
      { name: "Letterboxd", url: "https://letterboxd.com", reliability: 0.8 },
      { name: "Box Office Mojo", url: "https://boxofficemojo.com", reliability: 0.85 },
      { name: "The Numbers", url: "https://the-numbers.com", reliability: 0.8 },
      { name: "Metacritic", url: "https://www.metacritic.com", reliability: 0.8 },
      { name: "CinemaScore", url: "https://www.cinemascore.com", reliability: 0.8 },
      { name: "MyAnimeList Forums", url: "https://myanimelist.net/forum", reliability: 0.45 },
      { name: "MyDramaList", url: "https://mydramalist.com", reliability: 0.8 },
      { name: "K-Drama Database", url: "https://kdramalist.com", reliability: 0.8 },
      { name: "Viki", url: "https://www.viki.com", reliability: 0.8 },
      { name: "KOCOWA", url: "https://kocowa.com", reliability: 0.75 },
      { name: "TVB", url: "https://tvb.com", reliability: 0.75 },
      { name: "iQIYI Dramas", url: "https://iq.com", reliability: 0.75 },
      { name: "AsianWiki", url: "https://asianwiki.com", reliability: 0.75 },
      { name: "\u58F0\u512A\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9", url: "https://www.seigura.com", reliability: 0.8 },
      { name: "\u3057\u3087\u307C\u3044\u30AB\u30EC\u30F3\u30C0\u30FC", url: "https://cal.syoboi.jp", reliability: 0.8 },
      { name: "\u30A2\u30CB\u30E1\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9", url: "https://anime.dbsearch.net", reliability: 0.75 },
      { name: "\u65E5\u672C\u30A2\u30CB\u30E1\u5927\u5168", url: "https://animedb.jp", reliability: 0.75 },
      { name: "Aniplex Films", url: "https://aniplexfilms.co.jp", reliability: 0.8 },
      { name: "Studio Ghibli Museum", url: "https://www.ghibli-museum.jp", reliability: 0.8 },
      { name: "GKIDS", url: "https://www.gkids.com", reliability: 0.75 },
      { name: "Anime-Planet", url: "https://anime-planet.com", reliability: 0.8 },
      { name: "Shikimori", url: "https://shikimori.one", reliability: 0.8 },
      { name: "notify.moe", url: "https://notify.moe", reliability: 0.75 },
      { name: "TVmaze", url: "https://www.tvmaze.com", reliability: 0.75 },
      { name: "Trakt", url: "https://trakt.tv", reliability: 0.75 },
      { name: "SIMKL", url: "https://simkl.com", reliability: 0.75 },
      { name: "Kakao Webtoon", url: "https://webtoon.kakao.com", reliability: 0.8 },
      { name: "Naver Series", url: "https://series.naver.com", reliability: 0.75 },
      { name: "Kakao Entertainment", url: "https://entertainment.kakao.com", reliability: 0.8 },
      { name: "Naver Webtoon Global", url: "https://webtoons.com", reliability: 0.8 },
      { name: "Daum", url: "https://www.daum.net", reliability: 0.8 },
      { name: "Tapas", url: "https://tapas.io", reliability: 0.75 },
      { name: "Manta", url: "https://manta.net", reliability: 0.75 },
      { name: "Crunchyroll", url: "https://www.crunchyroll.com", reliability: 0.85 },
      { name: "Funimation", url: "https://www.funimation.com", reliability: 0.85 },
      { name: "Sentai Filmworks", url: "https://www.funimation.com", reliability: 0.8 },
      { name: "Anime News Network", url: "https://youtube.com/c/AnimeNewsNetwork", reliability: 0.8 },
      { name: "MyAnimeList", url: "https://youtube.com/c/MyAnimeList", reliability: 0.8 },
      { name: "AniList", url: "https://youtube.com/c/AniList", reliability: 0.75 },
      { name: "Kitsu", url: "https://youtube.com/c/Kitsu", reliability: 0.75 },
      { name: "Anime-Planet", url: "https://youtube.com/c/AnimePlanet", reliability: 0.75 },
      { name: "WEBTOON", url: "https://youtube.com/c/WEBTOON", reliability: 0.75 },
      { name: "Manga Box", url: "https://youtube.com/c/MangaBox", reliability: 0.7 },
      { name: "Nerdist Anime", url: "https://youtube.com/c/NerdistAnime", reliability: 0.7 },
      { name: "GameSpot Anime", url: "https://youtube.com/c/GameSpotAnime", reliability: 0.7 },
      { name: "IGN Anime", url: "https://youtube.com/c/IGNAnime", reliability: 0.7 },
      { name: "Polygon Anime", url: "https://youtube.com/c/PolygonAnime", reliability: 0.7 },
      { name: "Crunchyroll", url: "https://youtube.com/c/Crunchyroll", reliability: 0.85 },
      { name: "Funimation", url: "https://youtube.com/c/Funimation", reliability: 0.85 },
      { name: "Animax", url: "https://youtube.com/c/Animax", reliability: 0.75 }
    ],
    group2: [
      { name: "Anime Corner", url: "https://animecorner.me", reliability: 0.75 },
      { name: "Anime UK News", url: "https://animeuknews.net", reliability: 0.75 },
      { name: "Anime Central", url: "https://animecentral.com", reliability: 0.75 },
      { name: "Anime NYC", url: "https://animenyc.org", reliability: 0.75 },
      { name: "Japan Forward", url: "https://japanforward.com", reliability: 0.75 },
      { name: "The Mainichi", url: "https://mainichi.jp/anime", reliability: 0.75 },
      { name: "Asahi Shimbun", url: "https://asahi.com/anime", reliability: 0.75 },
      { name: "Yomiuri Shimbun", url: "https://yomiuri.co.jp/anime", reliability: 0.75 },
      { name: "Manga Updates", url: "https://www.mangaupdates.com", reliability: 0.75 },
      { name: "Nihon Keizai Shimbun", url: "https://nikkei.com/anime", reliability: 0.8 },
      { name: "Anime Corner", url: "https://animecorner.me", reliability: 0.75 },
      { name: "Yahoo! Anime News", url: "https://news.yahoo.co.jp/anime", reliability: 0.75 },
      { name: "Anime Hunch", url: "https://animehunch.com", reliability: 0.7 },
      { name: "Otaku News", url: "https://otakunews.com", reliability: 0.7 },
      { name: "Anime Trending", url: "https://animetrending.com", reliability: 0.7 },
      { name: "Honey's Anime", url: "https://honeysanime.com", reliability: 0.7 },
      { name: "Kaiju Quarterly", url: "https://kaijuquarterly.com", reliability: 0.7 },
      { name: "Otaku Mode", url: "https://otakumode.com", reliability: 0.7 },
      { name: "Otaku USA", url: "https://otakusa.com", reliability: 0.7 },
      { name: "Animeblog", url: "https://animeblog.com", reliability: 0.6 },
      { name: "Anime Raptor", url: "https://animerap tor.com", reliability: 0.6 },
      { name: "Anime Obsessive", url: "https://animeobsessive.com", reliability: 0.65 },
      { name: "Anime Feminist", url: "https://animefeminist.com", reliability: 0.65 },
      { name: "Anime News Brasil", url: "https://animenews.com.br", reliability: 0.7 },
      { name: "Anime News Italy", url: "https://animenews.it", reliability: 0.65 },
      { name: "Anime News France", url: "https://animenewsfrance.fr", reliability: 0.65 },
      { name: "Anime News Germany", url: "https://animenews.de", reliability: 0.65 },
      { name: "Anime News Spain", url: "https://animenews.es", reliability: 0.65 },
      { name: "Anime News Korea", url: "https://animenewskorea.com", reliability: 0.7 },
      { name: "Anime Central News", url: "https://animecentralnews.com", reliability: 0.7 },
      { name: "Anime Expo TV", url: "https://animeexpotv.com", reliability: 0.75 },
      { name: "Anime Industry News", url: "https://animeindustrynews.com", reliability: 0.7 },
      { name: "Anime Business", url: "https://animebusiness.com", reliability: 0.7 },
      { name: "Anime Awards News", url: "https://animeawards.com", reliability: 0.75 },
      { name: "Anime Schedule JP", url: "https://animeschedule.jp", reliability: 0.75 },
      { name: "Anime Calendar", url: "https://animecalendar.com", reliability: 0.7 },
      { name: "Anime Chart", url: "https://animechart.com", reliability: 0.65 },
      { name: "AnimeDB", url: "https://animedb.me", reliability: 0.65 },
      { name: "Anime Style Guide", url: "https://animestyleguide.com", reliability: 0.65 },
      { name: "Anime Research", url: "https://animeresearch.com", reliability: 0.65 },
      { name: "Anime Pro", url: "https://animepro.com", reliability: 0.65 },
      { name: "Animation Magazine", url: "https://animationmagazine.net", reliability: 0.7 },
      { name: "Japan Animation", url: "https://japananimation.com", reliability: 0.7 },
      { name: "Anime Insider JP", url: "https://animeinsider.jp", reliability: 0.7 },
      { name: "Otaku Magazine", url: "https://otakumagazine.com", reliability: 0.65 },
      { name: "Manga Magazine", url: "https://mangamagazine.com", reliability: 0.65 },
      { name: "Anime Asia", url: "https://animeasia.com", reliability: 0.65 },
      { name: "Anime Europe", url: "https://animeeurope.com", reliability: 0.65 },
      { name: "Anime USA", url: "https://animeusa.com", reliability: 0.65 },
      { name: "Anime Canada", url: "https://animecanada.com", reliability: 0.65 },
      { name: "Anime Australia", url: "https://animeaustralia.com", reliability: 0.65 },
      { name: "Anime UK", url: "https://animeuk.com", reliability: 0.65 },
      { name: "Anime Germany", url: "https://animegermany.com", reliability: 0.65 },
      { name: "Anime France", url: "https://animefrance.com", reliability: 0.65 },
      { name: "Anime Italy", url: "https://animeitaly.com", reliability: 0.65 },
      { name: "Anime Spain", url: "https://animespain.com", reliability: 0.65 },
      { name: "Anime Brazil", url: "https://animebrasil.com", reliability: 0.65 },
      { name: "Anime Latin America", url: "https://animelatam.com", reliability: 0.65 },
      { name: "Anime World", url: "https://animeworld.com", reliability: 0.6 },
      { name: "AnimeHub News", url: "https://animehub.news", reliability: 0.6 },
      { name: "AnimeZone", url: "https://animezone.com", reliability: 0.6 },
      { name: "AnimeSphere", url: "https://animesphere.com", reliability: 0.6 },
      { name: "AnimeOverflow", url: "https://animeoverflow.com", reliability: 0.6 },
      { name: "AnimeRmono", url: "https://animermono.com", reliability: 0.6 },
      { name: "AnimeCatcher", url: "https://animecatcher.com", reliability: 0.6 },
      { name: "Anime Superhero", url: "https://animesuperhero.com", reliability: 0.65 },
      { name: "The Otaku Observer", url: "https://otakuobserver.com", reliability: 0.6 },
      { name: "J-Entropy", url: "https://j-entropy.com", reliability: 0.65 },
      { name: "AnimeNow", url: "https://animedelivery.com.br", reliability: 0.6 },
      { name: "AnimeLog", url: "https://animelog.com.br", reliability: 0.6 },
      { name: "Brasil Anime", url: "https://brasilanime.com", reliability: 0.6 },
      { name: "Anima\xE7\xF5es Brasil", url: "https://animacoesbrasil.com", reliability: 0.55 },
      { name: "Japanimation", url: "https://japanimation.org", reliability: 0.6 },
      { name: "AnimeGuesser", url: "https://animeguesser.com", reliability: 0.55 },
      { name: "AnimeManifesto", url: "https://manifesto.x0.com", reliability: 0.5 },
      { name: "AnimeNyt", url: "https://nytimes.com/movies/box-office", reliability: 0.75 },
      { name: "AnimeWNT", url: "https://anime-wnt.com", reliability: 0.55 },
      { name: "AnimeScoop", url: "https://animescoop.com", reliability: 0.6 },
      { name: "AnimeVized", url: "https://animevized.com", reliability: 0.55 },
      { name: "\u30A2\u30CB\u30E1BOX", url: "https://animebox.jp", reliability: 0.7 },
      { name: "\u306D\u3044\u308D\u901F\u5831", url: "https://neiro.jp", reliability: 0.7 },
      { name: "ASCII.jp \u30A2\u30CB\u30E1", url: "https://ascii.jp", reliability: 0.75 },
      { name: "\u30A2\u30AD\u30D0\u7DCF\u7814", url: "https://akiba-souken.jp", reliability: 0.75 },
      { name: "\u30A2\u30CB\u30E1\u5927\u9053", url: "https://anime-daidou.com", reliability: 0.7 },
      { name: "\u840C\u3048\u30A2\u30CB\u30E1", url: "https://moe-anime.jp", reliability: 0.7 },
      { name: "\u58F0\u512A\u30A2\u30CB\u30E1", url: "https://seiyu-anime.jp", reliability: 0.7 },
      { name: "\u30A2\u30CB\u30E1\u30D7\u30ED", url: "https://animepro.jp", reliability: 0.7 },
      { name: "\u30A2\u30CB\u30E1\u6279\u53D1", url: "https://anime\u6279\u53D1.com", reliability: 0.65 },
      { name: "\u8C46\u74E3", url: "https://www.douban.com", reliability: 0.75 },
      { name: "\u5FAE\u535A", url: "https://www.weibo.com", reliability: 0.7 },
      { name: "\u7231\u5947\u827A", url: "https://www.iqiyi.com", reliability: 0.75 },
      { name: "\u817E\u8BAF\u89C6\u9891", url: "https://v.qq.com", reliability: 0.75 },
      { name: "\u4F18\u9177", url: "https://www.youku.com", reliability: 0.7 },
      { name: "\u8292\u679CTV", url: "https://www.mgtv.com", reliability: 0.7 },
      { name: "AcFun", url: "https://www.acfun.cn", reliability: 0.7 },
      { name: "\u6F2B\u753B\u4EBA", url: "https://www.manhuaren.com", reliability: 0.7 },
      { name: "\u6709\u5996\u6C14", url: "https://www.u17.com", reliability: 0.65 },
      { name: "Anime-Planet Forums", url: "https://anime-planet.com/forum", reliability: 0.4 },
      { name: "AnimeCruzers Forums", url: "https://animecruzers.com/forum", reliability: 0.35 },
      { name: "AnimeSuki Forums", url: "https://www.animesuki.com/forum", reliability: 0.4 },
      { name: "AniDB Forums", url: "https://anidb.net/forum", reliability: 0.4 },
      { name: "Crunchyroll Forums", url: "https://www.crunchyroll.com/forum", reliability: 0.45 },
      { name: "Reddit r/anime", url: "https://reddit.com/r/anime", reliability: 0.4 },
      { name: "Reddit r/manga", url: "https://reddit.com/r/manga", reliability: 0.4 },
      { name: "Reddit r/manhwa", url: "https://reddit.com/r/manhwa", reliability: 0.4 },
      { name: "Reddit r/isekai", url: "https://reddit.com/r/isekai", reliability: 0.4 },
      { name: "5\u3061\u3083\u3093\u306D\u308B \u30A2\u30CB\u30E1\u677F", url: "https://5ch.net/animation", reliability: 0.5 },
      { name: "\u306F\u3066\u306A\u30D6\u30C3\u30AF\u30DE\u30FC\u30AF \u30A2\u30CB\u30E1", url: "https://b.hatena.ne.jp/t/anime", reliability: 0.55 },
      { name: "\u767E\u5EA6\u8D34\u5427", url: "https://tieba.baidu.com", reliability: 0.5 },
      { name: "\u77E5\u4E4E", url: "https://www.zhihu.com", reliability: 0.55 },
      { name: "Lezhin", url: "https://www.lezhin.com", reliability: 0.7 },
      { name: "Tappytoon", url: "https://tappytoon.com", reliability: 0.7 },
      { name: "Toomics", url: "https://toomics.com", reliability: 0.7 },
      { name: "MrBlue", url: "https://mrblue.com", reliability: 0.7 },
      { name: "Bomtoon", url: "https://bomtoon.com", reliability: 0.7 },
      { name: "Pocket Comics", url: "https://pocketcomics.com", reliability: 0.7 },
      { name: "Kakao Story", url: "https://story.kakao.com", reliability: 0.7 },
      { name: "Foxtoon", url: "https://foxtoon.com", reliability: 0.65 },
      { name: "ToonStore", url: "https://toonstore.com", reliability: 0.6 },
      { name: "MangaMon", url: "https://mangamon.com", reliability: 0.6 },
      { name: "Watcha", url: "https://watcha.com", reliability: 0.7 },
      { name: "Lezhin Comics", url: "https://www.lezhin.com/en", reliability: 0.7 },
      { name: "Tapas Comics", url: "https://tapas.io/comics", reliability: 0.7 },
      { name: "Toomics Plus", url: "https://toomics.com/en", reliability: 0.65 },
      { name: "Manta Premium", url: "https://manta.net/premium", reliability: 0.7 },
      { name: "Pocket Comics Global", url: "https://pocketcomics.com/en", reliability: 0.7 },
      { name: "Billy", url: "https://billy.com", reliability: 0.65 },
      { name: "Kakao Webtoon Beta", url: "https://webtoon.kakao.com/beta", reliability: 0.7 },
      { name: "DramaFever", url: "https://dramafever.com", reliability: 0.7 },
      { name: "ChineseDrama.info", url: "https://chinesedrama.info", reliability: 0.7 },
      { name: "DramaNice", url: "https://dramasnice.com", reliability: 0.65 },
      { name: "Dramalist", url: "https://dramalist.com", reliability: 0.7 },
      { name: "Viu", url: "https://www.viu.com", reliability: 0.75 },
      { name: "DramaWiki", url: "https://dramatica.org", reliability: 0.7 },
      { name: "KoreanDrama.org", url: "https://koreandrama.org", reliability: 0.7 },
      { name: "Dramacrazy", url: "https://dramaq.com.br", reliability: 0.65 },
      { name: "OnDemandKorea", url: "https://ondemandkorea.com", reliability: 0.7 },
      { name: "WeTV Dramas", url: "https://wetv.vip", reliability: 0.7 },
      { name: "dTV", url: "https://dtv.jp", reliability: 0.75 },
      { name: "TVer", url: "https://tver.jp", reliability: 0.75 },
      { name: "Niconico", url: "https://nicovideo.jp", reliability: 0.75 },
      { name: "MBS", url: "https://mbs.jp/anime", reliability: 0.75 },
      { name: "TBS", url: "https://tbs.co.jp/anime", reliability: 0.75 },
      { name: "TV Asahi", url: "https://tv-asahi.jp/anime", reliability: 0.75 },
      { name: "TV Tokyo", url: "https://tv-tokyo.co.jp/anime", reliability: 0.75 },
      { name: "Nippon TV", url: "https://ntv.co.jp/anime", reliability: 0.75 },
      { name: "Fuji TV", url: "https://fujitv.co.jp/anime", reliability: 0.75 },
      { name: "Animax", url: "https://animax.co.jp", reliability: 0.8 },
      { name: "Kids Station", url: "https://kidsstation.co.jp", reliability: 0.7 },
      { name: "AT-X", url: "https://at-x.com", reliability: 0.7 },
      { name: "FilmAffinity", url: "https://www.filmaffinity.com", reliability: 0.75 },
      { name: "JustWatch", url: "https://www.justwatch.com", reliability: 0.75 },
      { name: "CineMaterial", url: "https://www.cinematerial.com", reliability: 0.7 },
      { name: "DVD Premiere", url: "https://www.dvdpremiere.com", reliability: 0.65 },
      { name: "Anime Film Database", url: "https://anidb.net", reliability: 0.8 },
      { name: "Japan Cinema", url: "https://japancinema.net", reliability: 0.7 },
      { name: "J-Horror", url: "https://j-horror.com", reliability: 0.7 },
      { name: "Asian Film Database", url: "https://asianfilmdb.com", reliability: 0.75 },
      { name: "Tokusatsu Network", url: "https://tokusatsunetwork.com", reliability: 0.7 },
      { name: "Animeanime.jp", url: "https://animeanime.jp", reliability: 0.75 },
      { name: "AnimeBox.jp", url: "https://animebox.jp", reliability: 0.75 },
      { name: "Nikkoku", url: "https://www.nikkaku.com", reliability: 0.7 },
      { name: "Cinematoday", url: "https://cinematoday.jp", reliability: 0.75 },
      { name: "Movie Walker", url: "https://movie.walkerplus.com", reliability: 0.75 },
      { name: "Natalie Cinema", url: "https://natalie.mu/cinema", reliability: 0.75 },
      { name: "Cinemas Plus", url: "https://www.cinemas.co.jp", reliability: 0.7 },
      { name: "Toho Cinemas", url: "https://www.tohotheater.jp", reliability: 0.75 },
      { name: "109 Cinemas", url: "https://109cinemas.net", reliability: 0.7 },
      { name: "Aeon Cinema", url: "https://www.aeoncinema.com", reliability: 0.7 },
      { name: "United Cinemas", url: "https://www.unitedcinemas.jp", reliability: 0.7 },
      { name: "Kinezo", url: "https://www.kinezo.jp", reliability: 0.7 },
      { name: "Happyget", url: "https://happygat.jp", reliability: 0.65 },
      { name: "Happinet", url: "https://www.happinet.co.jp", reliability: 0.7 },
      { name: "Nikkatsu", url: "https://www.nikkatsu.com", reliability: 0.75 },
      { name: "Shochiku", url: "https://www.shochiku.co.jp", reliability: 0.75 },
      { name: "Toei Movies", url: "https://www.toei.co.jp", reliability: 0.75 },
      { name: "Toho Animation", url: "https://toho-anim.co.jp", reliability: 0.75 },
      { name: "Polyphony Digital", url: "https://www.polyphony.co.jp", reliability: 0.75 },
      { name: "Fathom Events", url: "https://www.fathomevents.com", reliability: 0.7 },
      { name: "animecinema", url: "https://animecinema.com", reliability: 0.65 },
      { name: "AnimeDekk", url: "https://anime-dekk.com", reliability: 0.6 },
      { name: "AnimeMovieDB", url: "https://animemoviedb.com", reliability: 0.65 },
      { name: "MyAnimeList Movies", url: "https://myanimelist.net/anime.php?c[0]=a&c[1]=1&c[2]=e", reliability: 0.8 },
      { name: "AniList Movies", url: "https://anilist.co/search/anime?format=MOVIE", reliability: 0.8 },
      { name: "Kitsu Movies", url: "https://kitsu.io/anime?format=movie", reliability: 0.75 },
      { name: "Anime-Fox", url: "https://anime-fox.net", reliability: 0.6 },
      { name: "Anime\u5E38\u6570", url: "https://anime\u5E38\u6570.com", reliability: 0.6 },
      { name: "Tokyo Shimbun", url: "https://tokyo-np.co.jp/anime", reliability: 0.7 },
      { name: "Anime2You", url: "https://anime2you.de", reliability: 0.7 },
      { name: "Ani.me", url: "https://ani.me", reliability: 0.7 },
      { name: "AnimeZ", url: "https://anisz.de", reliability: 0.7 },
      { name: "AnimeDB", url: "https://animedb.org", reliability: 0.7 },
      { name: "Otaku Zone", url: "https://otakuzone.me", reliability: 0.7 },
      { name: "AnimeSuki", url: "https://www.animesuki.com", reliability: 0.7 },
      { name: "AniSearch", url: "https://www.anisearch.de", reliability: 0.7 }
    ]
  },
  social: {
    group1: [
      { name: "@Crunchyroll", handle: "Crunchyroll", reliability: 0.85 },
      { name: "@animenewsnetwork", handle: "animenewsnetwork", reliability: 0.85 },
      { name: "@MyAnimeList", handle: "MyAnimeList", reliability: 0.85 },
      { name: "@AnimeExpo", handle: "AnimeExpo", reliability: 0.85 },
      { name: "@SeiyuAwards", handle: "SeiyuAwards", reliability: 0.85 },
      { name: "@Shueisha", handle: "Shueisha", reliability: 0.85 },
      { name: "@vizmedia", handle: "vizmedia", reliability: 0.85 },
      { name: "@animenews", handle: "animenews", reliability: 0.8 },
      { name: "@Kitsu", handle: "kitsu", reliability: 0.8 },
      { name: "@AniListCo", handle: "AniListCo", reliability: 0.8 },
      { name: "@shueisha_PR", handle: "shueisha_PR", reliability: 0.8 },
      { name: "@kodansha_us", handle: "kodansha_us", reliability: 0.8 },
      { name: "@YenPress", handle: "YenPress", reliability: 0.8 },
      { name: "@SevenSeasUSA", handle: "SevenSeasUSA", reliability: 0.8 },
      { name: "@KodanshaUSA", handle: "KodanshaUSA", reliability: 0.8 },
      { name: "@Vertical", handle: "Vertical", reliability: 0.8 },
      { name: "@JujutsuKaisen", handle: "JujutsuKaisen", reliability: 0.8 },
      { name: "@DemonSlayer_en", handle: "DemonSlayer_en", reliability: 0.8 },
      { name: "@OP_Official_Anime", handle: "OP_Official_Anime", reliability: 0.8 },
      { name: "@CrunchyrollAwards", handle: "CrunchyrollAwards", reliability: 0.8 },
      { name: "@DB_anime_info", handle: "DB_anime_info", reliability: 0.75 },
      { name: "@AnimeCorner", handle: "AnimeCornerNews", reliability: 0.75 },
      { name: "@Anime_News_eng", handle: "Anime_News_eng", reliability: 0.75 },
      { name: "@AnimeCentral", handle: "AnimeCentral", reliability: 0.75 },
      { name: "@AnimeBoston", handle: "AnimeBoston", reliability: 0.75 },
      { name: "@AnimeNYC", handle: "AnimeNYC", reliability: 0.75 },
      { name: "@ONE_PIECE_anime", handle: "ONE_PIECE_anime", reliability: 0.75 },
      { name: "@attackontitan", handle: "attackontitan", reliability: 0.75 },
      { name: "@MangaUpdates", handle: "MangaUpdates", reliability: 0.75 },
      { name: "@AnimeAwards", handle: "AnimeAwards", reliability: 0.75 },
      { name: "@anime_chiikawa", handle: "anime_chiikawa", reliability: 0.7 },
      { name: "@SugoiLITE", handle: "SugoiLITE", reliability: 0.7 },
      { name: "@MangaMoguraRE", handle: "MangaMoguraRE", reliability: 0.7 },
      { name: "@animenewsfrance", handle: "animenewsfrance", reliability: 0.7 },
      { name: "@AnimeNewsBR", handle: "AnimeNewsBR", reliability: 0.7 },
      { name: "@animenewsde", handle: "animenewsde", reliability: 0.7 },
      { name: "@animenewsit", handle: "animenewsit", reliability: 0.7 },
      { name: "@animenews_es", handle: "animenews_es", reliability: 0.7 },
      { name: "@OtakuNews", handle: "OtakuNews", reliability: 0.7 },
      { name: "@WorstGen", handle: "WorstGen", reliability: 0.65 },
      { name: "@AnimeDuke", handle: "AnimeDuke", reliability: 0.65 },
      { name: "@naruto_club", handle: "naruto_club", reliability: 0.65 },
      { name: "@AnimeUpdates", handle: "AnimeUpdates", reliability: 0.65 },
      { name: "@AnimeScoop", handle: "AnimeScoop", reliability: 0.65 },
      { name: "@AnimeHype", handle: "AnimeHype", reliability: 0.65 },
      { name: "@ToeiAnimation", handle: "ToeiAnimation", reliability: 0.65 },
      { name: "@StudioGhibli", handle: "StudioGhibli", reliability: 0.65 },
      { name: "@ShueishaManga", handle: "ShueishaManga", reliability: 0.65 },
      { name: "@ManhwaUpdates", handle: "ManhwaUpdates", reliability: 0.65 },
      { name: "@WebtoonUpdates", handle: "WebtoonUpdates", reliability: 0.65 },
      { name: "@OnePieceNews", handle: "OnePieceNews", reliability: 0.65 },
      { name: "@OnePieceUpdates", handle: "OnePieceUpdates", reliability: 0.65 },
      { name: "@BestAnimeFeeds", handle: "BestAnimeFeeds", reliability: 0.6 },
      { name: "@AnimeAddicts", handle: "AnimeAddicts", reliability: 0.6 },
      { name: "@OtakuCulture", handle: "OtakuCulture", reliability: 0.6 },
      { name: "@MangaLovers", handle: "MangaLovers", reliability: 0.6 },
      { name: "@MangaAddicts", handle: "MangaAddicts", reliability: 0.6 },
      { name: "@MangaDaily", handle: "MangaDaily", reliability: 0.6 },
      { name: "@ManhwaAddicts", handle: "ManhwaAddicts", reliability: 0.6 },
      { name: "@AnimeDoge", handle: "AnimeDoge", reliability: 0.6 },
      { name: "@AnimeLounge", handle: "AnimeLounge", reliability: 0.6 },
      { name: "@AnimeDekku", handle: "AnimeDekku", reliability: 0.6 },
      { name: "@CrunchyrollNews", handle: "CrunchyrollNews", reliability: 0.6 },
      { name: "@NetflixAnime", handle: "NetflixAnime", reliability: 0.6 },
      { name: "@HIDIVE", handle: "HIDIVE", reliability: 0.6 },
      { name: "@AniplexUSA", handle: "AniplexUSA", reliability: 0.6 },
      { name: "@MAPPA_Info", handle: "MAPPA_Info", reliability: 0.6 },
      { name: "@ufotable_info", handle: "ufotable_info", reliability: 0.6 },
      { name: "@KodanshaManga", handle: "KodanshaManga", reliability: 0.6 },
      { name: "@Shogakukan_Manga", handle: "Shogakukan_Manga", reliability: 0.6 },
      { name: "@DarkHorseComics", handle: "DarkHorseComics", reliability: 0.6 },
      { name: "@JapanExpo", handle: "JapanExpo", reliability: 0.6 },
      { name: "r/anime", url: "https://reddit.com/r/anime", reliability: 0.5 },
      { name: "r/manga", url: "https://reddit.com/r/manga", reliability: 0.5 },
      { name: "r/manhwa", url: "https://reddit.com/r/manhwa", reliability: 0.5 },
      { name: "r/isekai", url: "https://reddit.com/r/isekai", reliability: 0.5 },
      { name: "r/AnimeSuggest", url: "https://reddit.com/r/AnimeSuggest", reliability: 0.5 },
      { name: "r/AnimeWallpaper", url: "https://reddit.com/r/AnimeWallpaper", reliability: 0.5 },
      { name: "r/AnimeID", url: "https://reddit.com/r/AnimeID", reliability: 0.5 },
      { name: "r/AnimeMusic", url: "https://reddit.com/r/AnimeMusic", reliability: 0.5 },
      { name: "r/AnimeFigures", url: "https://reddit.com/r/AnimeFigures", reliability: 0.5 },
      { name: "r/AnimeSketch", url: "https://reddit.com/r/AnimeSketch", reliability: 0.5 },
      { name: "r/OnePiece", url: "https://reddit.com/r/OnePiece", reliability: 0.5 },
      { name: "r/Naruto", url: "https://reddit.com/r/Naruto", reliability: 0.5 },
      { name: "r/JujutsuKaisen", url: "https://reddit.com/r/JujutsuKaisen", reliability: 0.5 },
      { name: "r/DemonSlayer", url: "https://reddit.com/r/DemonSlayer", reliability: 0.5 },
      { name: "r/AttackOnTitan", url: "https://reddit.com/r/AttackOnTitan", reliability: 0.5 },
      { name: "r/bleach", url: "https://reddit.com/r/bleach", reliability: 0.5 },
      { name: "r/DragonBall", url: "https://reddit.com/r/DragonBall", reliability: 0.5 },
      { name: "r/MyHeroAcademia", url: "https://reddit.com/r/MyHeroAcademia", reliability: 0.5 },
      { name: "r/BlackClover", url: "https://reddit.com/r/BlackClover", reliability: 0.5 },
      { name: "r/JoJo", url: "https://reddit.com/r/JoJo", reliability: 0.5 },
      { name: "r/HunterXHunter", url: "https://reddit.com/r/HunterXHunter", reliability: 0.5 },
      { name: "r/OnePunchMan", url: "https://reddit.com/r/OnePunchMan", reliability: 0.5 },
      { name: "r/SpyxFamily", url: "https://reddit.com/r/SpyxFamily", reliability: 0.5 },
      { name: "r/ChainsawMan", url: "https://reddit.com/r/ChainsawMan", reliability: 0.5 },
      { name: "r/TokyoRevengers", url: "https://reddit.com/r/TokyoRevengers", reliability: 0.5 },
      { name: "r/SwordArtOnline", url: "https://reddit.com/r/SwordArtOnline", reliability: 0.5 },
      { name: "r/Re_Zero", url: "https://reddit.com/r/Re_Zero", reliability: 0.5 },
      { name: "r/overlord", url: "https://reddit.com/r/overlord", reliability: 0.5 },
      { name: "r/KonoSuba", url: "https://reddit.com/r/KonoSuba", reliability: 0.5 },
      { name: "r/shoujo", url: "https://reddit.com/r/shoujo", reliability: 0.5 },
      { name: "r/seinen", url: "https://reddit.com/r/seinen", reliability: 0.5 },
      { name: "r/josei", url: "https://reddit.com/r/josei", reliability: 0.5 },
      { name: "r/kdrama", url: "https://reddit.com/r/kdrama", reliability: 0.5 },
      { name: "r/cdramas", url: "https://reddit.com/r/cdramas", reliability: 0.5 },
      { name: "r/asiandrama", url: "https://reddit.com/r/asiandrama", reliability: 0.5 },
      { name: "r/MangaCollectors", url: "https://reddit.com/r/MangaCollectors", reliability: 0.5 },
      { name: "r/AnimeDeals", url: "https://reddit.com/r/AnimeDeals", reliability: 0.5 },
      { name: "r/RetroAnime", url: "https://reddit.com/r/RetroAnime", reliability: 0.5 },
      { name: "r/ShonenManga", url: "https://reddit.com/r/ShonenManga", reliability: 0.5 },
      { name: "r/SeinenManga", url: "https://reddit.com/r/SeinenManga", reliability: 0.5 },
      { name: "r/JoseiManga", url: "https://reddit.com/r/JoseiManga", reliability: 0.5 },
      { name: "r/ShojoManga", url: "https://reddit.com/r/ShojoManga", reliability: 0.5 },
      { name: "r/Manhwa", url: "https://reddit.com/r/Manhwa", reliability: 0.5 },
      { name: "r/Manhua", url: "https://reddit.com/r/Manhua", reliability: 0.5 },
      { name: "r/webtoons", url: "https://reddit.com/r/webtoons", reliability: 0.5 },
      { name: "r/ComicBooks", url: "https://reddit.com/r/ComicBooks", reliability: 0.5 },
      { name: "r/AnimeBluRay", url: "https://reddit.com/r/AnimeBluRay", reliability: 0.5 },
      { name: "r/legal anime", url: "https://reddit.com/r/legal anime", reliability: 0.5 },
      { name: "r/AnimeMusic", url: "https://reddit.com/r/AnimeMusic", reliability: 0.5 },
      { name: "Crunchyroll Community", invite: "crunchyroll", reliability: 0.6 }
    ],
    group2: [
      { name: "@AnimePics", handle: "AnimePics", reliability: 0.5 },
      { name: "@AnimeMeme", handle: "AnimeMeme", reliability: 0.5 },
      { name: "@AnimeForLife", handle: "AnimeForLife", reliability: 0.5 },
      { name: "@NotAnimeFan", handle: "NotAnimeFan", reliability: 0.5 },
      { name: "@AnimeIsLife", handle: "AnimeIsLife", reliability: 0.5 },
      { name: "@AnimeOnlyFans", handle: "AnimeOnlyFans", reliability: 0.5 },
      { name: "@AnimeCore", handle: "AnimeCore", reliability: 0.5 },
      { name: "@OtakuLife", handle: "OtakuLife", reliability: 0.5 },
      { name: "@AnimeOtaku", handle: "AnimeOtaku", reliability: 0.5 },
      { name: "@OnePieceDice", handle: "OnePieceDice", reliability: 0.6 },
      { name: "@MangaReviewers", handle: "MangaReviewers", reliability: 0.6 },
      { name: "@AnimeKaigi", handle: "AnimeKaigi", reliability: 0.55 },
      { name: "@animejp", handle: "animejp", reliability: 0.55 },
      { name: "@AnimeNewsNaija", handle: "AnimeNewsNaija", reliability: 0.55 },
      { name: "@AnimesBrasil", handle: "AnimesBrasil", reliability: 0.55 },
      { name: "@AnimeKorea", handle: "AnimeKorea", reliability: 0.55 },
      { name: "@AnimeMong", handle: "AnimeMong", reliability: 0.55 },
      { name: "@AnimeDekku", handle: "AnimeDekku", reliability: 0.6 },
      { name: "Anime News Network", url: "https://twitter.com/AnimeNewsNetwork", reliability: 0.5 },
      { name: "MyAnimeList", url: "https://twitter.com/MyAnimeList", reliability: 0.5 },
      { name: "Crunchyroll", url: "https://twitter.com/Crunchyroll", reliability: 0.5 },
      { name: "Netflix Anime", url: "https://twitter.com/NetflixAnime", reliability: 0.5 },
      { name: "HIDIVE", url: "https://twitter.com/HIDIVE", reliability: 0.5 },
      { name: "VIZ Media", url: "https://twitter.com/VIZMedia", reliability: 0.5 },
      { name: "Aniplex USA", url: "https://twitter.com/AniplexUSA", reliability: 0.5 },
      { name: "Funimation", url: "https://twitter.com/Funimation", reliability: 0.5 },
      { name: "MAPPA Info", url: "https://twitter.com/MAPPA_Info", reliability: 0.5 },
      { name: "ufotable", url: "https://twitter.com/ufotable_info", reliability: 0.5 },
      { name: "Toei Animation", url: "https://twitter.com/ToeiAnimation", reliability: 0.5 },
      { name: "Studio Ghibli", url: "https://twitter.com/StudioGhibli", reliability: 0.5 },
      { name: "Kodansha Manga", url: "https://twitter.com/KodanshaManga", reliability: 0.5 },
      { name: "Shueisha Manga", url: "https://twitter.com/ShueishaManga", reliability: 0.5 },
      { name: "Shogakukan Manga", url: "https://twitter.com/Shogakukan_Manga", reliability: 0.5 },
      { name: "Dark Horse Comics", url: "https://twitter.com/DarkHorseComics", reliability: 0.5 },
      { name: "Anime Expo", url: "https://twitter.com/AnimeExpo", reliability: 0.5 },
      { name: "Japan Expo", url: "https://twitter.com/JapanExpo", reliability: 0.5 },
      { name: "Anime Central", url: "https://twitter.com/AnimeCentral", reliability: 0.5 },
      { name: "Otaku USA Magazine", url: "https://twitter.com/OtakuUSA_Mag", reliability: 0.5 },
      { name: "r/anime", url: "https://reddit.com/r/anime", reliability: 0.5 },
      { name: "r/Animeanime", url: "https://reddit.com/r/Animeanime", reliability: 0.45 },
      { name: "r/animemes", url: "https://reddit.com/r/animemes", reliability: 0.4 },
      { name: "r/AnimeCircles", url: "https://reddit.com/r/AnimeCircles", reliability: 0.45 },
      { name: "r/anime_irl", url: "https://reddit.com/r/anime_irl", reliability: 0.4 },
      { name: "r/Shitpost", url: "https://reddit.com/r/AnimeShitpost", reliability: 0.4 },
      { name: "r/AnimeCircleJerk", url: "https://reddit.com/r/AnimeCircleJerk", reliability: 0.45 },
      { name: "r/animemes", url: "https://reddit.com/r/animemes", reliability: 0.45 },
      { name: "r/AnimeSuggest", url: "https://reddit.com/r/AnimeSuggest", reliability: 0.5 },
      { name: "r/Anime_irl", url: "https://reddit.com/r/Anime_irl", reliability: 0.45 },
      { name: "r/Animeshower", url: "https://reddit.com/r/Animeshower", reliability: 0.45 },
      { name: "r/AnimeWatc", url: "https://reddit.com/r/AnimeWatc", reliability: 0.45 },
      { name: "r/AnimeCovers", url: "https://reddit.com/r/AnimeCovers", reliability: 0.45 },
      { name: "r/anime Discord", url: "https://discord.gg/anime", reliability: 0.55 },
      { name: "Anime & Manga Discord", url: "https://discord.gg/animemanga", reliability: 0.55 },
      { name: "MyAnimeList Discord", url: "https://discord.gg/myanimelist", reliability: 0.55 },
      { name: "AniList Discord", url: "https://discord.gg/anilist", reliability: 0.55 },
      { name: "Kitsu Discord", url: "https://discord.gg/kitsu", reliability: 0.55 },
      { name: "One Piece Fan Server", url: "https://discord.gg/onepiece", reliability: 0.55 },
      { name: "Naruto Fan Server", url: "https://discord.gg/naruto", reliability: 0.55 },
      { name: "Jujutsu Kaisen Server", url: "https://discord.gg/jujutsukaisen", reliability: 0.55 },
      { name: "Demon Slayer Server", url: "https://discord.gg/demonslayer", reliability: 0.55 },
      { name: "Attack on Titan Server", url: "https://discord.gg/attackontitan", reliability: 0.55 },
      { name: "Dragon Ball Fan Club", url: "https://discord.gg/dragonball", reliability: 0.55 },
      { name: "Tokyo Revengers Server", url: "https://discord.gg/tokyorevengers", reliability: 0.55 },
      { name: "Spy x Family Server", url: "https://discord.gg/spyfamily", reliability: 0.55 },
      { name: "Bleach Server", url: "https://discord.gg/bleach", reliability: 0.55 },
      { name: "Hunter x Hunter Server", url: "https://discord.gg/hunterxhunter", reliability: 0.55 },
      { name: "Shonen Paradise", invite: "shonenparadise", reliability: 0.55 },
      { name: "Anime Awards Server", invite: "animeawards", reliability: 0.55 },
      { name: "One Piece Spoilers", invite: "onepiecespoilers", reliability: 0.5 },
      { name: "Anime Hub", invite: "animehub", reliability: 0.5 },
      { name: "Manga Readers", invite: "mangareaders", reliability: 0.5 },
      { name: "Otaku Community", invite: "otakucommunity", reliability: 0.5 },
      { name: "Anime Discussions", invite: "animediscussions", reliability: 0.5 },
      { name: "K-Drama Fan Club", invite: "kdramafanclub", reliability: 0.5 },
      { name: "Manhwa Club", invite: "manhwaclub", reliability: 0.5 },
      { name: "Anime Central Hub", url: "https://discord.gg/animecentralhub", reliability: 0.4 },
      { name: "Otaku Alliance", url: "https://discord.gg/otakualliance", reliability: 0.4 },
      { name: "Manga Readers Club", url: "https://discord.gg/mangareadersclub", reliability: 0.4 },
      { name: "Weeb Haven", url: "https://discord.gg/weebhaven", reliability: 0.4 },
      { name: "Nipponverse", url: "https://discord.gg/nipponverse", reliability: 0.4 },
      { name: "Anime Sanctuary", url: "https://discord.gg/animesanctuary", reliability: 0.4 },
      { name: "Mang\xE1 Brasil", url: "https://discord.gg/mangabrasil", reliability: 0.4 },
      { name: "Animes Brasil", url: "https://discord.gg/animesbrasil", reliability: 0.4 },
      { name: "K-Drama Fan Server", url: "https://discord.gg/kdramafan", reliability: 0.4 },
      { name: "C-Drama Fan", url: "https://discord.gg/cdramafan", reliability: 0.4 },
      { name: "J-Drama Community", url: "https://discord.gg/jdramacommunity", reliability: 0.4 },
      { name: "Live Action Hub", url: "https://discord.gg/liveactionhub", reliability: 0.4 },
      { name: "Anime Movies Club", url: "https://discord.gg/animemoviesclub", reliability: 0.4 },
      { name: "Classic Anime Society", url: "https://discord.gg/classicanimesociety", reliability: 0.4 },
      { name: "Retro Anime Guild", url: "https://discord.gg/retroanimeguild", reliability: 0.4 },
      { name: "New Season Anime", url: "https://discord.gg/newseasonanime", reliability: 0.4 },
      { name: "Anime Convention Chat", url: "https://discord.gg/animeconventionchat", reliability: 0.4 },
      { name: "Cosplay Community", url: "https://discord.gg/cosplaycommunity", reliability: 0.4 },
      { name: "Anime Music Lounge", url: "https://discord.gg/animemusiclounge", reliability: 0.4 },
      { name: "VTuber Fan Server", url: "https://discord.gg/vtuberfan", reliability: 0.4 },
      { name: "Gigguk", url: "https://youtube.com/@Gigguk", reliability: 0.55 },
      { name: "Mother's Basement", url: "https://youtube.com/@MothersBasement", reliability: 0.55 },
      { name: "The Anime Man", url: "https://youtube.com/@TheAnimeMan", reliability: 0.55 },
      { name: "DuckSage", url: "https://youtube.com/@DuckSage", reliability: 0.5 },
      { name: "Hyboss", url: "https://youtube.com/@Hyboss", reliability: 0.5 },
      { name: "Senpai Admin", url: "https://youtube.com/@SenpaiAdmin", reliability: 0.5 },
      { name: "AnimeMan", url: "https://youtube.com/@AnimeMan", reliability: 0.5 },
      { name: "Random Curiosity", url: "https://youtube.com/@RandomCuriosity", reliability: 0.5 },
      { name: "OTAQUEST", url: "https://youtube.com/@OTAQUEST", reliability: 0.55 },
      { name: "Japanese Pod 101", url: "https://youtube.com/@JapanesePod101", reliability: 0.6 },
      { name: "Anime Expo", url: "https://youtube.com/@AnimeExpo", reliability: 0.6 },
      { name: "Crunchyroll Collection", url: "https://youtube.com/@CrunchyrollCollection", reliability: 0.6 },
      { name: "Aniplex USA", url: "https://youtube.com/@AniplexUSA", reliability: 0.6 },
      { name: "Funimation", url: "https://youtube.com/@Funimation", reliability: 0.6 },
      { name: "HIDIVE", url: "https://youtube.com/@HIDIVE", reliability: 0.6 },
      { name: "Muse Asia", url: "https://youtube.com/@MuseAsia", reliability: 0.6 },
      { name: "Ani-One", url: "https://youtube.com/@AniOne", reliability: 0.6 },
      { name: "VIZ Media", url: "https://youtube.com/@VIZMedia", reliability: 0.6 },
      { name: "Netflix Anime", url: "https://youtube.com/@NetflixAnime", reliability: 0.6 },
      { name: "MAPPA", url: "https://youtube.com/@MAPPA_official", reliability: 0.6 },
      { name: "Ufotable", url: "https://youtube.com/@Ufotable", reliability: 0.6 },
      { name: "Studio Ghibli", url: "https://youtube.com/@StudioGhibli", reliability: 0.6 },
      { name: "Toei Animation", url: "https://youtube.com/@ToeiAnimation", reliability: 0.6 },
      { name: "AniMEGA", url: "https://youtube.com/@AniMEGA", reliability: 0.55 },
      { name: "Tokyo Voice", url: "https://youtube.com/@TokyoVoice", reliability: 0.5 },
      { name: "AnimeLucy", url: "https://youtube.com/c/AnimeLucy", reliability: 0.6 },
      { name: "Rice Digital", url: "https://youtube.com/c/RiceDigital", reliability: 0.65 },
      { name: "Anime Maru", url: "https://youtube.com/c/AnimeMaru", reliability: 0.65 },
      { name: "Sakura Girl", url: "https://youtube.com/c/SakuraGirl", reliability: 0.6 },
      { name: "Manga Reviewer", url: "https://youtube.com/c/MangaReviewer", reliability: 0.6 },
      { name: "Anime Theory", url: "https://youtube.com/c/AnimeTheory", reliability: 0.65 },
      { name: "Ranton", url: "https://youtube.com/c/Ranton", reliability: 0.6 },
      { name: "CDawgVA", url: "https://youtube.com/c/CDawgVA", reliability: 0.65 },
      { name: "JoJo's Bizarre Adventure", url: "https://youtube.com/c/JoJoAnime", reliability: 0.7 },
      { name: "Team Four Star", url: "https://youtube.com/c/TeamFourStar", reliability: 0.6 },
      { name: "Nux Taku", url: "https://youtube.com/c/NuxTaku", reliability: 0.55 },
      { name: "Glass Reflection", url: "https://youtube.com/c/GlassReflection", reliability: 0.6 },
      { name: "Rasmus Lilliedahl", url: "https://youtube.com/c/RasmusLilliedahl", reliability: 0.6 },
      { name: "Canipa\u80B2", url: "https://youtube.com/c/CanipaMain", reliability: 0.6 },
      { name: "Sukanime", url: "https://youtube.com/c/Sukanime", reliability: 0.55 },
      { name: "The Anime Podcast", url: "https://youtube.com/c/TheAnimePodcast", reliability: 0.6 },
      { name: "Anime Addicts", url: "https://youtube.com/c/AnimeAddicts", reliability: 0.6 },
      { name: "Anime Cafe", url: "https://youtube.com/c/AnimeCafe", reliability: 0.55 },
      { name: "Anime History", url: "https://youtube.com/c/AnimeHistory", reliability: 0.65 },
      { name: "Anime Explained", url: "https://youtube.com/c/AnimeExplained", reliability: 0.65 },
      { name: "Anime Universe", url: "https://youtube.com/c/AnimeUniverse", reliability: 0.55 },
      { name: "Anime Review Show", url: "https://youtube.com/c/AnimeReviewShow", reliability: 0.5 },
      { name: "Anime Weekly", url: "https://youtube.com/c/AnimeWeekly", reliability: 0.6 },
      { name: "Animedia", url: "https://youtube.com/c/Animedia", reliability: 0.6 },
      { name: "Anime Academy", url: "https://youtube.com/c/AnimeAcademy", reliability: 0.6 },
      { name: "Anime Insight", url: "https://youtube.com/c/AnimeInsight", reliability: 0.65 },
      { name: "Anime Style", url: "https://youtube.com/c/AnimeStyle", reliability: 0.65 },
      { name: "Anime Studies", url: "https://youtube.com/c/AnimeStudies", reliability: 0.6 },
      { name: "Anime Nippon", url: "https://youtube.com/c/AnimeNippon", reliability: 0.6 },
      { name: "Japanamine", url: "https://youtube.com/c/Japanamine", reliability: 0.6 },
      { name: "Anime Dake", url: "https://youtube.com/c/AnimeDake", reliability: 0.5 },
      { name: "Anime Hub", url: "https://youtube.com/c/AnimeHubOfficial", reliability: 0.5 },
      { name: "Manhwa Addicts", url: "https://youtube.com/c/ManhwaAddicts", reliability: 0.55 },
      { name: "Webtoon Canvas", url: "https://youtube.com/c/WebtoonCanvas", reliability: 0.6 },
      { name: "The Anime Reviewer", url: "https://youtube.com/@TheAnimeReviewer", reliability: 0.5 },
      { name: "Oniichan Review", url: "https://youtube.com/@OniichanReview", reliability: 0.5 },
      { name: "Anime Review Guy", url: "https://youtube.com/@AnimeReviewGuy", reliability: 0.5 },
      { name: "NekoDecoPop", url: "https://youtube.com/@NekoDecoPop", reliability: 0.5 },
      { name: "AnimoonM", url: "https://youtube.com/@AnimoonM", reliability: 0.5 },
      { name: "The Critics Collective", url: "https://youtube.com/@TheCriticsCollective", reliability: 0.5 },
      { name: "Kenny Lauderdale", url: "https://youtube.com/@KennyLauderdale", reliability: 0.5 },
      { name: "Hazel Anime", url: "https://youtube.com/@HazelAnime", reliability: 0.5 },
      { name: "Bonsai Pop", url: "https://youtube.com/@BonsaiPop", reliability: 0.5 },
      { name: "Sakuga Shoujo", url: "https://youtube.com/@SakugaShoujo", reliability: 0.5 },
      { name: "Pey Talks Anime", url: "https://youtube.com/@PeyTalksAnime", reliability: 0.5 },
      { name: "Chumpy Anime", url: "https://youtube.com/@ChumpyAnime", reliability: 0.5 },
      { name: "AnimeDouga", url: "https://youtube.com/@AnimeDouga", reliability: 0.5 },
      { name: "Japanarii", url: "https://youtube.com/@Japanarii", reliability: 0.5 },
      { name: "Anime Patriot", url: "https://youtube.com/@AnimePatriot", reliability: 0.5 },
      { name: "The Otaku Critic", url: "https://youtube.com/@TheOtakuCritic", reliability: 0.5 },
      { name: "JapaneseAnimeFandom", url: "https://youtube.com/@JapaneseAnimeFandom", reliability: 0.5 },
      { name: "Anime Insights", url: "https://youtube.com/@AnimeInsights", reliability: 0.5 },
      { name: "AnimeAddicts", url: "https://youtube.com/@AnimeAddicts", reliability: 0.4 },
      { name: "AnimeAnalyst", url: "https://youtube.com/@AnimeAnalyst", reliability: 0.4 },
      { name: "The Anime Archive", url: "https://youtube.com/@TheAnimeArchive", reliability: 0.4 },
      { name: "Anime Authority", url: "https://youtube.com/@AnimeAuthority", reliability: 0.4 },
      { name: "Anime Beyond", url: "https://youtube.com/@AnimeBeyond", reliability: 0.4 },
      { name: "Anime Central TV", url: "https://youtube.com/@AnimeCentralTV", reliability: 0.4 },
      { name: "Anime Channel", url: "https://youtube.com/@AnimeChannel", reliability: 0.4 },
      { name: "Anime City", url: "https://youtube.com/@AnimeCity", reliability: 0.4 },
      { name: "Anime Club TV", url: "https://youtube.com/@AnimeClubTV", reliability: 0.4 },
      { name: "Anime Cosmos", url: "https://youtube.com/@AnimeCosmos", reliability: 0.4 },
      { name: "Anime Culture", url: "https://youtube.com/@AnimeCulture", reliability: 0.4 },
      { name: "Anime Daily TV", url: "https://youtube.com/@AnimeDailyTV", reliability: 0.4 },
      { name: "Anime Experience", url: "https://youtube.com/@AnimeExperience", reliability: 0.4 },
      { name: "Anime Fans United", url: "https://youtube.com/@AnimeFansUnited", reliability: 0.4 },
      { name: "Anime Feed", url: "https://youtube.com/@AnimeFeed", reliability: 0.4 },
      { name: "Anime Focus", url: "https://youtube.com/@AnimeFocus", reliability: 0.4 },
      { name: "Anime Frontier", url: "https://youtube.com/@AnimeFrontier", reliability: 0.4 },
      { name: "Anime Fury", url: "https://youtube.com/@AnimeFury", reliability: 0.4 },
      { name: "Anime Galaxy", url: "https://youtube.com/@AnimeGalaxy", reliability: 0.4 },
      { name: "Anime Gamer", url: "https://youtube.com/@AnimeGamer", reliability: 0.4 },
      { name: "@crunchyroll", url: "https://tiktok.com/@crunchyroll", reliability: 0.5 },
      { name: "@animecorner", url: "https://tiktok.com/@animecorner_official", reliability: 0.45 },
      { name: "@netflixanime", url: "https://tiktok.com/@netflixanime", reliability: 0.45 },
      { name: "@anitrendz", url: "https://tiktok.com/@anitrendz", reliability: 0.45 },
      { name: "@animenews", url: "https://tiktok.com/@animenews", reliability: 0.45 },
      { name: "@manga_updates", url: "https://tiktok.com/@manga_updates", reliability: 0.45 },
      { name: "@japanese_animation", url: "https://tiktok.com/@japanese_animation", reliability: 0.45 },
      { name: "@otaku_world", url: "https://tiktok.com/@otaku_world", reliability: 0.4 },
      { name: "@anime_facts_", url: "https://tiktok.com/@anime_facts_", reliability: 0.4 },
      { name: "@anime.memes", url: "https://tiktok.com/@anime.memes", reliability: 0.4 },
      { name: "@anime.girl", url: "https://tiktok.com/@anime.girl", reliability: 0.4 },
      { name: "@anime_edits_official", url: "https://tiktok.com/@anime_edits_official", reliability: 0.4 },
      { name: "@anime_reactions", url: "https://tiktok.com/@anime_reactions", reliability: 0.4 },
      { name: "@anime_shippers", url: "https://tiktok.com/@anime_shippers", reliability: 0.4 },
      { name: "@otaku_comedy", url: "https://tiktok.com/@otaku_comedy", reliability: 0.4 },
      { name: "Crunchyroll Brasil", url: "https://facebook.com/CrunchyrollBrasil", reliability: 0.45 },
      { name: "Anime News Network Fan Page", url: "https://facebook.com/AnimeNewsNetwork", reliability: 0.45 },
      { name: "MyAnimeList Brasil", url: "https://facebook.com/MyAnimeListBrasil", reliability: 0.4 },
      { name: "Anime e Mang\xE1 Brasil", url: "https://facebook.com/AnimeEMangaBrasil", reliability: 0.4 },
      { name: "Otaku Brasil", url: "https://facebook.com/OtakuBrasil", reliability: 0.4 },
      { name: "Mang\xE1 Brasil", url: "https://facebook.com/MangaBrasil", reliability: 0.4 },
      { name: "K-Drama Brasil", url: "https://facebook.com/KDramaBrasil", reliability: 0.4 },
      { name: "Anime Fans BR", url: "https://facebook.com/AnimeFansBR", reliability: 0.4 },
      { name: "J-Drama Fan Brasil", url: "https://facebook.com/JDramaFanBrasil", reliability: 0.4 },
      { name: "Anima\xE7\xF5es Brasil", url: "https://facebook.com/AnimacoesBrasil", reliability: 0.4 },
      { name: "ironmouse", url: "https://twitch.tv/ironmouse", reliability: 0.45 },
      { name: "vedal987", url: "https://twitch.tv/vedal987", reliability: 0.45 },
      { name: "projetmelody", url: "https://twitch.tv/projetmelody", reliability: 0.45 },
      { name: "filian", url: "https://twitch.tv/filian", reliability: 0.45 },
      { name: "CodeMiko", url: "https://twitch.tv/CodeMiko", reliability: 0.45 },
      { name: "TheBurntPeanut", url: "https://twitch.tv/TheBurntPeanut", reliability: 0.4 },
      { name: "kitzumivt", url: "https://twitch.tv/kitzumivt", reliability: 0.4 },
      { name: "ilixxieVT", url: "https://twitch.tv/ilixxieVT", reliability: 0.4 },
      { name: "K\u014Dri-Oujo", url: "https://twitch.tv/K\u014Dri-Oujo", reliability: 0.4 },
      { name: "Bao BigNoseBug", url: "https://twitch.tv/BaoBigNoseBug", reliability: 0.4 },
      { name: "Crunchyroll BR", url: "https://t.me/crunchyrollbr", reliability: 0.65 },
      { name: "AniDL", url: "https://t.me/anidl", reliability: 0.6 },
      { name: "Ongoing Anime", url: "https://t.me/Ongoing_animes", reliability: 0.6 },
      { name: "Anime Zone", url: "https://t.me/animezone123", reliability: 0.6 },
      { name: "Otaku TV", url: "https://t.me/otakutv7", reliability: 0.6 },
      { name: "Anikatsu", url: "https://t.me/s/anikatsu", reliability: 0.6 },
      { name: "Anime Updates", url: "https://t.me/animeupdates", reliability: 0.6 },
      { name: "Manga Updates", url: "https://t.me/mangaupdates", reliability: 0.6 },
      { name: "Anime News BR", url: "https://t.me/animenewsbr", reliability: 0.6 },
      { name: "Anime HD Series", url: "https://t.me/animehdseriesindex", reliability: 0.55 },
      { name: "Anime Manga", url: "https://t.me/animemanga", reliability: 0.55 },
      { name: "AniTrack", url: "https://t.me/anitrack", reliability: 0.55 },
      { name: "Anime News EN", url: "https://t.me/animenewsen", reliability: 0.55 },
      { name: "Manga News EN", url: "https://t.me/manganewsen", reliability: 0.55 },
      { name: "Animes VIP", url: "https://t.me/animesvip", reliability: 0.5 },
      { name: "Anime Flix", url: "https://t.me/animeflix", reliability: 0.5 },
      { name: "AniLive", url: "https://t.me/anilive", reliability: 0.5 }
    ]
  }
};

// ../../packages/core/src/normalizer/index.ts
function normalize(item) {
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
    content: item.content
  };
}
function extractAnimeName(text) {
  let name = text.replace(/episode\s*\d+/gi, "").replace(/[-–]\s*episode\s*\d+/gi, "").replace(/\[.*?\]/g, "").replace(/\(.*?\)/g, "").trim();
  const colonIndex = name.lastIndexOf(":");
  if (colonIndex > 0) {
    name = name.substring(0, colonIndex).trim();
  }
  return name;
}
function extractEpisode(text) {
  const patterns = [
    /(?:episode|ep\.?|ep)\s*(\d+)/i,
    /(?:[\w\s]+)\s*-\s*episode\s*(\d+)/i,
    /(\d+)\s*(?:voz|leg|dub)/i,
    /第(\d+)話/i,
    /第(\d+)集/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > 0 && num < 1e3) {
        return num;
      }
    }
  }
  return null;
}
function extractDate(text) {
  const now = /* @__PURE__ */ new Date();
  const relativePatterns = [
    { pattern: /hoje|today/i, offset: 0 },
    { pattern: /amanhã|tomorrow/i, offset: 1 },
    { pattern: /ontem|yesterday/i, offset: -1 },
    { pattern: /próxima?\s*semana|next\s*week/i, offset: 7 }
  ];
  for (const { pattern, offset } of relativePatterns) {
    if (pattern.test(text)) {
      const date = new Date(now);
      date.setDate(date.getDate() + offset);
      return date;
    }
  }
  const datePatterns = [
    { regex: /(\d{4})-(\d{2})-(\d{2})/, format: "ymd" },
    { regex: /(\d{2})\/(\d{2})\/(\d{4})/, format: "mdy" },
    { regex: /(\d{2})-(\d{2})-(\d{4})/, format: "mdy" }
  ];
  for (const { regex, format } of datePatterns) {
    const match = text.match(regex);
    if (match) {
      let year, month, day;
      if (format === "ymd") {
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
function classifyType(item) {
  const content = (item.content || item.title).toLowerCase();
  if (content.includes("oficial") || content.includes("official") || content.includes("confirmado")) {
    return "confirmed";
  }
  if (content.includes("rumor") || content.includes("rumour") || content.includes("speculation")) {
    return "rumor";
  }
  if (content.includes("an\xFAncio") || content.includes("announcement") || content.includes("announced")) {
    return "announcement";
  }
  if (content.includes("live action") || content.includes("\u771F\u4EBA") || content.includes("live-action")) {
    return "live_action";
  }
  return "confirmed";
}

// ../../packages/core/src/classifiers/index.ts
var RELIABILITY_TIERS = {
  tier1: { score: 1, description: "Official/Government" },
  tier2: { score: 0.85, description: "Established Database" },
  tier3: { score: 0.7, description: "Trusted News" },
  tier4: { score: 0.5, description: "Community" },
  tier5: { score: 0.3, description: "Unverified (Rumors)" }
};
var SOURCE_TO_TIER = {
  anilist: "tier1",
  kitsu: "tier1",
  mal: "tier2",
  jikan: "tier2",
  "nag library": "tier1",
  myanimelist: "tier2",
  animeplanet: "tier2",
  notify: "tier2",
  rss_database: "tier2",
  rss_news: "tier3",
  rss: "tier2",
  site_official: "tier1",
  site_news: "tier3",
  site: "tier3",
  social_twitter: "tier4",
  social_discord: "tier4",
  social_reddit: "tier4",
  social: "tier4",
  rumor: "tier5",
  unknown: "tier5"
};
var MEDIA_TYPE_PATTERNS = {
  anime: [
    /anime/i,
    /animated series/i,
    /动画/i,
    /시리즈.*动画/i
  ],
  manga: [
    /manga/i,
    /漫画/i,
    /\s漫画$/i
  ],
  manhwa: [
    /manhwa/i,
    /웹툰/i,
    /webtoon/i,
    /digital manhwa/i
  ],
  live_action: [
    /live[-\s]action/i,
    /live action/i,
    /drama/i,
    /真人/i,
    /실사/i
  ],
  film: [
    /movie/i,
    /film/i,
    /映画/i,
    /영화/i,
    /\s电影$/i
  ],
  series: [
    /tv series/i,
    /tv show/i,
    /series/i,
    /드라마/i,
    /\s电视剧$/i
  ],
  rumor: [
    /rumor/i,
    /rumour/i,
    /speculation/i,
    /unconfirmed/i,
    /possible/i
  ]
};
var SOURCE_SCORES = {
  api: 0.9,
  rss: 0.8,
  site: 0.6,
  social: 0.4
};
var KEYWORD_SCORES = {
  oficial: 1,
  official: 1,
  confirmado: 1,
  confirmed: 1,
  announced: 0.9,
  announcement: 0.9,
  "an\xFAncio": 0.9,
  premiere: 0.9,
  estreias: 0.9,
  debut: 0.9,
  rumor: 0.3,
  rumour: 0.3,
  speculation: 0.3,
  possible: 0.4,
  pode: 0.4,
  might: 0.4,
  "poss\xEDvel": 0.4
};
function detectMediaType(item) {
  const content = `${item.anime} ${item.content || ""} ${item.type || ""}`.toLowerCase();
  for (const [mediaType, patterns] of Object.entries(MEDIA_TYPE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        return mediaType;
      }
    }
  }
  return "anime";
}
function getSourceTier(sourceKey) {
  const normalizedKey = sourceKey.toLowerCase().trim();
  return SOURCE_TO_TIER[normalizedKey] || SOURCE_TO_TIER.unknown;
}
function getTierScore(tier) {
  return RELIABILITY_TIERS[tier].score;
}
function getSourceReliability(sourceName) {
  const normalizedSource = sourceName.toLowerCase().trim();
  const allSources = [
    ...SOURCES_DATABASE.apis.priority1,
    ...SOURCES_DATABASE.apis.priority2,
    ...SOURCES_DATABASE.apis.priority3,
    ...SOURCES_DATABASE.rss.group1,
    ...SOURCES_DATABASE.rss.group2,
    ...SOURCES_DATABASE.sites.group1,
    ...SOURCES_DATABASE.sites.group2,
    ...SOURCES_DATABASE.social.group1,
    ...SOURCES_DATABASE.social.group2
  ];
  const source = allSources.find(
    (s) => s.name.toLowerCase().includes(normalizedSource) || normalizedSource.includes(s.name.toLowerCase())
  );
  return source?.reliability || 0.5;
}
function classifyItem(item) {
  const reasons = [];
  let type = item.type;
  let confidence = SOURCE_SCORES[item.sourceType] || 0.5;
  const content = `${item.anime} ${item.content || ""}`.toLowerCase();
  const tier = getSourceTier(item.source || item.sourceType);
  const tierScore = getTierScore(tier);
  confidence = Math.max(confidence, tierScore);
  reasons.push(`source tier: ${tier} (${RELIABILITY_TIERS[tier].description})`);
  const sourceReliability = getSourceReliability(item.source || item.sourceType);
  confidence = Math.min(confidence * sourceReliability, 1);
  reasons.push(`source reliability: ${sourceReliability} (from SOURCES_DATABASE)`);
  const mediaType = detectMediaType(item);
  reasons.push(`media type: ${mediaType}`);
  for (const [keyword, score] of Object.entries(KEYWORD_SCORES)) {
    if (content.includes(keyword)) {
      if (score === 1) {
        type = "confirmed";
      } else if (score <= 0.4 && type !== "confirmed") {
        type = "rumor";
      }
      confidence = Math.max(confidence, score);
      reasons.push(`found keyword: ${keyword}`);
    }
  }
  if (item.sourceType === "api") {
    confidence = Math.min(confidence + 0.2, 1);
    reasons.push("source is API (high reliability)");
  }
  if (item.episode === null) {
    confidence *= 0.8;
    reasons.push("no episode number found");
  }
  let level;
  if (confidence >= 0.8) {
    level = "high";
  } else if (confidence >= 0.5) {
    level = "medium";
  } else {
    level = "low";
  }
  return {
    type,
    confidence,
    level,
    reasons,
    mediaType,
    tier
  };
}

// ../../packages/core/src/deduplicator/index.ts
function normalizeKey(key) {
  return key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").replace(/\s+/g, "");
}
function calculateSimilarity(str1, str2) {
  const s1 = normalizeKey(str1);
  const s2 = normalizeKey(str2);
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.includes(shorter)) {
    return shorter.length / longer.length;
  }
  const editDistance = levenshtein(shorter, longer);
  return (longer.length - editDistance) / longer.length;
}
function levenshtein(s1, s2) {
  const m = s1.length;
  const n = s2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + 1
        );
      }
    }
  }
  return dp[m][n];
}
function deduplicate(items, similarityThreshold = 0.85) {
  const unique = [];
  const duplicates = [];
  const merged = [];
  const processed = /* @__PURE__ */ new Set();
  for (const item of items) {
    const key = `${item.anime}-${item.episode}`;
    const contentKey = normalizeKey(item.anime);
    let found = false;
    for (const existing of unique) {
      const existingContentKey = normalizeKey(existing.anime);
      if (contentKey === existingContentKey && item.episode === existing.episode) {
        if (item.confidence > existing.confidence) {
          const idx = unique.indexOf(existing);
          unique[idx] = item;
          duplicates.push(existing);
        } else {
          duplicates.push(item);
        }
        found = true;
        break;
      }
      const similarity = calculateSimilarity(item.anime, existing.anime);
      if (similarity >= similarityThreshold && item.episode === existing.episode) {
        if (item.confidence > existing.confidence) {
          const idx = unique.indexOf(existing);
          unique[idx] = item;
          duplicates.push(existing);
        } else {
          duplicates.push(item);
        }
        found = true;
        break;
      }
    }
    if (!found) {
      unique.push(item);
    }
  }
  return { unique, duplicates, merged: [] };
}

// src/sources/api/priority3.ts
async function fetchFromApi(api) {
  try {
    const res = await fetch(api.url);
    if (!res.ok) {
      return [];
    }
    const json = await res.json();
    if (!json.data) {
      return [];
    }
    const items = Array.isArray(json.data) ? json.data : [json.data];
    return items.slice(0, 10).map((item) => ({
      title: String(item.title?.romaji || item.title?.en || item.title?.en_jp || item.name || item.attributes?.titles?.en_jp || "Unknown"),
      content: String(item.description || item.synopsis || item.content || item.attributes?.synopsis || "No description"),
      source: api.url,
      sourceType: "api",
      url: String(item.url || item.siteUrl || item.attributes?.url || ""),
      publishedAt: item.aired?.from || item.startDate || item.attributes?.startDate || void 0
    }));
  } catch {
    return [];
  }
}
async function crawlAPI_Priority3() {
  const animeApis = SOURCES_DATABASE.apis.priority3;
  const results = [];
  for (const api of animeApis) {
    const items = await fetchFromApi(api);
    results.push(...items);
  }
  return results;
}

// src/sources/rss.ts
var import_rss_parser = __toESM(require("rss-parser"));
var parser = new import_rss_parser.default();
async function crawlRSS(url) {
  try {
    const feed = await parser.parseURL(url);
    if (!feed.items || feed.items.length === 0) {
      console.warn(`No items found in RSS feed: ${url}`);
      return [];
    }
    const items = feed.items.map((item) => ({
      title: item.title || "",
      content: item.contentSnippet || item.content || "",
      source: url,
      sourceType: "rss",
      url: item.link,
      publishedAt: item.pubDate
    }));
    return items;
  } catch (error) {
    console.error(`Error crawling RSS ${url}:`, error);
    return [];
  }
}

// src/sources/rss/group1.ts
async function fetchRSS(source) {
  if (!source.url) return [];
  try {
    return await crawlRSS(source.url);
  } catch (error) {
    console.error(`Error crawling RSS ${source.name}:`, error);
    return [];
  }
}
async function crawlRSS_Group1() {
  const allNewsSources = SOURCES_DATABASE.rss.group1;
  const results = [];
  for (const source of allNewsSources) {
    const items = await fetchRSS(source);
    results.push(...items);
  }
  return results;
}

// src/sources/rss/group2.ts
async function fetchRSS2(source) {
  if (!source.url) return [];
  try {
    return await crawlRSS(source.url);
  } catch (error) {
    console.error(`Error crawling RSS ${source.name}:`, error);
    return [];
  }
}
async function crawlRSS_Group2() {
  const allSources = SOURCES_DATABASE.rss.group2;
  const results = [];
  for (const source of allSources) {
    const items = await fetchRSS2(source);
    results.push(...items);
  }
  return results;
}

// src/sources/sites.ts
var cheerio = __toESM(require("cheerio"));
var SITE_CONFIGS = {
  "animecorner.me": () => ({
    selectors: ["h2 a"],
    getTitle: "text",
    getContent: "text",
    getUrl: "href"
  }),
  "myanimelist.net": () => ({
    selectors: [".news-unit"],
    getTitle: ".title",
    getContent: ".title",
    getUrl: ".title a"
  }),
  "animeuknews.net": () => ({
    selectors: ["h2 a"],
    getTitle: "text",
    getContent: "text",
    getUrl: "href"
  }),
  "otakuusamagazine.com": () => ({
    selectors: ["h2 a", ".post-title a"],
    getTitle: "text",
    getContent: "text",
    getUrl: "href"
  }),
  "animehunch.com": () => ({
    selectors: ["h2 a", ".entry-title a"],
    getTitle: "text",
    getContent: "text",
    getUrl: "href"
  })
};
function getSiteConfig(url) {
  for (const [domain, config] of Object.entries(SITE_CONFIGS)) {
    if (url.includes(domain)) {
      return config();
    }
  }
  return null;
}
async function crawlSite(url) {
  try {
    const html = await fetch(url, {
      signal: AbortSignal.timeout(1e4),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    }).then((r) => r.text());
    const $ = cheerio.load(html);
    const items = [];
    const siteConfig = getSiteConfig(url);
    if (siteConfig) {
      for (const selector of siteConfig.selectors) {
        $(selector).each((_, el) => {
          let title = "";
          let content = "";
          let itemUrl = "";
          if (siteConfig.getTitle === "text") {
            title = $(el).text().trim();
          } else {
            title = $(el).find(siteConfig.getTitle).text().trim();
          }
          if (siteConfig.getContent === "text") {
            content = $(el).text().trim();
          } else {
            content = $(el).find(siteConfig.getContent).text().trim();
          }
          if (siteConfig.getUrl === "href") {
            itemUrl = $(el).attr("href") || "";
          } else {
            itemUrl = $(el).find(siteConfig.getUrl).attr("href") || "";
          }
          if (title && itemUrl) {
            items.push({
              title,
              content: content.substring(0, 200),
              source: url,
              sourceType: "site",
              url: itemUrl
            });
          }
        });
        if (items.length > 0) break;
      }
    } else {
      $("article, .post, .entry").each((_, el) => {
        const title = $(el).find("h2, h3, .title").first().text().trim();
        const content = $(el).find(".content, .excerpt, p").first().text().trim();
        const link = $(el).find("a").attr("href");
        if (title && link) {
          items.push({
            title,
            content: content ? content.substring(0, 200) : title,
            source: url,
            sourceType: "site",
            url: link
          });
        }
      });
    }
    return items.slice(0, 10);
  } catch (error) {
    console.error(`Error crawling site ${url}:`, error);
    return [];
  }
}
async function crawlSites(urls) {
  const results = await Promise.all(urls.map((url) => crawlSite(url)));
  return results.flat();
}

// src/sources/sites/group1.ts
async function crawlSites_Group1() {
  const allSources = SOURCES_DATABASE.sites.group1;
  const results = [];
  for (const source of allSources) {
    if (source.url) {
      const items = await crawlSites([source.url]);
      results.push(...items);
    }
  }
  return results;
}

// src/sources/sites/group2.ts
async function crawlSites_Group2() {
  const allSources = SOURCES_DATABASE.sites.group2;
  const results = [];
  for (const source of allSources) {
    if (source.url) {
      const items = await crawlSites([source.url]);
      results.push(...items);
    }
  }
  return results;
}

// src/sources/social/group1.ts
function getFilteredSources() {
  return SOURCES_DATABASE.social.group1;
}
async function fetchTwitterGroup1(sources) {
  if (sources.length === 0) return [];
  const results = [];
  for (const source of sources) {
    const handle = "handle" in source ? source.handle : source.name;
    try {
      const response = await fetch(
        `https://api.twitter.com/2/users/by/username/${handle}/tweets?max_results=10`,
        {
          headers: {
            "Authorization": `Bearer ${process.env.TWITTER_BEARER_TOKEN}`
          }
        }
      );
      if (!response.ok) continue;
      const data = await response.json();
      if (data.data) {
        for (const tweet of data.data) {
          results.push({
            title: tweet.text?.substring(0, 100) || "",
            content: tweet.text || "",
            source: `twitter.com/${handle}`,
            sourceType: "social",
            url: `https://twitter.com/${handle}/status/${tweet.id}`,
            publishedAt: tweet.created_at
          });
        }
      }
    } catch (error) {
      console.error(`Error fetching Twitter ${handle}:`, error);
    }
  }
  return results;
}
async function fetchRedditGroup1(sources) {
  if (sources.length === 0) return [];
  const results = [];
  for (const source of sources) {
    try {
      const response = await fetch(
        `https://www.reddit.com/r/${source.name}/hot.json?limit=25`,
        {
          headers: {
            "User-Agent": "OtakuCalendar/1.0"
          }
        }
      );
      if (!response.ok) continue;
      const data = await response.json();
      if (data.data?.children) {
        for (const post of data.data.children) {
          const p = post.data;
          results.push({
            title: p.title?.substring(0, 100) || "",
            content: p.selftext?.substring(0, 500) || p.title || "",
            source: `reddit.com/r/${source.name}`,
            sourceType: "social",
            url: `https://reddit.com${p.permalink}`,
            publishedAt: new Date(p.created_utc * 1e3).toISOString()
          });
        }
      }
    } catch (error) {
      console.error(`Error fetching Reddit r/${source.name}:`, error);
    }
  }
  return results;
}
async function fetchYouTubeGroup1(sources) {
  if (sources.length === 0) return [];
  const results = [];
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn("YouTube API key not configured, skipping YouTube fetch");
    return results;
  }
  for (const source of sources) {
    const channelId = source.name;
    try {
      const searchResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&q=anime&channelId=${channelId}&order=date&maxResults=10&part=snippet`,
        {}
      );
      if (!searchResponse.ok) continue;
      const data = await searchResponse.json();
      if (data.items) {
        for (const video of data.items) {
          results.push({
            title: video.snippet?.title || "",
            content: video.snippet?.description || "",
            source: `youtube.com/channel/${channelId}`,
            sourceType: "social",
            url: `https://www.youtube.com/watch?v=${video.id?.videoId}`,
            publishedAt: video.snippet?.publishedAt
          });
        }
      }
    } catch (error) {
      console.error(`Error fetching YouTube channel ${channelId}:`, error);
    }
  }
  return results;
}
async function crawlSocial_Group1() {
  const sources = getFilteredSources();
  const twitterSources = sources.filter((s) => "url" in s && s.url?.includes("twitter.com") || "handle" in s);
  const redditSources = sources.filter((s) => "url" in s && s.url?.includes("reddit.com"));
  const youtubeSources = sources.filter((s) => "url" in s && s.url?.includes("youtube.com"));
  const [twitterResults, redditResults, youtubeResults] = await Promise.all([
    fetchTwitterGroup1(twitterSources),
    fetchRedditGroup1(redditSources),
    fetchYouTubeGroup1(youtubeSources)
  ]);
  return [...twitterResults, ...redditResults, ...youtubeResults];
}

// src/sources/social/group2.ts
function getFilteredSources2() {
  return SOURCES_DATABASE.social.group2;
}
async function fetchDiscordGroup2(sources) {
  if (sources.length === 0) return [];
  const results = [];
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("Discord webhook not configured, skipping Discord fetch");
    return results;
  }
  for (const source of sources) {
    try {
      const response = await fetch(`${webhookUrl}?wait=1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `Fetch messages from ${source.name}`
        })
      });
      if (response.ok) {
        results.push({
          title: `Discord server: ${source.name}`,
          content: `Connected to ${source.url}`,
          source: "discord",
          sourceType: "social",
          url: `https://discord.gg/${source.url}`
        });
      }
    } catch (error) {
      console.error(`Error fetching Discord ${source.name}:`, error);
    }
  }
  return results;
}
async function fetchTikTokGroup2(sources) {
  if (sources.length === 0) return [];
  const results = [];
  const apiKey = process.env.TIKTOK_API_KEY;
  if (!apiKey) {
    console.warn("TikTok API key not configured, skipping TikTok fetch");
    return results;
  }
  for (const source of sources) {
    const hashtag = source.name.startsWith("#") ? source.name : `#${source.name}`;
    try {
      const response = await fetch(
        `https://api.tiktok.com/v2/hashtag/list/?hashtag_name=${hashtag.replace("#", "")}`,
        {
          headers: {
            "Authorization": `Bearer ${apiKey}`
          }
        }
      );
      if (!response.ok) continue;
      const data = await response.json();
      if (data.data?.videos) {
        for (const video of data.data.videos.slice(0, 5)) {
          results.push({
            title: video.desc?.substring(0, 100) || hashtag,
            content: video.desc || "",
            source: `tiktok.com/tag/${hashtag.replace("#", "")}`,
            sourceType: "social",
            url: `https://www.tiktok.com/@${video.author?.uniqueId}/video/${video.id}`,
            publishedAt: video.create_time
          });
        }
      }
    } catch (error) {
      console.error(`Error fetching TikTok ${hashtag}:`, error);
    }
  }
  return results;
}
async function fetchFacebookGroup2(sources) {
  if (sources.length === 0) return [];
  const results = [];
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  if (!accessToken) {
    console.warn("Facebook access token not configured, skipping Facebook fetch");
    return results;
  }
  for (const source of sources) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${source.name}/posts?access_token=${accessToken}&limit=10`,
        {}
      );
      if (!response.ok) continue;
      const data = await response.json();
      if (data.data) {
        for (const post of data.data) {
          results.push({
            title: post.message?.substring(0, 100) || "",
            content: post.message || "",
            source: `facebook.com/${source.name}`,
            sourceType: "social",
            url: `https://facebook.com/${post.id}`,
            publishedAt: post.created_time
          });
        }
      }
    } catch (error) {
      console.error(`Error fetching Facebook page ${source.name}:`, error);
    }
  }
  return results;
}
async function fetchTwitchGroup2(sources) {
  if (sources.length === 0) return [];
  const results = [];
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.warn("Twitch API credentials not configured, skipping Twitch fetch");
    return results;
  }
  let accessToken = "";
  try {
    const tokenResponse = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
      { method: "POST" }
    );
    if (!tokenResponse.ok) throw new Error("Failed to get Twitch access token");
    const tokenData = await tokenResponse.json();
    accessToken = tokenData.access_token;
  } catch (error) {
    console.error("Error getting Twitch access token:", error);
    return results;
  }
  for (const source of sources) {
    const channelName = source.name;
    try {
      const response = await fetch(
        `https://api.twitch.tv/helix/streams?user_login=${channelName}`,
        {
          headers: {
            "Client-ID": clientId,
            "Authorization": `Bearer ${accessToken}`
          }
        }
      );
      if (!response.ok) continue;
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        for (const stream of data.data) {
          results.push({
            title: stream.title?.substring(0, 100) || "",
            content: stream.title || "",
            source: `twitch.tv/${channelName}`,
            sourceType: "social",
            url: `https://www.twitch.tv/${channelName}`,
            publishedAt: stream.started_at
          });
        }
      }
    } catch (error) {
      console.error(`Error fetching Twitch channel ${channelName}:`, error);
    }
  }
  return results;
}
async function fetchTelegramGroup2(sources) {
  if (sources.length === 0) return [];
  const results = [];
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.warn("Telegram bot token not configured, skipping Telegram fetch");
    return results;
  }
  for (const source of sources) {
    const chatId = source.name;
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/getUpdates?chat_id=${chatId}&limit=10`,
        {}
      );
      if (!response.ok) continue;
      const data = await response.json();
      if (data.result) {
        for (const update of data.result.slice(0, 10)) {
          const message = update.message;
          if (message?.text) {
            results.push({
              title: message.text?.substring(0, 100) || "",
              content: message.text || "",
              source: `t.me/${chatId}`,
              sourceType: "social",
              url: `https://t.me/${chatId}`,
              publishedAt: new Date(message.date * 1e3).toISOString()
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching Telegram chat ${chatId}:`, error);
    }
  }
  return results;
}
async function crawlSocial_Group2() {
  const sources = getFilteredSources2();
  const discordSources = sources.filter((s) => "url" in s && s.url?.includes("discord") || "invite" in s);
  const tiktokSources = sources.filter((s) => "url" in s && s.url?.includes("tiktok"));
  const facebookSources = sources.filter((s) => "url" in s && s.url?.includes("facebook"));
  const twitchSources = sources.filter((s) => "url" in s && s.url?.includes("twitch"));
  const telegramSources = sources.filter((s) => "url" in s && s.url?.includes("t.me"));
  const [discordResults, tiktokResults, facebookResults, twitchResults, telegramResults] = await Promise.all([
    fetchDiscordGroup2(discordSources),
    fetchTikTokGroup2(tiktokSources),
    fetchFacebookGroup2(facebookSources),
    fetchTwitchGroup2(twitchSources),
    fetchTelegramGroup2(telegramSources)
  ]);
  return [...discordResults, ...tiktokResults, ...facebookResults, ...twitchResults, ...telegramResults];
}

// src/sources/extractors/index.ts
async function extractAndClassify(items) {
  if (!items || items.length === 0) {
    return [];
  }
  const normalized = items.map((item) => normalize(item));
  const classified = normalized.map((item) => {
    const classification = classifyItem(item);
    return {
      ...item,
      confidence: classification.confidence,
      type: classification.type,
      mediaType: classification.mediaType
    };
  });
  return classified;
}

// src/sources/config.ts
function getEnvConfig() {
  return {
    apis: [
      "https://graphql.anilist.co",
      "https://api.jikan.moe/v4",
      "https://kitsu.io/api/edge",
      "https://api.simkl.com",
      "https://api.themoviedb.org",
      "https://api.tvmaze.com",
      "https://api.trakt.tv",
      "https://api.myanimelist.net",
      "https://api.aniapi.com",
      "https://api.trace.moe",
      "https://api.animechan.xyz",
      "https://api.animethemes.moe",
      "https://api.mangadex.org",
      "https://api.comick.fun",
      "https://api.myanimelist.net/v2",
      "https://api.livechart.me",
      "https://api.anichart.net",
      "https://api.waifu.im"
    ].join(","),
    sites: [
      "https://www.animenewsnetwork.com",
      "https://myanimelist.net/news",
      "https://animecorner.me",
      "https://otakuusamagazine.com",
      "https://www.crunchyroll.com/news",
      "https://www.animehunch.com",
      "https://www.otakunews.com",
      "https://anitrendz.net",
      "https://www.animenation.net/blog",
      "https://animeuknews.net",
      "https://www.honeysanime.com",
      "https://www.animedaily.com",
      "https://www.randomc.net",
      "https://wrongeverytime.com",
      "https://blog.alltheanime.com",
      "https://www.sakugablog.com",
      "https://comicbook.com/anime",
      "https://screenrant.com/anime",
      "https://collider.com/tag/anime",
      "https://deadline.com/tag/anime",
      "https://variety.com/t/anime",
      "https://hollywoodreporter.com/tag/anime",
      "https://kotaku.com/tag/anime",
      "https://ign.com/anime",
      "https://www.imdb.com"
    ].join(","),
    rss: [
      "https://www.animenewsnetwork.com/all/rss.xml?ann-edition=us",
      "https://myanimelist.net/rss/news.xml",
      "https://animecorner.me/feed/",
      "https://feeds.feedburner.com/crunchyroll",
      "https://animeuknews.net/feed",
      "https://honeysanime.com/feed",
      "https://otakunews.com/rss/rss.xml",
      "https://anitrendz.net/news/feed",
      "https://theanimedaily.com/feed",
      "https://animehunch.com/feed",
      "https://randomc.net/feed",
      "https://wrongeverytime.com/feed",
      "https://9tailedkitsune.com/feed",
      "https://allagesofgeek.com/feed",
      "https://tenka.seiha.org/feed",
      "https://mangabookshelf.com/feed"
    ].join(",")
  };
}

// src/utils/queue.ts
var CrawlerQueue = class {
  jobs = [];
  normalizedResults = [];
  add(name, fn, priority = 0, extractorFn) {
    this.jobs.push({ name, fn, priority, extractorFn });
    this.jobs.sort((a, b) => b.priority - a.priority);
  }
  getNormalizedResults() {
    return this.normalizedResults;
  }
  async processAll() {
    const results = [];
    const totalStart = Date.now();
    const apiJobs = this.jobs.filter((j) => j.name.startsWith("API_"));
    const rssJobs = this.jobs.filter((j) => j.name.startsWith("RSS_"));
    const sitesJobs = this.jobs.filter((j) => j.name.startsWith("Sites_"));
    const socialJobs = this.jobs.filter((j) => j.name.startsWith("Social_"));
    console.log(`
\u{1F4CB} Starting queue with ${this.jobs.length} crawlers`);
    console.log(`\u{1F4CB} Wave 1: APIs (${apiJobs.length} jobs - sequential)`);
    console.log(`\u{1F4CB} Wave 2: RSS (${rssJobs.length} jobs - parallel)`);
    console.log(`\u{1F4CB} Wave 3: Sites (${sitesJobs.length} jobs - parallel)`);
    console.log(`\u{1F4CB} Wave 4: Social (${socialJobs.length} jobs - sequential)`);
    for (const job of apiJobs) {
      const result = await this.executeJob(job);
      results.push(result);
      await this.delay(1e3);
    }
    if (rssJobs.length > 0) {
      const rssResults = await Promise.all(rssJobs.map((j) => this.executeJob(j)));
      results.push(...rssResults);
      await this.delay(1e3);
    }
    if (sitesJobs.length > 0) {
      const sitesResults = await Promise.all(sitesJobs.map((j) => this.executeJob(j)));
      results.push(...sitesResults);
      await this.delay(1e3);
    }
    for (const job of socialJobs) {
      const result = await this.executeJob(job);
      results.push(result);
      await this.delay(1e3);
    }
    const totalDuration = Date.now() - totalStart;
    console.log(`
\u{1F4CA} Queue completed in ${totalDuration}ms`);
    console.log(`\u{1F4CA} Total normalized items collected: ${this.normalizedResults.length}`);
    return results;
  }
  async executeJob(job) {
    const jobStart = Date.now();
    console.log(`
\u{1F504} Starting: ${job.name}`);
    try {
      const items = await job.fn();
      const duration = Date.now() - jobStart;
      console.log(`\u2705 ${job.name} completed: ${items.length} items in ${duration}ms`);
      let normalizedItems;
      if (job.extractorFn && items.length > 0) {
        console.log(`\u{1F504} Running extractor for: ${job.name}`);
        normalizedItems = await job.extractorFn(items);
        this.normalizedResults.push(...normalizedItems);
        console.log(`\u2705 Extractor completed: ${normalizedItems.length} normalized items`);
      }
      return {
        name: job.name,
        items,
        normalizedItems,
        duration,
        status: "success"
      };
    } catch (error) {
      const duration = Date.now() - jobStart;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`\u274C ${job.name} failed after ${duration}ms: ${errorMessage}`);
      return {
        name: job.name,
        items: [],
        normalizedItems: [],
        duration,
        status: "error",
        error: errorMessage
      };
    }
  }
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
};

// src/index.ts
var CRAWLER_CONFIG = {
  apis: {
    priority1: ["AniList", "Jikan", "Kitsu"],
    priority2: ["TMDB", "MangaDex", "Comick", "TVmaze", "Trakt", "SIMKL"],
    priority3: ["Other APIs"]
  },
  rss: {
    group1: "news (141 feeds)",
    group2: "manga+community+scanlation (46 feeds)"
  },
  sites: {
    group1: "news+databases (167 sites)",
    group2: "other categories (198 sites)"
  },
  social: {
    group1: "Twitter+Reddit+YouTube (290)",
    group2: "Discord+TikTok+Facebook+Twitch+Telegram (97)"
  }
};
async function runCrawler() {
  console.log("\u{1F680} Starting Otaku Calendar Crawler (Type-Based)...");
  console.log("\u23F0 Time:", (/* @__PURE__ */ new Date()).toISOString());
  const envConfig = getEnvConfig();
  console.log(`\u{1F4E1} Loading sources from config...`);
  console.log(`   - APIs: priority1, priority2, priority3`);
  console.log(`   - RSS: group1, group2`);
  console.log(`   - Sites: group1, group2`);
  console.log(`   - Social: group1, group2`);
  const queue = new CrawlerQueue();
  queue.add("API_Priority1", crawlAPI_Priority1, 0, extractAndClassify);
  queue.add("API_Priority2", crawlAPI_Priority2, 0, extractAndClassify);
  queue.add("API_Priority3", crawlAPI_Priority3, 0, extractAndClassify);
  queue.add("RSS_Group1", crawlRSS_Group1, 0, extractAndClassify);
  queue.add("RSS_Group2", crawlRSS_Group2, 0, extractAndClassify);
  queue.add("Sites_Group1", crawlSites_Group1, 0, extractAndClassify);
  queue.add("Sites_Group2", crawlSites_Group2, 0, extractAndClassify);
  queue.add("Social_Group1", crawlSocial_Group1, 0, extractAndClassify);
  queue.add("Social_Group2", crawlSocial_Group2, 0, extractAndClassify);
  const results = await queue.processAll();
  const normalizedResults = queue.getNormalizedResults();
  const counts = {};
  const allResults = [];
  results.forEach((result) => {
    counts[result.name] = result.items.length;
    allResults.push(...result.items);
  });
  const total = allResults.length;
  console.log(`
\u{1F4CA} Crawled ${total} total items`);
  Object.entries(counts).forEach(([name, count]) => {
    console.log(`   - ${name}: ${count}`);
  });
  console.log(`
\u{1F50D} Normalized ${normalizedResults.length} items (via extractors)`);
  console.log("\u{1F504} Deduplicating...");
  const { unique, duplicates } = deduplicate(normalizedResults);
  console.log(`
\u2705 Final: ${unique.length} unique events (${duplicates} duplicates removed)`);
  if (unique.length > 0) {
    console.log("\n\u{1F4CB} Sample events:");
    unique.slice(0, 3).forEach((event, i) => {
      console.log(`   ${i + 1}. ${event.anime?.substring(0, 50)}... [${event.type}] [${event.mediaType || "unknown"}]`);
    });
  }
  return unique;
}
if (require.main === module) {
  runCrawler().then((events) => {
    console.log("\n\u{1F4CB} All events:", JSON.stringify(events, null, 2));
    process.exit(0);
  }).catch((error) => {
    console.error("\u274C Crawler error:", error);
    process.exit(1);
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CRAWLER_CONFIG,
  runCrawler
});
