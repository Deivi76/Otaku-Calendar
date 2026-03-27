import { SOURCES_DATABASE } from '@otaku-calendar/core';
function convertToSourceConfig(sources, type, category) {
    return sources.map((source) => ({
        name: source.name,
        url: source.url || '',
        type,
        category,
        reliability: source.reliability,
    }));
}
function getAllSourcesByType(type) {
    const sources = [];
    if (type === 'api') {
        for (const [category, sourcesList] of Object.entries(SOURCES_DATABASE.apis)) {
            sources.push(...convertToSourceConfig(sourcesList, 'api', category));
        }
    }
    else if (type === 'rss') {
        for (const [category, sourcesList] of Object.entries(SOURCES_DATABASE.rss)) {
            sources.push(...convertToSourceConfig(sourcesList, 'rss', category));
        }
    }
    else if (type === 'site') {
        for (const [category, sourcesList] of Object.entries(SOURCES_DATABASE.sites)) {
            sources.push(...convertToSourceConfig(sourcesList, 'site', category));
        }
    }
    else if (type === 'social') {
        for (const [category, sourcesList] of Object.entries(SOURCES_DATABASE.social)) {
            sources.push(...convertToSourceConfig(sourcesList, 'social', category));
        }
    }
    return sources;
}
export function getSourcesByType(type) {
    return getAllSourcesByType(type);
}
export function getSourcesByTypeAndCategory(type, category) {
    if (type === 'api' && category in SOURCES_DATABASE.apis) {
        return convertToSourceConfig(SOURCES_DATABASE.apis[category], 'api', category);
    }
    if (type === 'rss' && category in SOURCES_DATABASE.rss) {
        return convertToSourceConfig(SOURCES_DATABASE.rss[category], 'rss', category);
    }
    if (type === 'site' && category in SOURCES_DATABASE.sites) {
        return convertToSourceConfig(SOURCES_DATABASE.sites[category], 'site', category);
    }
    if (type === 'social' && category in SOURCES_DATABASE.social) {
        return convertToSourceConfig(SOURCES_DATABASE.social[category], 'social', category);
    }
    return [];
}
export function getRSSSources() {
    return getAllSourcesByType('rss');
}
export function getSourcesByReliability(minReliability) {
    const allSources = [
        ...getAllSourcesByType('api'),
        ...getAllSourcesByType('rss'),
        ...getAllSourcesByType('site'),
        ...getAllSourcesByType('social'),
    ];
    return allSources.filter((source) => source.reliability >= minReliability);
}
export function getSourcesByCategory(category) {
    const sources = [];
    if (category in SOURCES_DATABASE.apis) {
        sources.push(...convertToSourceConfig(SOURCES_DATABASE.apis[category], 'api', category));
    }
    if (category in SOURCES_DATABASE.rss) {
        sources.push(...convertToSourceConfig(SOURCES_DATABASE.rss[category], 'rss', category));
    }
    if (category in SOURCES_DATABASE.sites) {
        sources.push(...convertToSourceConfig(SOURCES_DATABASE.sites[category], 'site', category));
    }
    if (category in SOURCES_DATABASE.social) {
        sources.push(...convertToSourceConfig(SOURCES_DATABASE.social[category], 'social', category));
    }
    return sources;
}
export function getAnimeSources() {
    return {
        apis: getSourcesByTypeAndCategory('api', 'anime'),
        rss: getSourcesByTypeAndCategory('rss', 'anime'),
        sites: getSourcesByTypeAndCategory('site', 'anime'),
        social: getSourcesByTypeAndCategory('social', 'anime'),
    };
}
export function getMangaSources() {
    return {
        apis: getSourcesByTypeAndCategory('api', 'manga'),
        rss: getSourcesByTypeAndCategory('rss', 'manga'),
        sites: getSourcesByTypeAndCategory('site', 'manga'),
        social: getSourcesByTypeAndCategory('social', 'manga'),
    };
}
export function getManhwaSources() {
    return {
        apis: getSourcesByTypeAndCategory('api', 'manhwa'),
        rss: getSourcesByTypeAndCategory('rss', 'manhwa'),
        sites: getSourcesByTypeAndCategory('site', 'manhwa'),
        social: getSourcesByTypeAndCategory('social', 'manhwa'),
    };
}
export function getFilmSources() {
    return {
        apis: getSourcesByTypeAndCategory('api', 'film'),
        rss: getSourcesByTypeAndCategory('rss', 'film'),
        sites: getSourcesByTypeAndCategory('site', 'film'),
        social: getSourcesByTypeAndCategory('social', 'film'),
    };
}
export function getSeriesSources() {
    return {
        apis: getSourcesByTypeAndCategory('api', 'series'),
        rss: getSourcesByTypeAndCategory('rss', 'series'),
        sites: getSourcesByTypeAndCategory('site', 'series'),
        social: getSourcesByTypeAndCategory('social', 'series'),
    };
}
export function getLiveActionSources() {
    return {
        apis: getSourcesByTypeAndCategory('api', 'liveAction'),
        rss: getSourcesByTypeAndCategory('rss', 'liveAction'),
        sites: getSourcesByTypeAndCategory('site', 'liveAction'),
        social: getSourcesByTypeAndCategory('social', 'liveAction'),
    };
}
export function getChineseSources() {
    return {
        apis: getSourcesByTypeAndCategory('api', 'chinese'),
        rss: getSourcesByTypeAndCategory('rss', 'chinese'),
        sites: getSourcesByTypeAndCategory('site', 'chinese'),
        social: getSourcesByTypeAndCategory('social', 'chinese'),
    };
}
export function getJapaneseSources() {
    return {
        apis: getSourcesByTypeAndCategory('api', 'japanese'),
        rss: getSourcesByTypeAndCategory('rss', 'japanese'),
        sites: getSourcesByTypeAndCategory('site', 'japanese'),
        social: getSourcesByTypeAndCategory('social', 'japanese'),
    };
}
export function getRumorsSources() {
    return {
        apis: [],
        rss: getSourcesByTypeAndCategory('rss', 'rumors'),
        sites: getSourcesByTypeAndCategory('site', 'rumors'),
        social: getSourcesByTypeAndCategory('social', 'rumors'),
    };
}
