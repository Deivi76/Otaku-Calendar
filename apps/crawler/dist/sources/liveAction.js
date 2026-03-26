import * as cheerio from 'cheerio';
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
export async function fetchMyDramaList() {
    try {
        const html = await fetchWithTimeout('https://www.mydramalist.com').then(r => r.text());
        const $ = cheerio.load(html);
        const items = [];
        $('[class*="box"], .dramalist-item, article').each((_, el) => {
            const title = $(el).find('h3, h4, .title, [class*="title"]').first().text().trim();
            const link = $(el).find('a').attr('href');
            const genre = $(el).find('.genre, [class*="genre"]').first().text().trim();
            const rating = $(el).find('.rating, [class*="rating"]').first().text().trim();
            if (title && link && link.includes('mydramalist.com')) {
                items.push({
                    title,
                    content: `Genre: ${genre || 'Drama'} | Rating: ${rating || 'N/A'} | Source: MyDramaList`.trim(),
                    source: 'mydramalist.com',
                    sourceType: 'site',
                    url: link.startsWith('http') ? link : `https://www.mydramalist.com${link}`,
                });
            }
        });
        return items.slice(0, 20);
    }
    catch (error) {
        console.error('Error fetching MyDramaList:', error);
        return [];
    }
}
export async function fetchKoreanDrama() {
    try {
        const html = await fetchWithTimeout('https://www.koreandrama.org').then(r => r.text());
        const $ = cheerio.load(html);
        const items = [];
        $('article, .drama-item, [class*="drama"]').each((_, el) => {
            const title = $(el).find('h2, h3, h4, .title').first().text().trim();
            const link = $(el).find('a').attr('href');
            if (title && link) {
                items.push({
                    title,
                    content: 'Source: KoreanDrama.org',
                    source: 'koreandrama.org',
                    sourceType: 'site',
                    url: link.startsWith('http') ? link : `https://www.koreandrama.org${link}`,
                });
            }
        });
        return items.slice(0, 15);
    }
    catch (error) {
        console.error('Error fetching KoreanDrama:', error);
        return [];
    }
}
export async function fetchKoreanDramaInfo() {
    try {
        const apiUrl = 'https://www.koreandrama.org/api/dramas?limit=20';
        const response = await fetchWithTimeout(apiUrl);
        const data = await response.json();
        const items = [];
        if (Array.isArray(data)) {
            data.forEach((drama) => {
                items.push({
                    title: drama.title,
                    content: drama.synopsis || 'Source: KoreanDrama.org API',
                    source: 'koreandrama.org',
                    sourceType: 'api',
                    url: `https://www.koreandrama.org${drama.url}`,
                });
            });
        }
        return items.slice(0, 20);
    }
    catch (error) {
        console.error('Error fetching KoreanDrama API:', error);
        return [];
    }
}
export async function fetchANNLiveAction() {
    try {
        const html = await fetchWithTimeout('https://www.animenewsnetwork.com/all/?topic=live-action').then(r => r.text());
        const $ = cheerio.load(html);
        const items = [];
        $('div[class*="story"], article, .live-action-item').each((_, el) => {
            const title = $(el).find('h3, h4, .title').first().text().trim();
            const link = $(el).find('a').attr('href');
            const summary = $(el).find('p, .summary').first().text().trim();
            if (title && link) {
                items.push({
                    title,
                    content: summary || 'Source: ANN Live-Action',
                    source: 'animenewsnetwork.com',
                    sourceType: 'site',
                    url: link.startsWith('http') ? link : `https://www.animenewsnetwork.com${link}`,
                });
            }
        });
        return items.slice(0, 15);
    }
    catch (error) {
        console.error('Error fetching ANN Live-Action:', error);
        return [];
    }
}
export async function fetchJikanLiveAction() {
    try {
        const response = await fetchWithTimeout('https://api.jikan.moe/v4/anime?topic=live-action&limit=20');
        const data = await response.json();
        const items = [];
        if (data.data) {
            data.data.forEach((anime) => {
                items.push({
                    title: anime.title_english || anime.title,
                    content: anime.synopsis?.substring(0, 200) || 'Source: Jikan API (Live-Action)',
                    source: 'api.jikan.moe',
                    sourceType: 'api',
                    url: anime.url,
                });
            });
        }
        return items.slice(0, 20);
    }
    catch (error) {
        console.error('Error fetching Jikan Live-Action:', error);
        return [];
    }
}
export async function fetchAniListLiveAction() {
    try {
        const query = `
      query {
        Page(perPage: 20, mediaType: ANIME, format: TV) {
          media(source: MANGA, status: RELEASING) {
            id
            title {
              romaji
              english
              native
            }
            siteUrl
          }
        }
      }
    `;
        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
        });
        const json = await response.json();
        const items = [];
        if (json.data?.Page?.media) {
            json.data.Page.media.forEach((media) => {
                items.push({
                    title: media.title.english || media.title.romaji,
                    content: 'Source: AniList (Manga adaptation - Live Action potential)',
                    source: 'graphql.anilist.co',
                    sourceType: 'api',
                    url: media.siteUrl,
                });
            });
        }
        return items.slice(0, 20);
    }
    catch (error) {
        console.error('Error fetching AniList Live-Action:', error);
        return [];
    }
}
export async function fetchViki() {
    try {
        const html = await fetchWithTimeout('https://www.viki.com/explore').then(r => r.text());
        const $ = cheerio.load(html);
        const items = [];
        $('[class*="drama"], [class*="series"], .video-item').each((_, el) => {
            const title = $(el).find('h3, h4, .title').first().text().trim();
            const link = $(el).find('a').attr('href');
            if (title && link) {
                items.push({
                    title,
                    content: 'Source: Viki (Rakuten Viki)',
                    source: 'viki.com',
                    sourceType: 'site',
                    url: link.startsWith('http') ? link : `https://www.viki.com${link}`,
                });
            }
        });
        return items.slice(0, 15);
    }
    catch (error) {
        console.error('Error fetching Viki:', error);
        return [];
    }
}
export async function fetchViu() {
    try {
        const html = await fetchWithTimeout('https://www.viu.com/ott/sg/en-us/k-drama/').then(r => r.text());
        const $ = cheerio.load(html);
        const items = [];
        $('[class*="drama"], [class*="content-item"], .video-card').each((_, el) => {
            const title = $(el).find('h3, h4, .title, [class*="title"]').first().text().trim();
            const link = $(el).find('a').attr('href');
            if (title && link) {
                items.push({
                    title,
                    content: 'Source: Viu',
                    source: 'viu.com',
                    sourceType: 'site',
                    url: link.startsWith('http') ? link : `https://www.viu.com${link}`,
                });
            }
        });
        return items.slice(0, 15);
    }
    catch (error) {
        console.error('Error fetching Viu:', error);
        return [];
    }
}
export async function fetchKocowa() {
    try {
        const html = await fetchWithTimeout('https://www.kocowa.com/en/content/korean-drama').then(r => r.text());
        const $ = cheerio.load(html);
        const items = [];
        $('[class*="drama"], [class*="content-item"], .title-card').each((_, el) => {
            const title = $(el).find('h3, h4, .title').first().text().trim();
            const link = $(el).find('a').attr('href');
            if (title && link) {
                items.push({
                    title,
                    content: 'Source: KOCOWA',
                    source: 'kocowa.com',
                    sourceType: 'site',
                    url: link.startsWith('http') ? link : `https://www.kocowa.com${link}`,
                });
            }
        });
        return items.slice(0, 15);
    }
    catch (error) {
        console.error('Error fetching KOCOWA:', error);
        return [];
    }
}
export async function fetchSoompi() {
    try {
        const html = await fetchWithTimeout('https://www.soompi.com/k-drama').then(r => r.text());
        const $ = cheerio.load(html);
        const items = [];
        $('article, .drama-item, [class*="drama"]').each((_, el) => {
            const title = $(el).find('h2, h3, h4, .title').first().text().trim();
            const link = $(el).find('a').attr('href');
            const excerpt = $(el).find('p, .excerpt').first().text().trim();
            if (title && link) {
                items.push({
                    title,
                    content: excerpt || 'Source: Soompi',
                    source: 'soompi.com',
                    sourceType: 'site',
                    url: link.startsWith('http') ? link : `https://www.soompi.com${link}`,
                });
            }
        });
        return items.slice(0, 15);
    }
    catch (error) {
        console.error('Error fetching Soompi:', error);
        return [];
    }
}
export async function fetchChineseDrama() {
    try {
        const html = await fetchWithTimeout('https://www.cdramalive.com').then(r => r.text());
        const $ = cheerio.load(html);
        const items = [];
        $('article, .drama-item, [class*="drama"]').each((_, el) => {
            const title = $(el).find('h2, h3, h4, .title').first().text().trim();
            const link = $(el).find('a').attr('href');
            if (title && link) {
                items.push({
                    title,
                    content: 'Source: Chinese Drama',
                    source: 'cdramalive.com',
                    sourceType: 'site',
                    url: link.startsWith('http') ? link : `https://www.cdramalive.com${link}`,
                });
            }
        });
        return items.slice(0, 15);
    }
    catch (error) {
        console.error('Error fetching Chinese Drama:', error);
        return [];
    }
}
export async function fetchJapaneseDrama() {
    try {
        const html = await fetchWithTimeout('https://www.jdramas.com').then(r => r.text());
        const $ = cheerio.load(html);
        const items = [];
        $('article, .drama-item, [class*="drama"]').each((_, el) => {
            const title = $(el).find('h2, h3, h4, .title').first().text().trim();
            const link = $(el).find('a').attr('href');
            if (title && link) {
                items.push({
                    title,
                    content: 'Source: Japanese Drama',
                    source: 'jdramas.com',
                    sourceType: 'site',
                    url: link.startsWith('http') ? link : `https://www.jdramas.com${link}`,
                });
            }
        });
        return items.slice(0, 15);
    }
    catch (error) {
        console.error('Error fetching Japanese Drama:', error);
        return [];
    }
}
export async function fetchTMDBKorean() {
    try {
        const apiKey = process.env.TMDB_API_KEY;
        if (!apiKey) {
            console.warn('TMDB API key not configured');
            return [];
        }
        const response = await fetchWithTimeout(`https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&with_genres=18&language=en-US&page=1`);
        const data = await response.json();
        const items = [];
        if (data.results) {
            data.results.forEach((show) => {
                items.push({
                    title: show.name,
                    content: show.overview?.substring(0, 200) || 'K-Drama from TMDB',
                    source: 'themoviedb.org',
                    sourceType: 'api',
                    url: `https://www.themoviedb.org/tv/${show.id}`,
                    publishedAt: show.first_air_date,
                });
            });
        }
        return items.slice(0, 20);
    }
    catch (error) {
        console.error('Error fetching TMDB Korean:', error);
        return [];
    }
}
export async function fetchDramaFeverAlt() {
    try {
        const html = await fetchWithTimeout('https://www.dramacrazy.io').then(r => r.text());
        const $ = cheerio.load(html);
        const items = [];
        $('article, .drama-item, [class*="drama"]').each((_, el) => {
            const title = $(el).find('h2, h3, h4, .title').first().text().trim();
            const link = $(el).find('a').attr('href');
            if (title && link) {
                items.push({
                    title,
                    content: 'Source: Drama Crazy (DramaFever Alternative)',
                    source: 'dramacrazy.io',
                    sourceType: 'site',
                    url: link.startsWith('http') ? link : `https://www.dramacrazy.io${link}`,
                });
            }
        });
        return items.slice(0, 15);
    }
    catch (error) {
        console.error('Error fetching DramaFever Alternative:', error);
        return [];
    }
}
export async function fetchNetflixKDramas() {
    try {
        const html = await fetchWithTimeout('https://www.netflix.com/browse/genre/67879').then(r => r.text());
        const $ = cheerio.load(html);
        const items = [];
        $('[class*="title-card"], .nm-collections-title-card').each((_, el) => {
            const title = $(el).find('[class*="title"], a').first().text().trim();
            const link = $(el).find('a').attr('href');
            if (title && link) {
                items.push({
                    title,
                    content: 'Source: Netflix K-Drama',
                    source: 'netflix.com',
                    sourceType: 'site',
                    url: link.startsWith('http') ? link : `https://www.netflix.com${link}`,
                });
            }
        });
        return items.slice(0, 15);
    }
    catch (error) {
        console.error('Error fetching Netflix K-Dramas:', error);
        return [];
    }
}
export async function fetchDisneyPlusLiveAction() {
    try {
        const html = await fetchWithTimeout('https://www.disneyplus.com/category/movies').then(r => r.text());
        const $ = cheerio.load(html);
        const items = [];
        $('[class*="card"], .title-card, article').each((_, el) => {
            const title = $(el).find('h3, h4, [class*="title"]').first().text().trim();
            const link = $(el).find('a').attr('href');
            if (title && link) {
                items.push({
                    title,
                    content: 'Source: Disney+ Live Action',
                    source: 'disneyplus.com',
                    sourceType: 'site',
                    url: link.startsWith('http') ? link : `https://www.disneyplus.com${link}`,
                });
            }
        });
        return items.slice(0, 15);
    }
    catch (error) {
        console.error('Error fetching Disney+ Live Action:', error);
        return [];
    }
}
export async function fetchPrimeAsianDrama() {
    try {
        const html = await fetchWithTimeout('https://www.primevideo.com/ref=atv_nb_sr').then(r => r.text());
        const $ = cheerio.load(html);
        const items = [];
        $('[class*="tile"], [class*="card"], .title-card').each((_, el) => {
            const title = $(el).find('h3, h4, [class*="title"]').first().text().trim();
            const link = $(el).find('a').attr('href');
            if (title && link) {
                items.push({
                    title,
                    content: 'Source: Prime Video (Asian Drama)',
                    source: 'primevideo.com',
                    sourceType: 'site',
                    url: link.startsWith('http') ? link : `https://www.primevideo.com${link}`,
                });
            }
        });
        return items.slice(0, 15);
    }
    catch (error) {
        console.error('Error fetching Prime Video Asian Drama:', error);
        return [];
    }
}
export async function crawlLiveActions() {
    const results = await Promise.allSettled([
        fetchMyDramaList(),
        fetchKoreanDrama(),
        fetchKoreanDramaInfo(),
        fetchANNLiveAction(),
        fetchJikanLiveAction(),
        fetchAniListLiveAction(),
        fetchViki(),
        fetchViu(),
        fetchKocowa(),
        fetchSoompi(),
        fetchChineseDrama(),
        fetchJapaneseDrama(),
        fetchTMDBKorean(),
        fetchDramaFeverAlt(),
        fetchNetflixKDramas(),
        fetchDisneyPlusLiveAction(),
        fetchPrimeAsianDrama(),
    ]);
    const allItems = [];
    const sourceNames = [
        'MyDramaList', 'KoreanDrama', 'KoreanDramaInfo', 'ANNLiveAction',
        'JikanLiveAction', 'AniListLiveAction', 'Viki', 'Viu', 'KOCOWA',
        'Soompi', 'ChineseDrama', 'JapaneseDrama', 'TMDBKorean',
        'DramaFeverAlt', 'NetflixKDramas', 'DisneyPlusLiveAction', 'PrimeAsianDrama'
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
