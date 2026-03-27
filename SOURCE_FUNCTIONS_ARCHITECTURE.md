# Source Functions Architecture Diagram

## Current Architecture (Type-Based + Groups)

```
SOURCES_DATABASE (packages/core/src/sources-database.ts)
    ├── apis: { anime: [...49], manga: [...], manhwa: [...], ... }
    ├── rss: { news: [...], manga: [...], community: [...], ... }
    ├── sites: { news: [...], databases: [...], manhwa: [...], ... }
    └── social: { twitter: [...], reddit: [...], youtube: [...], ... }
                    
                    ↓
                    
MANAGER (apps/crawler/src/sources/manager.ts)
    │
    ├─ getSourcesByTypeAndCategory(type, category)  ← ACTIVELY USED (54×)
    │   Returns: SourceConfig[]
    │
    ├─ getSourcesByType(type)  ← DEAD CODE
    │   Returns: SourceConfig[]
    │
    ├─ getSourcesByReliability(minReliability)  ← DEAD CODE
    │   Returns: SourceConfig[]
    │
    ├─ getSourcesByCategory(category)  ← DEAD CODE
    │   Returns: SourceConfig[]
    │
    └─ Category-Specific Wrappers  ← DEAD CODE (all unused)
        ├─ getAnimeSources()      → CrawlerSourceConfig
        ├─ getMangaSources()      → CrawlerSourceConfig
        ├─ getManhwaSources()     → CrawlerSourceConfig
        ├─ getFilmSources()       → CrawlerSourceConfig
        ├─ getSeriesSources()     → CrawlerSourceConfig
        ├─ getLiveActionSources() → CrawlerSourceConfig
        ├─ getChineseSources()    → CrawlerSourceConfig
        ├─ getJapaneseSources()   → CrawlerSourceConfig
        └─ getRumorsSources()     → CrawlerSourceConfig
                    
                    ↓
                    
CRAWLER ORCHESTRATOR (apps/crawler/src/index.ts)
    │
    ├─ API CRAWLERS
    │   ├─ crawlAPI_Priority1()
    │   │   └─ Hardcoded: crawlAniList(), crawlJikan(), crawlKitsu()
    │   │
    │   ├─ crawlAPI_Priority2()
    │   │   └─ Hardcoded: fetchTrendingAnime(), fetchTopAnime(), fetchSeasonAnime()
    │   │
    │   └─ crawlAPI_Priority3()
    │       └─ getSourcesByTypeAndCategory('api', 'anime') ← Uses function
    │
    ├─ RSS CRAWLERS
    │   ├─ crawlRSS_Group1()
    │   │   └─ getSourcesByTypeAndCategory('rss', 'news')
    │   │
    │   └─ crawlRSS_Group2()
    │       └─ getSourcesByTypeAndCategory('rss', 'manga')
    │          + getSourcesByTypeAndCategory('rss', 'community')
    │          + getSourcesByTypeAndCategory('rss', 'scanlation')
    │
    ├─ SITES CRAWLERS
    │   ├─ crawlSites_Group1()
    │   │   └─ getSourcesByTypeAndCategory('site', 'news')
    │   │      + getSourcesByTypeAndCategory('site', 'databases')
    │   │
    │   └─ crawlSites_Group2()
    │       └─ getSourcesByTypeAndCategory('site', 'manhwa')
    │          + getSourcesByTypeAndCategory('site', 'streaming')
    │          + getSourcesByTypeAndCategory('site', 'film')
    │          + getSourcesByTypeAndCategory('site', 'liveAction')
    │          + getSourcesByTypeAndCategory('site', 'manga')
    │          + getSourcesByTypeAndCategory('site', 'community')
    │
    └─ SOCIAL CRAWLERS
        ├─ crawlSocial_Group1()
        │   └─ getFilteredSources('twitter')    → getSourcesByTypeAndCategory('social', 'twitter')
        │      getFilteredSources('reddit')     → getSourcesByTypeAndCategory('social', 'reddit')
        │      getFilteredSources('youtube')    → getSourcesByTypeAndCategory('social', 'youtube')
        │
        └─ crawlSocial_Group2()
            └─ getFilteredSources('discord')    → getSourcesByTypeAndCategory('social', 'discord')
               getFilteredSources('tiktok')     → getSourcesByTypeAndCategory('social', 'tiktok')
               getFilteredSources('facebook')   → getSourcesByTypeAndCategory('social', 'facebook')
               getFilteredSources('twitch')     → getSourcesByTypeAndCategory('social', 'twitch')
               getFilteredSources('telegram')   → getSourcesByTypeAndCategory('social', 'telegram')

                    ↓

EXTRACTION & NORMALIZATION
    └─ extractAndClassify() → Converts CrawledItem[] → NormalizedItem[]

                    ↓

DEDUPLICATION
    └─ deduplicate() → Removes duplicates

                    ↓

FINAL OUTPUT
    └─ Array of unique, classified events
```

---

## If Category-Based Architecture Was Used (Currently Unused)

```
SOURCES_DATABASE
        ↓
    MANAGER (proposed usage)
        ├─ getAnimeSources()      → {apis, rss, sites, social}
        ├─ getMangaSources()       → {apis, rss, sites, social}
        ├─ getFilmSources()        → {apis, rss, sites, social}
        ├─ getSeriesSources()      → {apis, rss, sites, social}
        ├─ getLiveActionSources()  → {apis, rss, sites, social}
        └─ getRumorsSources()      → {apis, rss, sites, social}
        
        ↓
    CRAWLER (hypothetical)
        ├─ crawlAnimeSources()     → {apis, rss, sites, social}
        ├─ crawlMangaSources()     → {apis, rss, sites, social}
        ├─ crawlFilmSources()      → {apis, rss, sites, social}
        ├─ crawlSeriesSources()    → {apis, rss, sites, social}
        ├─ crawlLiveActionSources()→ {apis, rss, sites, social}
        └─ crawlRumorsSources()    → {apis, rss, sites, social}
```

This approach is NOT currently used.

---

## Data Flow Example: RSS News Crawling

```
START: crawlRSS_Group1()
    │
    ├─ Call getSourcesByTypeAndCategory('rss', 'news')
    │   └─ Returns: [
    │       { name: 'Anime News Network', url: 'https://animenewsnetwork.com', reliability: 0.85 },
    │       { name: 'MyAnimeList', url: 'https://myanimelist.net', reliability: 0.85 },
    │       ... 50+ more news sources
    │     ]
    │
    ├─ Filter by reliability >= 0.7
    │   └─ Reduces to ~50 high-reliability sources
    │
    ├─ For each source, call fetchRSS(source.url)
    │   └─ Fetches RSS feed, parses XML
    │   └─ Returns: [
    │       { title: '...', content: '...', source: '...', publishedAt: '...' },
    │       ...
    │     ]
    │
    ├─ Combine all results
    │   └─ Returns: CrawledItem[] (hundreds of items)
    │
    └─ Pass to extractAndClassify()
        └─ Converts to NormalizedItem[] with:
            - anime (extracted)
            - type (classified: announcement, release, etc)
            - date (parsed)
            - mediaType (detected: anime, manga, etc)
```

---

## Call Site Map

### Usage of `getSourcesByTypeAndCategory()` - 54 Total Matches

| Location | Line(s) | Calls | Purpose |
|----------|---------|-------|---------|
| api/priority3.ts | 36 | 1 | anime apis |
| rss/group1.ts | 24 | 1 | news rss |
| rss/group2.ts | 24-26 | 3 | manga, community, scanlation rss |
| sites/group1.ts | 5-6 | 2 | news, databases sites |
| sites/group2.ts | 5-10 | 6 | manhwa, streaming, film, liveAction, manga, community sites |
| social/group1.ts | 9 (in function) | 3 | twitter, reddit, youtube social |
| social/group2.ts | 9 (in function) | 5 | discord, tiktok, facebook, twitch, telegram social |
| social.ts | 20, 25, 30, 35, 40, 45 | 6 | individual social platform fetchers |
| manager.ts (internal) | 54 matches | - | Used internally in category wrapper functions |

### Non-Usage of Category-Specific Functions

```
ZERO matches for:
- getAnimeSources()
- getMangaSources()
- getManhwaSources()
- getFilmSources()
- getSeriesSources()
- getLiveActionSources()
- getChineseSources()
- getJapaneseSources()
- getRumorsSources()
- getSourcesByCategory()
- getSourcesByType()
- getSourcesByReliability()
- getRSSSources()
```

---

## Interface Definitions

### CrawlerSourceConfig (Used by category functions)

```typescript
interface CrawlerSourceConfig {
  apis: SourceConfig[];
  rss: SourceConfig[];
  sites: SourceConfig[];
  social: SourceConfig[];
}
```

### SourceConfig (Used by type+category function)

```typescript
interface SourceConfig {
  name: string;                    // "AniList"
  url: string;                     // "https://api.anilist.co"
  type: 'api' | 'rss' | 'site' | 'social';
  category: string;                // "anime", "news", "twitter", etc
  reliability: number;             // 0.0 to 1.0
}
```

### CrawledItem (Output from crawlers)

```typescript
interface CrawledItem {
  title: string;
  content: string;
  source: string;
  sourceType: 'api' | 'rss' | 'site' | 'social';
  url?: string;
  publishedAt?: string;
}
```

---

## Performance Impact: Current vs Alternative

### Current (Type-Based + Groups)
- Fine-grained control over which categories to fetch
- Can group heavy sources separately for load balancing
- Each group runs independently
- **Status**: Working

### If Using Category Functions
- Would fetch ALL types for a category at once
- Less control over load distribution
- Simpler to understand conceptually
- Would require refactoring all 9 crawlers
- **Status**: Not implemented, would be a major change

---

## Conclusion

The category-specific source functions (`getAnimeSources()`, etc.) are **architectural leftovers** from an earlier design. The actual production crawler uses `getSourcesByTypeAndCategory()` for direct, type-and-category-filtered access, organized by:

1. **Priority** (APIs)
2. **Groups** (RSS, Sites)
3. **Groups** (Social)

These functions can be safely **removed as dead code** if the codebase needs cleanup.
