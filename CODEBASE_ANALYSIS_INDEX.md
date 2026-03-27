# Codebase Analysis Index

This directory contains comprehensive analysis of the Otaku Calendar source functions architecture.

## Documents

### 1. **QUICK_REFERENCE.md** - Start Here!
Quick facts and patterns at a glance.
- Usage status summary
- Dead code listing
- File locations
- Quick examples
- Recommendations

### 2. **SOURCE_FUNCTIONS_ANALYSIS.md** - Detailed Report
Comprehensive deep-dive analysis with sections:
1. Function Definitions
2. Who Calls These Functions
3. What Functions Return
4. How Returned Sources Are Used
5. Why Functions Were Created
6. Are They Actually Used?
7. Summary Table
8. Recommendations

### 3. **SOURCE_FUNCTIONS_ARCHITECTURE.md** - Visual Diagrams
Architecture diagrams and data flows:
- Current Type-Based + Groups Architecture
- Hypothetical Category-Based Architecture
- Data Flow Example
- Call Site Map
- Interface Definitions
- Performance Impact Analysis

## Quick Summary

**Key Finding**: The category-specific functions (`getAnimeSources()`, `getMangaSources()`, etc.) are **DEAD CODE**.

| Metric | Value |
|--------|-------|
| Total functions in manager.ts | 14 |
| Actually used | 1 (`getSourcesByTypeAndCategory`) |
| Dead code functions | 13 |
| Usage count | 54 calls to working function |
| Files using working function | 8 |
| Files using dead code | 0 |

## File Locations

### Core Files

- **Source Definitions**: `/workspaces/Otaku-Calendar/apps/crawler/src/sources/manager.ts` (lines 1-188)
- **Source Data**: `/workspaces/Otaku-Calendar/packages/core/src/sources-database.ts`
- **Main Crawler**: `/workspaces/Otaku-Calendar/apps/crawler/src/index.ts`

### Actual Usage (getSourcesByTypeAndCategory calls)

1. `apps/crawler/src/sources/api/priority3.ts` - line 36
2. `apps/crawler/src/sources/rss/group1.ts` - line 24
3. `apps/crawler/src/sources/rss/group2.ts` - lines 24-26
4. `apps/crawler/src/sources/sites/group1.ts` - lines 5-6
5. `apps/crawler/src/sources/sites/group2.ts` - lines 5-10
6. `apps/crawler/src/sources/social/group1.ts` - line 9
7. `apps/crawler/src/sources/social/group2.ts` - line 9
8. `apps/crawler/src/sources/social.ts` - lines 20, 25, 30, 35, 40, 45

### Non-Usage (Dead Code)

All 13 dead code functions are defined only in:
- `apps/crawler/src/sources/manager.ts` (lines 46-188)

They are never imported or called anywhere.

## Function Status Reference

### ACTIVELY USED ✓

```typescript
getSourcesByTypeAndCategory(type, category)  // 54 usages
```

### DEAD CODE ✗

```typescript
getAnimeSources()
getMangaSources()
getManhwaSources()
getFilmSources()
getSeriesSources()
getLiveActionSources()
getChineseSources()
getJapaneseSources()
getRumorsSources()
getSourcesByCategory()
getSourcesByType()
getSourcesByReliability()
getRSSSources()
```

## Data Structures

### Input: SOURCES_DATABASE
```
{
  apis: {
    anime: [...49 items],
    manga: [...10 items],
    ... other categories
  },
  rss: {
    news: [...141 items],
    manga: [...10 items],
    ... other categories
  },
  sites: {
    news: [...120+ items],
    databases: [...43 items],
    ... other categories
  },
  social: {
    twitter: [...],
    reddit: [...],
    youtube: [...],
    ... other categories
  }
}
```

### Working Function Returns
```typescript
interface SourceConfig {
  name: string;           // "AniList"
  url: string;            // "https://api.anilist.co"
  type: string;           // "api" | "rss" | "site" | "social"
  category: string;       // "anime" | "news" | "twitter" | etc
  reliability: number;    // 0.0 - 1.0
}
```

### Dead Functions Return
```typescript
interface CrawlerSourceConfig {
  apis: SourceConfig[];
  rss: SourceConfig[];
  sites: SourceConfig[];
  social: SourceConfig[];
}
```

## Crawler Architecture

Current production crawler uses **Type-Based + Groups** organization:

```
9 Crawler Functions:
├─ API: Priority1, Priority2, Priority3
├─ RSS: Group1 (news), Group2 (manga+community)
├─ Sites: Group1 (news+databases), Group2 (other)
└─ Social: Group1 (Twitter+Reddit+YouTube), Group2 (Discord+TikTok+etc)

All groups use: getSourcesByTypeAndCategory()
```

**NOT Used**: Category-based organization (would use `getAnimeSources()`, etc.)

## Recommendations

### Best Practice: Remove Dead Code
Delete lines 46-188 from manager.ts keeping only `getSourcesByTypeAndCategory()`.

### Alternative: Document & Keep
Add JSDoc explaining these are experimental/unused functions.

### Not Recommended: Implement
Refactoring to use these would be a major change with minimal benefit.

## Analysis Methodology

1. **File Search**: Located all function definitions
2. **Grep Search**: Found all usages of each function
3. **Call Site Analysis**: Traced how functions are used
4. **Return Type Analysis**: Identified what each function returns
5. **Integration Study**: Mapped entire data flow
6. **Architecture Review**: Documented current vs. alternative designs

## Key Insights

1. **Evolutionary Design**: Functions left from earlier architecture
2. **Fine-Grained Control**: Current design allows type+category filtering
3. **Load Balancing**: Priority/group system enables better resource management
4. **Zero Usage**: Complete absence of calls to 13 functions
5. **Clean Interface**: One working function (`getSourcesByTypeAndCategory`) is sufficient

## Conclusion

The analysis clearly shows that `getAnimeSources()`, `getMangaSources()`, and similar category-specific functions are **architectural artifacts** from an earlier design that was never implemented or evolved into a different approach. The current production crawler relies exclusively on `getSourcesByTypeAndCategory()` for accessing sources, organized by type + source group (priority/group-based), not by content category.

These unused functions are safe to remove as part of code cleanup.

---

**Generated**: 2026-03-27
**Codebase**: Otaku Calendar Crawler
**Analysis Scope**: Source functions in manager.ts and all usage sites
