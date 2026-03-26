import type { NormalizedAnimeItem } from '../normalizer';

export interface DeduplicationResult {
  unique: NormalizedAnimeItem[];
  duplicates: NormalizedAnimeItem[];
  merged: NormalizedAnimeItem[];
}

function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .replace(/\s+/g, '');
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeKey(str1);
  const s2 = normalizeKey(str2);

  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.includes(shorter)) {
    return shorter.length / longer.length;
  }

  const editDistance = levenshtein(shorter, longer);
  return (longer.length - editDistance) / longer.length;
}

function levenshtein(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + 1
        );
      }
    }
  }

  return dp[m][n];
}

export function deduplicate(
  items: NormalizedAnimeItem[],
  similarityThreshold = 0.85
): DeduplicationResult {
  const unique: NormalizedAnimeItem[] = [];
  const duplicates: NormalizedAnimeItem[] = [];
  const merged: NormalizedAnimeItem[] = [];
  const processed = new Set<string>();

  for (const item of items) {
    const key = `${item.anime}-${item.episode}`;
    const contentKey = normalizeKey(item.anime);

    let found = false;

    for (const existing of unique) {
      const existingContentKey = normalizeKey(existing.anime);

      if (contentKey === existingContentKey && item.episode === existing.episode) {
        if (item.confidence > existing.confidence) {
          const idx = unique.indexOf(existing);
          unique[idx] = item;
          duplicates.push(existing);
        } else {
          duplicates.push(item);
        }
        found = true;
        break;
      }

      const similarity = calculateSimilarity(item.anime, existing.anime);
      if (similarity >= similarityThreshold && item.episode === existing.episode) {
        if (item.confidence > existing.confidence) {
          const idx = unique.indexOf(existing);
          unique[idx] = item;
          duplicates.push(existing);
        } else {
          duplicates.push(item);
        }
        found = true;
        break;
      }
    }

    if (!found) {
      unique.push(item);
    }
  }

  return { unique, duplicates, merged: [] };
}

export function deduplicateByKey(
  items: NormalizedAnimeItem[]
): Map<string, NormalizedAnimeItem[]> {
  const groups = new Map<string, NormalizedAnimeItem[]>();

  for (const item of items) {
    const key = `${normalizeKey(item.anime)}-${item.episode ?? 'null'}`;
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  }

  return groups;
}
