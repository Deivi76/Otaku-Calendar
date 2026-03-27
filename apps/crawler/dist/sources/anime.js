import { getAnimeSources } from './manager';
import { crawlRSS } from './rss';
import { crawlSite } from './sites';
import { crawlSocial } from './social';
import { crawlAniList } from './anilist';
import { crawlJikan } from './jikan';
import { crawlKitsu } from './kitsu';
import { crawlMangaDex } from './mangadex';
import { crawlJapanese } from './japanese';
import { crawlChinese } from './chinese';
async function fetchFromAPI(api) {
    try {
        if (api.url.includes('anilist.co')) {
            return crawlAniList();
        }
        if (api.url.includes('jikan.moe')) {
            return crawlJikan();
        }
        if (api.url.includes('kitsu.io')) {
            return crawlKitsu();
        }
        if (api.url.includes('mangadex.org')) {
            return crawlMangaDex();
        }
        if (api.url.includes('japanese')) {
            return crawlJapanese();
        }
        if (api.url.includes('chinese')) {
            return crawlChinese();
        }
        return [];
    }
    catch (error) {
        console.error(`Error fetching from API ${api.name}:`, error);
        return [];
    }
}
async function fetchRSS(source) {
    if (!source.url)
        return [];
    return crawlRSS(source.url);
}
async function fetchSite(site) {
    if (!site.url)
        return [];
    return crawlSite(site.url);
}
async function fetchSocial(social) {
    return crawlSocial();
}
export async function crawlAnime() {
    const sources = getAnimeSources();
    const results = await Promise.all([
        ...sources.apis.map(api => fetchFromAPI(api)),
        ...sources.rss.map(rss => fetchRSS(rss)),
        ...sources.sites.map(site => fetchSite(site)),
        ...sources.social.map(social => fetchSocial(social)),
    ]);
    return results.flat();
}
