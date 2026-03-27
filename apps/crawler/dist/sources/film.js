import { getFilmSources } from './manager';
import { crawlRSS } from './rss';
import { crawlSite } from './sites';
const TMDB_API = process.env.TMDB_API || 'https://api.themoviedb.org/3';
const TMDB_KEY = process.env.TMDB_API_KEY;
const OMDB_API = process.env.OMDB_API || 'http://www.omdbapi.com';
const OMDB_KEY = process.env.OMDB_API_KEY;
const JIKAN_API = process.env.JIKAN_API || 'https://api.jikan.moe/v4';
const ANILIST_API = process.env.ANILIST_API || 'https://graphql.anilist.co';
const KITSU_API = process.env.KITSU_API || 'https://kitsu.io/api/edge';
const TRAKT_API = process.env.TRAKT_API || 'https://api.trakt.tv';
const TRAKT_KEY = process.env.TRAKT_CLIENT_ID;
const ANIMETHEMES_API = process.env.ANIMETHEMES_API || 'https://api.animethemes.moe';
async function fetchWithTimeout(url, timeout = 10000) {
    return fetch(url, { signal: AbortSignal.timeout(timeout) });
}
async function tmbdDiscoverMovies(page = 1) {
    if (!TMDB_KEY)
        return [];
    try {
        const url = `${TMDB_API}/discover/movie?api_key=${TMDB_KEY}&with_genres=16&language=en-US&page=${page}&sort_by=popularity.desc`;
        const res = await fetchWithTimeout(url);
        if (!res.ok)
            throw new Error(`TMDB error: ${res.status}`);
        const data = await res.json();
        return data.results?.map((movie) => ({
            title: movie.title,
            content: movie.overview?.substring(0, 200) || `Rating: ${movie.vote_average}/10`,
            source: 'TMDB',
            sourceType: 'api',
            url: `https://www.themoviedb.org/movie/${movie.id}`,
            publishedAt: movie.release_date,
        })) || [];
    }
    catch (error) {
        console.error('Error fetching TMDB anime movies:', error);
        return [];
    }
}
async function tmdbSearchAnimeMovies(query, page = 1) {
    if (!TMDB_KEY)
        return [];
    try {
        const url = `${TMDB_API}/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=${page}`;
        const res = await fetchWithTimeout(url);
        if (!res.ok)
            throw new Error(`TMDB error: ${res.status}`);
        const data = await res.json();
        return data.results?.map((movie) => ({
            title: movie.title,
            content: movie.overview?.substring(0, 200) || `Rating: ${movie.vote_average}/10`,
            source: 'TMDB',
            sourceType: 'api',
            url: `https://www.themoviedb.org/movie/${movie.id}`,
            publishedAt: movie.release_date,
        })) || [];
    }
    catch (error) {
        console.error('Error searching TMDB:', error);
        return [];
    }
}
async function fetchOMDb(title) {
    if (!OMDB_KEY)
        return [];
    try {
        const url = `${OMDB_API}/?apikey=${OMDB_KEY}&s=${encodeURIComponent(title)}&type=movie&r=json`;
        const res = await fetchWithTimeout(url);
        if (!res.ok)
            throw new Error(`OMDb error: ${res.status}`);
        const data = await res.json();
        if (!data.Search)
            return [];
        return data.Search.map((movie) => ({
            title: movie.Title,
            content: `Year: ${movie.Year}`,
            source: 'OMDb',
            sourceType: 'api',
            url: `https://www.imdb.com/title/${movie.imdbID}`,
            publishedAt: movie.Year ? `${movie.Year}-01-01` : undefined,
        }));
    }
    catch (error) {
        console.error('Error fetching OMDb:', error);
        return [];
    }
}
async function fetchJikanMovies() {
    try {
        const res = await fetchWithTimeout(`${JIKAN_API}/anime?type=movie&limit=50&order_by=score&sort=desc`);
        if (!res.ok)
            throw new Error(`Jikan error: ${res.status}`);
        const data = await res.json();
        return data.data?.map((anime) => ({
            title: anime.title || anime.title_japanese,
            content: anime.synopsis?.substring(0, 200) || `Score: ${anime.score}`,
            source: 'Jikan',
            sourceType: 'api',
            url: anime.url,
            publishedAt: anime.aired?.from,
        })) || [];
    }
    catch (error) {
        console.error('Error fetching Jikan movies:', error);
        return [];
    }
}
const ANILIST_MOVIES_QUERY = `
  query {
    Page(perPage: 50) {
      media(type: MOVIE, sort: POPULARITY_DESC) {
        id
        title {
          romaji
          english
          native
        }
        description
        startDate {
          year
          month
          day
        }
        siteUrl
        coverImage {
          large
        }
        studios {
          nodes {
            name
          }
        }
      }
    }
  }
`;
async function fetchAniListMovies() {
    try {
        const res = await fetch(ANILIST_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: ANILIST_MOVIES_QUERY }),
        });
        if (!res.ok)
            throw new Error(`AniList error: ${res.status}`);
        const json = await res.json();
        if (json.errors)
            throw new Error(json.errors[0].message);
        const data = json.data;
        return data.Page.media.map((media) => ({
            title: media.title.romaji || media.title.english || media.title.native,
            content: media.description?.substring(0, 200) || 'Anime Movie',
            source: 'AniList',
            sourceType: 'api',
            url: media.siteUrl,
            publishedAt: media.startDate
                ? new Date(media.startDate.year, media.startDate.month - 1, media.startDate.day).toISOString()
                : undefined,
        }));
    }
    catch (error) {
        console.error('Error fetching AniList movies:', error);
        return [];
    }
}
async function fetchKitsuMovies() {
    try {
        const url = `${KITSU_API}/anime?filter[categories]=movie&sort=-averageRating&page[limit]=50`;
        const res = await fetchWithTimeout(url);
        if (!res.ok)
            throw new Error(`Kitsu error: ${res.status}`);
        const data = await res.json();
        return data.data?.map((anime) => ({
            title: anime.attributes.titles.en_jp || anime.attributes.titles.en,
            content: anime.attributes.synopsis?.substring(0, 200) || `Rating: ${anime.attributes.averageRating}`,
            source: 'Kitsu',
            sourceType: 'api',
            url: `https://kitsu.io/anime/${anime.id}`,
            publishedAt: anime.attributes.startDate,
        })) || [];
    }
    catch (error) {
        console.error('Error fetching Kitsu movies:', error);
        return [];
    }
}
async function fetchAnimeThemesMovies() {
    try {
        const url = `${ANIMETHEMES_API}/anime?filter[year]=${new Date().getFullYear()}&page[limit]=20`;
        const res = await fetchWithTimeout(url);
        if (!res.ok)
            throw new Error(`AnimeThemes error: ${res.status}`);
        const data = await res.json();
        return data.data?.map((entry) => ({
            title: entry.attributes.anime?.name || 'Unknown',
            content: entry.attributes.song?.title || 'Movie OST',
            source: 'AnimeThemes',
            sourceType: 'api',
            url: entry.attributes.anime?.images?.[0]?.link,
            publishedAt: entry.attributes.song?.releasedAt,
        })) || [];
    }
    catch (error) {
        console.error('Error fetching AnimeThemes:', error);
        return [];
    }
}
async function fetchTraktMovies() {
    if (!TRAKT_KEY)
        return [];
    try {
        const url = `${TRAKT_API}/movies/collected/all/time_period/all?extended=full`;
        const res = await fetchWithTimeout(url, 15000);
        if (!res.ok)
            throw new Error(`Trakt error: ${res.status}`);
        const data = await res.json();
        const animeMovies = (data || []).filter((movie) => movie.genres?.some((g) => ['anime', 'animation', 'japanese'].includes(g.toLowerCase())));
        return animeMovies.slice(0, 50).map((movie) => ({
            title: movie.title,
            content: movie.overview?.substring(0, 200) || `Rating: ${movie.rating}`,
            source: 'Trakt',
            sourceType: 'api',
            url: `https://trakt.tv/movies/${movie.ids?.slug}`,
            publishedAt: movie.released,
        }));
    }
    catch (error) {
        console.error('Error fetching Trakt movies:', error);
        return [];
    }
}
async function fetchLetterboxdRss() {
    const feeds = [
        'https://letterboxd.com/data/films/rss/ghibli/',
        'https://letterboxd.com/data/films/rss/popular/',
        'https://letterboxd.com/data/films/rss/animators/hayao-miyazaki/',
    ];
    try {
        const results = await Promise.all(feeds.slice(0, 1).map(async (feedUrl) => {
            try {
                const res = await fetchWithTimeout(feedUrl);
                if (!res.ok)
                    return [];
                const xml = await res.text();
                const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
                return items.slice(0, 10).map((item) => {
                    const getTag = (tag) => {
                        const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
                        return match ? match[1].trim() : '';
                    };
                    return {
                        title: getTag('title'),
                        content: getTag('description')?.replace(/<[^>]+>/g, '').substring(0, 200),
                        source: 'Letterboxd',
                        sourceType: 'rss',
                        url: getTag('link'),
                        publishedAt: getTag('pubDate'),
                    };
                });
            }
            catch {
                return [];
            }
        }));
        return results.flat();
    }
    catch (error) {
        console.error('Error fetching Letterboxd:', error);
        return [];
    }
}
async function fetchAnnictRss() {
    try {
        const url = 'https://annict.com/works?locale=en';
        const res = await fetchWithTimeout(url);
        if (!res.ok)
            throw new Error(`Annict error: ${res.status}`);
        const html = await res.text();
        const titleMatch = html.match(/<span[^>]*class="work-title"[^>]*>([^<]+)<\/span>/g);
        if (!titleMatch)
            return [];
        return titleMatch.slice(0, 20).map((title) => ({
            title: title.replace(/<[^>]+>/g, ''),
            content: 'Anime Movie via Annict',
            source: 'Annict',
            sourceType: 'site',
            url: 'https://annict.com/works?locale=en&work[season_year]=2025&work[media]=movie',
        }));
    }
    catch (error) {
        console.error('Error fetching Annict:', error);
        return [];
    }
}
const JAPANESE_CINEMA_RSS = [
    { name: 'eiga.com', url: 'https://eiga.com/feed/' },
    { name: 'cinematoday', url: 'https://cinematoday.jp/page/new_movies/' },
];
async function fetchJapaneseCinema() {
    try {
        const res = await fetchWithTimeout(JAPANESE_CINEMA_RSS[0].url);
        if (!res.ok)
            throw new Error(`Japanese cinema error: ${res.status}`);
        const html = await res.text();
        const titleMatch = html.match(/<a[^>]*class="entry-title"[^>]*>([^<]+)<\/a>/g);
        if (!titleMatch)
            return [];
        return titleMatch.slice(0, 15).map((title) => ({
            title: title.replace(/<[^>]+>/g, ''),
            content: 'Japanese Cinema Release',
            source: 'eiga.com',
            sourceType: 'site',
        }));
    }
    catch (error) {
        console.error('Error fetching Japanese cinema:', error);
        return [];
    }
}
async function fetchFromAPI(api) {
    try {
        if (api.url.includes('themoviedb.org') || api.url.includes('tmdb')) {
            return tmbdDiscoverMovies();
        }
        if (api.url.includes('omdbapi.com')) {
            return fetchOMDb('anime movie');
        }
        if (api.url.includes('jikan.moe')) {
            return fetchJikanMovies();
        }
        if (api.url.includes('anilist.co')) {
            return fetchAniListMovies();
        }
        if (api.url.includes('kitsu.io')) {
            return fetchKitsuMovies();
        }
        if (api.url.includes('animethemes.moe')) {
            return fetchAnimeThemesMovies();
        }
        if (api.url.includes('trakt.tv')) {
            return fetchTraktMovies();
        }
        return [];
    }
    catch (error) {
        console.error(`Error fetching from API ${api.name}:`, error);
        return [];
    }
}
async function fetchRSS(rss) {
    if (!rss.url)
        return [];
    return crawlRSS(rss.url);
}
async function fetchSite(site) {
    if (!site.url)
        return [];
    return crawlSite(site.url);
}
export async function crawlFilms() {
    const sources = getFilmSources();
    const results = await Promise.all([
        ...sources.apis.map(api => fetchFromAPI(api)),
        ...sources.rss.map(rss => fetchRSS(rss)),
        ...sources.sites.map(site => fetchSite(site)),
    ]);
    return results.flat();
}
export async function crawlFilmsByGenre(genre) {
    if (!TMDB_KEY)
        return crawlFilms();
    try {
        const url = `${TMDB_API}/discover/movie?api_key=${TMDB_KEY}&with_genres=16&with_keywords=${encodeURIComponent(genre)}&language=en-US&page=1`;
        const res = await fetchWithTimeout(url);
        if (!res.ok)
            throw new Error(`TMDB error: ${res.status}`);
        const data = await res.json();
        return data.results?.map((movie) => ({
            title: movie.title,
            content: movie.overview?.substring(0, 200) || `Rating: ${movie.vote_average}/10`,
            source: 'TMDB',
            sourceType: 'api',
            url: `https://www.themoviedb.org/movie/${movie.id}`,
            publishedAt: movie.release_date,
        })) || [];
    }
    catch (error) {
        console.error('Error fetching films by genre:', error);
        return [];
    }
}
export async function crawlGhibliFilms() {
    const ghibliQueries = ['studio ghibli', ' Hayao Miyazaki', 'Ghibli', 'Isao Takahata'];
    const results = await Promise.all([
        tmdbSearchAnimeMovies('studio ghibli'),
        fetchOMDb('studio ghibli'),
        fetchJikanMovies(),
    ]);
    const ghibliFiltered = results.flat().filter(item => item.title.toLowerCase().includes('ghibli') ||
        item.title.toLowerCase().includes('miyazaki') ||
        item.content.toLowerCase().includes('ghibli'));
    const uniqueMap = new Map();
    for (const item of ghibliFiltered) {
        uniqueMap.set(item.title.toLowerCase(), item);
    }
    return Array.from(uniqueMap.values());
}
export async function crawlAnimeFilms2024() {
    const year = 2024;
    const queries = [
        `${year} anime movie`,
        `anime film ${year}`,
        'japanese animation film',
    ];
    const [tmbd, omdb, anilist] = await Promise.all([
        tmdbSearchAnimeMovies(`${year} anime`),
        fetchOMDb(`anime movie ${year}`),
        fetchAniListMovies(),
    ]);
    const filtered = [...tmbd, ...omdb, ...anilist].filter(item => item.publishedAt?.startsWith(String(year)) ||
        item.title.toLowerCase().includes(`${year}`));
    return filtered;
}
