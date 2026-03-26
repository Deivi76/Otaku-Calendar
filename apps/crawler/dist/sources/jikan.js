const JIKAN_API = process.env.JIKAN_API || 'https://api.jikan.moe/v4';
export async function fetchSchedule() {
    try {
        const res = await fetch(`${JIKAN_API}/schedules`, {
            signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) {
            throw new Error(`Jikan API error: ${res.status}`);
        }
        const data = await res.json();
        return data.data?.map((anime) => ({
            title: anime.title || anime.title_japanese,
            content: `Episode ${anime.episodes?.[0]?.episode || 'TBA'}`,
            source: JIKAN_API,
            sourceType: 'api',
            url: anime.url,
            publishedAt: anime.episodes?.[0]?.aired,
        })) || [];
    }
    catch (error) {
        console.error('Error fetching schedule from Jikan:', error);
        return [];
    }
}
export async function fetchTopAnime() {
    try {
        const res = await fetch(`${JIKAN_API}/top/anime?limit=25`, {
            signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) {
            throw new Error(`Jikan API error: ${res.status}`);
        }
        const data = await res.json();
        return data.data?.map((anime) => ({
            title: anime.title || anime.title_japanese,
            content: `Score: ${anime.score || 'N/A'}`,
            source: JIKAN_API,
            sourceType: 'api',
            url: anime.url,
            publishedAt: anime.aired?.from,
        })) || [];
    }
    catch (error) {
        console.error('Error fetching top anime from Jikan:', error);
        return [];
    }
}
export async function fetchSeasonNow() {
    try {
        const res = await fetch(`${JIKAN_API}/seasons/now?limit=50`, {
            signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) {
            throw new Error(`Jikan API error: ${res.status}`);
        }
        const data = await res.json();
        return data.data?.map((anime) => ({
            title: anime.title || anime.title_japanese,
            content: anime.synopsis?.substring(0, 200) || 'Currently airing',
            source: JIKAN_API,
            sourceType: 'api',
            url: anime.url,
            publishedAt: anime.aired?.from,
        })) || [];
    }
    catch (error) {
        console.error('Error fetching season from Jikan:', error);
        return [];
    }
}
export async function crawlJikan() {
    const [schedule, top, season] = await Promise.all([
        fetchSchedule(),
        fetchTopAnime(),
        fetchSeasonNow(),
    ]);
    return [...schedule, ...top, ...season];
}
