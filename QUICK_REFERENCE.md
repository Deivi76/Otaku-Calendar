# Quick Reference: Source Functions

## TL;DR

**Status**: `getAnimeSources()`, `getMangaSources()`, etc. are **DEAD CODE** - not used anywhere.

**What IS used**: `getSourcesByTypeAndCategory('type', 'category')` (54 usages)

---

## Functions by Usage Status

### ACTIVELY USED (Do NOT Remove)

```typescript
// 54 total usages throughout crawler
getSourcesByTypeAndCategory(type: 'api'|'rss'|'site'|'social', category: string)
  → Returns: SourceConfig[]
  → Used in: api/priority3, rss/group1-2, sites/group1-2, social/group1-2
```

### DEAD CODE (Safe to Remove)

```typescript
// NEVER called - 0 usages
getAnimeSources()             → CrawlerSourceConfig
getMangaSources()             → CrawlerSourceConfig
getManhwaSources()            → CrawlerSourceConfig
getFilmSources()              → CrawlerSourceConfig
getSeriesSources()            → CrawlerSourceConfig
getLiveActionSources()        → CrawlerSourceConfig
getChineseSources()           → CrawlerSourceConfig
getJapaneseSources()          → CrawlerSourceConfig
getRumorsSources()            → CrawlerSourceConfig
getSourcesByCategory()        → SourceConfig[]
getSourcesByType()            → SourceConfig[]
getSourcesByReliability()     → SourceConfig[]
getRSSSources()               → SourceConfig[]
```

---

## Data Structures

### SourceConfig (What crawlers get)
```typescript
{
  name: string              // e.g., "AniList"
  url: string               // e.g., "https://api.anilist.co"
  type: string              // "api" | "rss" | "site" | "social"
  category: string          // "anime" | "news" | "twitter" | etc
  reliability: number       // 0.0 - 1.0
}
```

### CrawlerSourceConfig (What dead functions return)
```typescript
{
  apis: SourceConfig[]      // Array of APIs
  rss: SourceConfig[]       // Array of RSS feeds
  sites: SourceConfig[]     // Array of websites
  social: SourceConfig[]    // Array of social media
}
```

---

## Calling Pattern (How it actually works)

### Right (USED)
```typescript
// Directly call with type + category
const sources = getSourcesByTypeAndCategory('rss', 'news');
const sources = getSourcesByTypeAndCategory('site', 'film');
const sources = getSourcesByTypeAndCategory('social', 'twitter');
```

### Wrong (NOT USED)
```typescript
// These are never called
const config = getAnimeSources();  // Returns {apis, rss, sites, social}
const sources = getSourcesByCategory('anime');
const sources = getSourcesByReliability(0.75);
```

---

## Crawler Organization (Current)

```
9 Crawler Functions
├─ 3 API Crawlers (priority-based)
├─ 2 RSS Crawlers (group-based)
├─ 2 Sites Crawlers (group-based)
└─ 2 Social Crawlers (group-based)

All use: getSourcesByTypeAndCategory()
None use: getAnimeSources() or similar
```

---

## File Locations

| File | Lines | Status |
|------|-------|--------|
| `packages/core/src/sources-database.ts` | - | Source data |
| `apps/crawler/src/sources/manager.ts` | 1-188 | All functions defined here |
| `apps/crawler/src/sources/api/priority3.ts` | 36 | Uses `getSourcesByTypeAndCategory` |
| `apps/crawler/src/sources/rss/group1.ts` | 24 | Uses `getSourcesByTypeAndCategory` |
| `apps/crawler/src/sources/rss/group2.ts` | 24-26 | Uses `getSourcesByTypeAndCategory` |
| `apps/crawler/src/sources/sites/group1.ts` | 5-6 | Uses `getSourcesByTypeAndCategory` |
| `apps/crawler/src/sources/sites/group2.ts` | 5-10 | Uses `getSourcesByTypeAndCategory` |
| `apps/crawler/src/sources/social/group1.ts` | 9 | Uses `getSourcesByTypeAndCategory` |
| `apps/crawler/src/sources/social/group2.ts` | 9 | Uses `getSourcesByTypeAndCategory` |
| `apps/crawler/src/sources/social.ts` | 20, 25, 30, 35, 40, 45 | Uses `getSourcesByTypeAndCategory` |

---

## Example Usage

### Current (Working - Uses Low-Level Function)
```typescript
// In rss/group1.ts
export async function crawlRSS_Group1(): Promise<CrawledItem[]> {
  const allNewsSources = getSourcesByTypeAndCategory('rss', 'news');
  const filteredSources = allNewsSources.filter(s => s.reliability >= 0.7);
  const results = await Promise.all(
    filteredSources.map(source => fetchRSS(source))
  );
  return results.flat();
}
```

### If It Used Dead Code (Would NOT Work)
```typescript
// This would be ideal if getAnimeSources() was used, but it's not:
export async function crawlAnime(): Promise<CrawledItem[]> {
  const animeSources = getAnimeSources();  // <-- Never called!
  // Would return {apis, rss, sites, social} but nobody uses this
}
```

---

## Why Are They Unused?

1. **Different Architecture**: Original design probably category-based, evolved to type+group-based
2. **Better Control**: `getSourcesByTypeAndCategory()` gives fine-grained control
3. **Load Balancing**: Groups can be prioritized (Priority1, Priority2, Priority3, etc)
4. **Evolutionary Dead Code**: Left behind when system was refactored

---

## Cleanup Recommendation

### Option 1: Remove (Recommended)
Delete lines 46-188 from manager.ts, keep only:
- `getSourcesByTypeAndCategory()` (essential)

### Option 2: Keep with Documentation
Add JSDoc comments explaining these are unused/deprecated.

### Option 3: Implement
Refactor crawler to use these functions (major change, low benefit).

---

## Quick Facts

- **Total functions in manager.ts**: 14
- **Functions actually used**: 1 (`getSourcesByTypeAndCategory`)
- **Functions that are dead code**: 13
- **Total usage count**: 54 calls to the one working function
- **Files using the working function**: 8
- **Files using dead code functions**: 0

