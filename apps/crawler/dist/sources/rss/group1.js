import { crawlRSS } from '../rss';
import { getSourcesByTypeAndGroup } from '../manager';
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
    const allNewsSources = getSourcesByTypeAndGroup('rss', 'group1');
    const results = await Promise.all(allNewsSources.slice(0, 50).map(source => fetchRSS(source)));
    return results.flat();
}
