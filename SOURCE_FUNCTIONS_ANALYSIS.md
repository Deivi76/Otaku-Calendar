# Otaku Calendar - Source Functions Analysis Report

## Executive Summary

The functions `getAnimeSources()`, `getMangaSources()`, `getLiveActionSources()`, `getRumorsSources()`, and similar category-specific functions are **CURRENTLY UNUSED** in the active crawler flow. They are defined in `manager.ts` but never called. Instead, the crawler uses lower-level functions `getSourcesByTypeAndCategory()` directly.

---

## 1. FUNCTION DEFINITIONS

### Location: `/workspaces/Otaku-Calendar/apps/crawler/src/sources/manager.ts`

#### Helper Functions (Actually Used)

```typescript
// Lines 50-67
export function getSourcesByTypeAndCategory(
  type: 'api' | 'rss' | 'site' | 'social',
  category: string
): SourceConfig[]
```
Returns sources filtered by both type and category. **This function is heavily used.**

```typescript
// Lines 83-100
export function getSourcesByCategory(
  category: 'anime' | 'manga' | 'manhwa' | 'film' | 'series' | 'liveAction'
): SourceConfig[]
```
Returns sources from all types for a given category. **This function is NOT used.**

#### Category-Specific Functions (NOT Used)

```typescript
// Lines 109-116
export function getAnimeSources(): CrawlerSourceConfig {
  return {
    apis: getSourcesByTypeAndCategory('api', 'anime'),
    rss: getSourcesByTypeAndCategory('rss', 'anime'),
    sites: getSourcesByTypeAndCategory('site', 'anime'),
    social: getSourcesByTypeAndCategory('social', 'anime'),
  };
}

// Lines 118-125
export function getMangaSources(): CrawlerSourceConfig { /* similar */ }

// Lines 127-134
export function getManhwaSources(): CrawlerSourceConfig { /* similar */ }

// Lines 136-143
export function getFilmSources(): CrawlerSourceConfig { /* similar */ }

// Lines 145-152
export function getSeriesSources(): CrawlerSourceConfig { /* similar */ }

// Lines 154-161
export function getLiveActionSources(): CrawlerSourceConfig { /* similar */ }

// Lines 163-170
export function getChineseSources(): CrawlerSourceConfig { /* similar */ }

// Lines 172-179
export function getJapaneseSources(): CrawlerSourceConfig { /* similar */ }

// Lines 181-188
export function getRumorsSources(): CrawlerSourceConfig {
  return {
    apis: [],
    rss: getSourcesByTypeAndCategory('rss', 'rumors'),
    sites: getSourcesByTypeAndCategory('site', 'rumors'),
    social: getSourcesByTypeAndCategory('social', 'rumors'),
  };
}
```

### Return Type: `CrawlerSourceConfig`

```typescript
// Lines 102-107
export interface CrawlerSourceConfig {
  apis: SourceConfig[];
  rss: SourceConfig[];
  sites: SourceConfig[];
  social: SourceConfig[];
}
```

---

## 2. WHO CALLS THESE FUNCTIONS

### Search Results

```
Total matches for source functions: 69
- getSourcesByTypeAndCategory: 54 matches (HEAVILY USED)
- getAnimeSources, getMangaSources, etc: 0 matches (NEVER CALLED)
```

### Actual Usage - `getSourcesByTypeAndCategory()` Calls

**Files Using It:**

1. `/apps/crawler/src/sources/api/priority3.ts` - Line 36
   - Fetches anime APIs with reliability < 0.75

2. `/apps/crawler/src/sources/rss/group1.ts` - Line 24
   - Fetches RSS news sources

3. `/apps/crawler/src/sources/rss/group2.ts` - Lines 24-26
   - Fetches RSS manga, community, scanlation sources

4. `/apps/crawler/src/sources/sites/group1.ts` - Lines 5-6
   - Fetches site news and databases sources

5. `/apps/crawler/src/sources/sites/group2.ts` - Lines 5-10
   - Fetches site manhwa, streaming, film, liveAction, manga, community sources

6. `/apps/crawler/src/sources/social/group1.ts` - Lines 9
   - Used in getFilteredSources() for twitter, reddit, youtube

7. `/apps/crawler/src/sources/social/group2.ts` - Line 9
   - Used in getFilteredSources() for discord, tiktok, facebook, twitch, telegram

8. `/apps/crawler/src/sources/social.ts` - Lines 20, 25, 30, 35, 40, 45
   - Used in individual fetch functions for each social platform

---

## 3. WHAT DO THESE FUNCTIONS RETURN?

### Return Type Structure

All category-specific functions return `CrawlerSourceConfig`:

```typescript
interface CrawlerSourceConfig {
  apis: SourceConfig[];         // Array of API sources
  rss: SourceConfig[];          // Array of RSS feed sources
  sites: SourceConfig[];        // Array of website sources
  social: SourceConfig[];       // Array of social media sources
}
```

### SourceConfig Structure

```typescript
interface SourceConfig {
  name: string;                 // e.g., "AniList", "Jikan", "Kitsu"
  url: string;                  // e.g., "https://alistapi.gg"
  type: 'api' | 'rss' | 'site' | 'social';
  category: string;             // e.g., "anime", "manga", "news"
  reliability: number;          // 0.0 - 1.0 scale
}
```

### Example Return for `getAnimeSources()`

```typescript
{
  apis: [
    { 
      name: 'AniList', 
      url: 'https://alistapi.gg', 
      type: 'api',
      category: 'anime',
      reliability: 0.85 
    },
    { 
      name: 'Jikan', 
      url: 'https://api.jikan.moe/v4', 
      type: 'api',
      category: 'anime',
      reliability: 0.85 
    },
    // ... 47 more anime APIs
  ],
  rss: [
    // Empty array - no anime-specific RSS feeds defined
  ],
  sites: [
    // Empty array - no anime-specific sites defined
  ],
  social: [
    // Empty array - no anime-specific social sources defined
  ]
}
```

---

## 4. HOW ARE RETURNED SOURCES USED?

### Currently Active Flow

**Main Entry:** `/apps/crawler/src/index.ts`

The crawler calls 9 separate crawling functions in priority groups:

```typescript
1. crawlAPI_Priority1()      → Returns CrawledItem[]
2. crawlAPI_Priority2()      → Returns CrawledItem[]
3. crawlAPI_Priority3()      → Returns CrawledItem[] (uses getSourcesByTypeAndCategory)
4. crawlRSS_Group1()         → Returns CrawledItem[] (uses getSourcesByTypeAndCategory)
5. crawlRSS_Group2()         → Returns CrawledItem[] (uses getSourcesByTypeAndCategory)
6. crawlSites_Group1()       → Returns CrawledItem[] (uses getSourcesByTypeAndCategory)
7. crawlSites_Group2()       → Returns CrawledItem[] (uses getSourcesByTypeAndCategory)
8. crawlSocial_Group1()      → Returns CrawledItem[] (uses getSourcesByTypeAndCategory)
9. crawlSocial_Group2()      → Returns CrawledItem[] (uses getSourcesByTypeAndCategory)
```

### Usage Pattern Example: `crawlRSS_Group1()`

```typescript
export async function crawlRSS_Group1(): Promise<CrawledItem[]> {
  // STEP 1: Get sources using getSourcesByTypeAndCategory
  const allNewsSources = getSourcesByTypeAndCategory('rss', 'news');
  
  // STEP 2: Filter by reliability
  const filteredSources = allNewsSources
    .filter(source => source.reliability >= 0.7)
    .slice(0, 50);
  
  // STEP 3: Fetch from each source
  const results = await Promise.all(
    filteredSources.map(source => fetchRSS(source))
  );
  
  // STEP 4: Flatten and return crawled items
  return results.flat();
}
```

### Processing Pipeline

```
Sources → Filtered by Type & Category
        → Filtered by Reliability Threshold
        → Fetched (HTTP requests)
        → Parsed (HTML/JSON/RSS)
        → Converted to CrawledItem[]
        → Combined from all 9 crawlers
        → Extracted & Classified
        → Deduplicated
        → Final Results
```

---

## 5. WHY WERE THESE FUNCTIONS CREATED?

Based on code analysis, these functions appear to have been created as:

1. **Convenience Wrappers**: One-call access to all source types for a specific category
2. **Original Design Intent**: Possibly planned for a category-based crawler architecture
3. **Unused Abstraction**: Never integrated into the current type-based/group-based crawler flow
4. **Dead Code**: The crawler evolved to group sources by type+group instead of by category

### Evidence

- No imports of `getAnimeSources()`, `getMangaSources()`, etc. anywhere in the codebase
- The code instead uses `getSourcesByTypeAndCategory()` directly for fine-grained control
- Crawler groups sources by: `api/priority1, priority2, priority3`, `rss/group1, group2`, `sites/group1, group2`, `social/group1, group2`
- Not organized by anime/manga/film categories

---

## 6. ARE THEY ACTUALLY USED IN THE CURRENT FLOW?

### Answer: NO

**Search Verification:**
```bash
$ grep -r "getAnimeSources|getMangaSources|getManhwaSources|getFilmSources|getSeriesSources|getLiveActionSources|getRumorsSources" /apps/crawler/src --include="*.ts" | grep -v "export function"

Result: 0 matches
```

### What IS Used

Only `getSourcesByTypeAndCategory()` is used (54 matches):

```typescript
// Pattern used throughout:
const sources = getSourcesByTypeAndCategory('api', 'anime');
const sources = getSourcesByTypeAndCategory('rss', 'news');
const sources = getSourcesByTypeAndCategory('site', 'streaming');
const sources = getSourcesByTypeAndCategory('social', 'twitter');
```

---

## 7. SUMMARY TABLE

| Function | Defined | Used | Purpose | Status |
|----------|---------|------|---------|--------|
| `getAnimeSources()` | ✓ manager.ts:109-116 | ✗ | Get all anime sources (all types) | DEAD CODE |
| `getMangaSources()` | ✓ manager.ts:118-125 | ✗ | Get all manga sources (all types) | DEAD CODE |
| `getManhwaSources()` | ✓ manager.ts:127-134 | ✗ | Get all manhwa sources (all types) | DEAD CODE |
| `getFilmSources()` | ✓ manager.ts:136-143 | ✗ | Get all film sources (all types) | DEAD CODE |
| `getSeriesSources()` | ✓ manager.ts:145-152 | ✗ | Get all series sources (all types) | DEAD CODE |
| `getLiveActionSources()` | ✓ manager.ts:154-161 | ✗ | Get all live action sources (all types) | DEAD CODE |
| `getChineseSources()` | ✓ manager.ts:163-170 | ✗ | Get all Chinese sources (all types) | DEAD CODE |
| `getJapaneseSources()` | ✓ manager.ts:172-179 | ✗ | Get all Japanese sources (all types) | DEAD CODE |
| `getRumorsSources()` | ✓ manager.ts:181-188 | ✗ | Get all rumors sources (rss+site+social) | DEAD CODE |
| `getSourcesByCategory()` | ✓ manager.ts:83-100 | ✗ | Get all sources for category (all types) | DEAD CODE |
| `getSourcesByTypeAndCategory()` | ✓ manager.ts:50-67 | ✓ (54×) | Get sources filtered by type+category | **ACTIVELY USED** |
| `getSourcesByType()` | ✓ manager.ts:46-48 | ✗ | Get all sources of a type | DEAD CODE |
| `getSourcesByReliability()` | ✓ manager.ts:73-81 | ✗ | Get sources by min reliability | DEAD CODE |
| `getRSSSources()` | ✓ manager.ts:69-71 | ✗ | Get all RSS sources | DEAD CODE |

---

## 8. RECOMMENDATIONS

### Option 1: Remove Unused Code
Delete the dead code functions and keep only `getSourcesByTypeAndCategory()`:
- Lines 46-81 (remove some)
- Lines 83-188 (remove all)

### Option 2: Refactor to Use These Functions
If category-based organization is desired, replace current crawler implementation to use:
```typescript
const animeSources = getAnimeSources();
const mangaSources = getMangaSources();
// etc.
```

### Option 3: Keep for Future Extensibility
If these are intentionally kept for future use, add comments explaining the intent.

