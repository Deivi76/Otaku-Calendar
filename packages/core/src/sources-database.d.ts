export declare const SOURCES_DATABASE: {
    apis: {
        priority1: {
            name: string;
            url: string;
            reliability: number;
        }[];
        priority2: {
            name: string;
            url: string;
            reliability: number;
        }[];
        priority3: {
            name: string;
            url: string;
            reliability: number;
        }[];
    };
    rss: {
        group1: {
            name: string;
            url: string;
            reliability: number;
        }[];
        group2: {
            name: string;
            url: string;
            reliability: number;
        }[];
    };
    sites: {
        group1: {
            name: string;
            url: string;
            reliability: number;
        }[];
        group2: {
            name: string;
            url: string;
            reliability: number;
        }[];
    };
    social: {
        group1: ({
            name: string;
            handle: string;
            reliability: number;
            url?: undefined;
            invite?: undefined;
        } | {
            name: string;
            url: string;
            reliability: number;
            handle?: undefined;
            invite?: undefined;
        } | {
            name: string;
            invite: string;
            reliability: number;
            handle?: undefined;
            url?: undefined;
        })[];
        group2: ({
            name: string;
            handle: string;
            reliability: number;
            url?: undefined;
            invite?: undefined;
        } | {
            name: string;
            url: string;
            reliability: number;
            handle?: undefined;
            invite?: undefined;
        } | {
            name: string;
            invite: string;
            reliability: number;
            handle?: undefined;
            url?: undefined;
        })[];
    };
};
export type SourceType = 'api' | 'rss' | 'site' | 'social';
export type ApiPriority = 'priority1' | 'priority2' | 'priority3';
export type RssGroup = 'group1' | 'group2';
export type SitesGroup = 'group1' | 'group2';
export type SocialGroup = 'group1' | 'group2';
export interface ApiSource {
    name: string;
    url: string;
    reliability: number;
}
export interface RssSource {
    name: string;
    url: string;
    reliability: number;
}
export interface SiteSource {
    name: string;
    url: string;
    reliability: number;
}
export interface SocialSourceWithHandle {
    name: string;
    handle: string;
    reliability: number;
}
export interface SocialSourceWithUrl {
    name: string;
    url: string;
    reliability: number;
}
export interface SocialSourceWithInvite {
    name: string;
    invite: string;
    reliability: number;
}
export type SocialSource = SocialSourceWithHandle | SocialSourceWithUrl | SocialSourceWithInvite;
export type ApiSources = Record<ApiPriority, ApiSource[]>;
export type RssSources = Record<RssGroup, RssSource[]>;
export type SiteSources = Record<SitesGroup, SiteSource[]>;
export type SocialSources = Record<SocialGroup, SocialSource[]>;
export interface SourcesDatabase {
    apis: ApiSources;
    rss: RssSources;
    sites: SiteSources;
    social: SocialSources;
}
export declare function getReliabilityTierInfo(reliability: number): string;
export declare function getSourcesByTypeAndGroup(type: SourceType, group: ApiPriority | RssGroup | SitesGroup | SocialGroup): ApiSource[] | RssSource[] | SiteSource[] | SocialSource[];
export declare function getAllSources(): Array<{
    type: SourceType;
    group: string;
    source: ApiSource | RssSource | SiteSource | SocialSource;
}>;
export declare function getTotalSourceCount(): number;
export type Source = ApiSource | RssSource | SiteSource | SocialSource;
//# sourceMappingURL=sources-database.d.ts.map