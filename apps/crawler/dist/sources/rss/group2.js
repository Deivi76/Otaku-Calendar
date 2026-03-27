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
export async function crawlRSS_Group2() {
    const allSources = getSourcesByTypeAndGroup('rss', 'group2');
    const results = await Promise.all(allSources.map(source => fetchRSS(source)));
    return results.flat();
}
