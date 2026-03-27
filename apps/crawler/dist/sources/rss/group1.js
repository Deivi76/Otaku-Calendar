import { crawlRSS } from '../rss';
import { getSourcesByTypeAndCategory } from '../manager';
async function fetchRSS(source) {
    if (!source.url)
        return [];
    try {
        return await crawlRSS(source.url);
    }
    catch (error) {
        console.error(`Error crawling RSS ${source.name}:`, error);
        return [];
    }
}
export async function crawlRSS_Group1() {
    const allNewsSources = getSourcesByTypeAndCategory('rss', 'news');
    const filteredSources = allNewsSources
        .filter(source => source.reliability >= 0.7)
        .slice(0, 50);
    const results = await Promise.all(filteredSources.map(source => fetchRSS(source)));
    return results.flat();
}
