import { SOURCES_DATABASE } from '@otaku-calendar/core';
function convertToSourceConfig(sources, type, category) {
    return sources.map((source) => {
        let url = '';
        if ('url' in source && source.url) {
            url = source.url;
        }
        else if ('handle' in source && source.handle) {
            url = `https://twitter.com/${source.handle}`;
        }
        else if ('invite' in source && source.invite) {
            url = `https://discord.gg/${source.invite}`;
        }
        return {
            name: source.name,
            url,
            type,
            category,
            reliability: source.reliability,
        };
    });
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
export function getSourcesByTypeAndGroup(type, group) {
    if (type === 'api' && group in SOURCES_DATABASE.apis) {
        return convertToSourceConfig(SOURCES_DATABASE.apis[group], 'api', group);
    }
    if (type === 'rss' && group in SOURCES_DATABASE.rss) {
        return convertToSourceConfig(SOURCES_DATABASE.rss[group], 'rss', group);
    }
    if (type === 'site' && group in SOURCES_DATABASE.sites) {
        return convertToSourceConfig(SOURCES_DATABASE.sites[group], 'site', group);
    }
    if (type === 'social' && group in SOURCES_DATABASE.social) {
        return convertToSourceConfig(SOURCES_DATABASE.social[group], 'social', group);
    }
    return [];
}
export function getSourcesByTypeAndCategory(type, category) {
    return getSourcesByTypeAndGroup(type, category);
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
export function getHighPrioritySources() {
    return {
        apis: getSourcesByTypeAndGroup('api', 'priority1'),
        rss: getSourcesByTypeAndGroup('rss', 'group1'),
        sites: getSourcesByTypeAndGroup('site', 'group1'),
        social: getSourcesByTypeAndGroup('social', 'group1'),
    };
}
export function getMediumPrioritySources() {
    return {
        apis: getSourcesByTypeAndGroup('api', 'priority2'),
        rss: getSourcesByTypeAndGroup('rss', 'group2'),
        sites: getSourcesByTypeAndGroup('site', 'group2'),
        social: getSourcesByTypeAndGroup('social', 'group2'),
    };
}
export function getAllAPISources() {
    return getSourcesByType('api');
}
export function getAllRSSSources() {
    return getSourcesByType('rss');
}
export function getAllSiteSources() {
    return getSourcesByType('site');
}
export function getAllSocialSources() {
    return getSourcesByType('social');
}
export function getSourcesByMinimumReliability(type, minReliability) {
    const sources = getSourcesByType(type);
    return sources.filter(source => source.reliability >= minReliability);
}
export function getAPISourcesByPriority(priority) {
    return getSourcesByTypeAndGroup('api', priority);
}
export function getSourcesByGroup(type, group) {
    return getSourcesByTypeAndGroup(type, group);
}
