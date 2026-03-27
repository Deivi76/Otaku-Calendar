import * as cheerio from 'cheerio';
import { getLiveActionSources } from './manager';
async function fetchWithTimeout(url, timeout = 15000) {
    return fetch(url, {
        signal: AbortSignal.timeout(timeout),
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/html, application/xml',
            'Accept-Language': 'en-US,en;q=0.9,ko;q=0.8,zh;q=0.7,ja;q=0.6',
        },
    });
}
async function fetchFromAPI(source) {
    try {
        const response = await fetchWithTimeout(source.url);
        if (source.name.includes('jikan')) {
            const data = await response.json();
            const items = [];
            if (data.data) {
                data.data.forEach((anime) => {
                    items.push({
                        title: anime.title_english || anime.title,
                        content: anime.synopsis?.substring(0, 200) || `Source: ${source.name}`,
                        source: source.name,
                        sourceType: 'api',
                        url: anime.url,
                    });
                });
            }
            return items.slice(0, 20);
        }
        return [];
    }
    catch (error) {
        console.error(`Error fetching from API ${source.name}:`, error);
        return [];
    }
}
async function fetchFromSite(source) {
    try {
        const html = await fetchWithTimeout(source.url).then(r => r.text());
        const $ = cheerio.load(html);
        const items = [];
        $('[class*="box"], .dramalist-item, article, [class*="drama"], [class*="series"], .video-item, [class*="content-item"], .video-card, .title-card, [class*="tile], [class*="card"]').each((_, el) => {
            const title = $(el).find('h2, h3, h4, .title, [class*="title"]').first().text().trim();
            const link = $(el).find('a').attr('href');
            const genre = $(el).find('.genre, [class*="genre"]').first().text().trim();
            const rating = $(el).find('.rating, [class*="rating"]').first().text().trim();
            const summary = $(el).find('p, .summary, .excerpt').first().text().trim();
            if (title && link) {
                const fullUrl = link.startsWith('http') ? link : `${new URL(source.url).origin}${link}`;
                items.push({
                    title,
                    content: summary || genre || rating ? `Genre: ${genre || 'N/A'} | Rating: ${rating || 'N/A'} | Source: ${source.name}`.trim() : `Source: ${source.name}`,
                    source: source.name,
                    sourceType: 'site',
                    url: fullUrl,
                });
            }
        });
        return items.slice(0, 15);
    }
    catch (error) {
        console.error(`Error fetching from site ${source.name}:`, error);
        return [];
    }
}
async function fetchFromRSS(source) {
    try {
        const response = await fetchWithTimeout(source.url);
        const xml = await response.text();
        const $ = cheerio.load(xml, { xmlMode: true });
        const items = [];
        $('item').each((_, el) => {
            const title = $(el).find('title').first().text().trim();
            const link = $(el).find('link').first().text().trim();
            const description = $(el).find('description').first().text().trim();
            const pubDate = $(el).find('pubDate').first().text().trim();
            if (title && link) {
                items.push({
                    title,
                    content: description || `Source: ${source.name}`,
                    source: source.name,
                    sourceType: 'rss',
                    url: link,
                    publishedAt: pubDate,
                });
            }
        });
        return items.slice(0, 20);
    }
    catch (error) {
        console.error(`Error fetching from RSS ${source.name}:`, error);
        return [];
    }
}
export async function crawlLiveActions() {
    const sources = getLiveActionSources();
    const fetchPromises = [];
    for (const api of sources.apis) {
        fetchPromises.push(fetchFromAPI(api));
    }
    for (const site of sources.sites) {
        fetchPromises.push(fetchFromSite(site));
    }
    for (const rss of sources.rss) {
        fetchPromises.push(fetchFromRSS(rss));
    }
    const results = await Promise.allSettled(fetchPromises);
    const allItems = [];
    const sourceNames = [
        ...sources.apis.map(s => s.name),
        ...sources.sites.map(s => s.name),
        ...sources.rss.map(s => s.name),
    ];
    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            allItems.push(...result.value);
        }
        else {
            console.warn(`Failed to fetch from ${sourceNames[index]}:`, result.reason);
        }
    });
    return allItems;
}
