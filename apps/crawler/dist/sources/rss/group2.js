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
export async function crawlRSS_Group2() {
    const mangaSources = getSourcesByTypeAndCategory('rss', 'manga');
    const communitySources = getSourcesByTypeAndCategory('rss', 'community');
    const scanlationSources = getSourcesByTypeAndCategory('rss', 'scanlation');
    const allSources = [...mangaSources, ...communitySources, ...scanlationSources];
    const filteredSources = allSources
        .filter(source => source.reliability >= 0.6);
    const results = await Promise.all(filteredSources.map(source => fetchRSS(source)));
    return results.flat();
}
