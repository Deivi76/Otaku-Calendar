import { getSeriesSources } from './manager';
async function fetchFromAPI(source, endpoint, options) {
    try {
        const res = await fetch(`${source.url}${endpoint}`, {
            ...options,
            signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) {
            throw new Error(`${source.name} API error: ${res.status}`);
        }
        return [];
    }
    catch (error) {
        console.error(`Error fetching from ${source.name}:`, error);
        return [];
    }
}
export async function crawlSeries() {
    const sources = getSeriesSources();
    const results = [];
    for (const api of sources.apis) {
        try {
            if (api.name === 'TVmaze') {
                const data = await fetchFromAPI(api, '/shows?page=1');
                if (data.length > 0)
                    results.push(...data);
            }
            else if (api.name === 'Trakt') {
                const showsRes = await fetch(`${api.url}/shows/popular?limit=25`, {
                    headers: {
                        'Content-Type': 'application/json',
                        'trakt-api-key': process.env.TRAKT_CLIENT_ID || '',
                        'trakt-api-version': '2',
                    },
                    signal: AbortSignal.timeout(10000),
                });
                if (showsRes.ok) {
                    const shows = (await showsRes.json());
                    results.push(...shows.map((s) => ({
                        title: s.title,
                        content: `${s.year} - ${s.overview?.substring(0, 150) || 'TV Series'}`,
                        source: api.name,
                        sourceType: 'api',
                        url: s.ids?.trakt ? `https://trakt.tv/shows/${s.ids.trakt}` : undefined,
                        publishedAt: s.first_aired,
                    })));
                }
            }
            else if (api.name === 'TMDB TV') {
                const apiKey = process.env.TMDB_API_KEY;
                if (apiKey) {
                    const res = await fetch(`${api.url}/popular?api_key=${apiKey}&language=en-US&page=1`, {
                        signal: AbortSignal.timeout(10000),
                    });
                    if (res.ok) {
                        const data = (await res.json());
                        results.push(...(data.results || []).slice(0, 25).map((show) => ({
                            title: show.name,
                            content: show.overview?.substring(0, 200) || 'TV Series',
                            source: api.name,
                            sourceType: 'api',
                            url: `https://www.themoviedb.org/tv/${show.id}`,
                            publishedAt: show.first_air_date,
                        })));
                    }
                }
            }
            else if (api.name === 'MyDramaList') {
                const res = await fetch(`${api.url}/shows`, {
                    signal: AbortSignal.timeout(10000),
                });
                if (res.ok) {
                    const data = (await res.json());
                    results.push(...(data || []).slice(0, 20).map((drama) => ({
                        title: drama.title || drama.original_title,
                        content: drama.synopsis?.substring(0, 200) || 'Asian Drama',
                        source: api.name,
                        sourceType: 'api',
                        url: drama.url,
                        publishedAt: drama.year,
                    })));
                }
            }
        }
        catch (error) {
            console.error(`Error fetching from API ${api.name}:`, error);
        }
    }
    const Parser = (await import('rss-parser')).default;
    const parser = new Parser({ timeout: 30000 });
    for (const rss of sources.rss) {
        try {
            const feed = await parser.parseURL(rss.url);
            const items = feed.items.slice(0, 10).map(item => ({
                title: item.title || '',
                content: item.contentSnippet || item.content || '',
                source: rss.name,
                sourceType: 'rss',
                url: item.link,
                publishedAt: item.pubDate,
            }));
            results.push(...items);
        }
        catch (error) {
            console.error(`Error crawling RSS ${rss.name}:`, error);
        }
    }
    return results;
}
