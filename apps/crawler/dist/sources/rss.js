import Parser from 'rss-parser';
const parser = new Parser({
    timeout: 30000,
});
export async function crawlRSS(url) {
    try {
        const feed = await parser.parseURL(url);
        if (!feed.items || feed.items.length === 0) {
            console.warn(`No items found in RSS feed: ${url}`);
            return [];
        }
        const items = feed.items.map(item => ({
            title: item.title || '',
            content: item.contentSnippet || item.content || '',
            source: url,
            sourceType: 'rss',
            url: item.link,
            publishedAt: item.pubDate,
        }));
        return items;
    }
    catch (error) {
        console.error(`Error crawling RSS ${url}:`, error);
        return [];
    }
}
export async function crawlRSSFeeds(urls) {
    const results = await Promise.all(urls.map(url => crawlRSS(url)));
    return results.flat();
}
