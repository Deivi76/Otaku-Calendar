import type { CrawledItem } from './queue';

export interface SourceJob {
  id: string;
  name: string;
  url: string;
  domain: string;
  type: 'api' | 'rss' | 'site' | 'social';
  reliability?: number;
  crawlFn?: () => Promise<CrawledItem[]>;
}

export interface JobResult {
  source: string;
  domain: string;
  status: 'success' | 'failed';
  items: CrawledItem[];
  error?: string;
  retries: number;
}

const MAX_CONCURRENT_DOMAINS = 30;
const MAX_RETRIES = 1;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay(min = 1000, max = 3000): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min) + min);
  return sleep(delay);
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}

function sortByReliability(sources: SourceJob[]): SourceJob[] {
  return [...sources].sort((a, b) => (b.reliability ?? 0) - (a.reliability ?? 0));
}

export function groupByDomain(sources: SourceJob[]): Map<string, SourceJob[]> {
  const sortedSources = sortByReliability(sources);
  const domainMap = new Map<string, SourceJob[]>();

  for (const source of sortedSources) {
    const domain = source.domain || extractDomain(source.url);
    const existing = domainMap.get(domain) || [];
    existing.push({ ...source, domain });
    domainMap.set(domain, existing);
  }

  return domainMap;
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<any>
): Promise<any[]> {
  const results: any[] = [];
  const queue = [...items];
  const running: Promise<any>[] = [];

  while (queue.length > 0 || running.length > 0) {
    while (running.length < limit && queue.length > 0) {
      const item = queue.shift()!;
      const p = worker(item);
      results.push(p);
      running.push(p);
    }

    if (running.length > 0) {
      await Promise.race(running);
      const doneIndex = running.findIndex(asyncP => (asyncP as any).status !== 'pending');
      if (doneIndex !== -1) {
        running.splice(doneIndex, 1);
      }
    }
  }

  return results;
}

export async function runDomainJobs(domainJobs: SourceJob[]): Promise<JobResult[]> {
  const results: JobResult[] = [];

  for (const job of domainJobs) {
    await randomDelay(800, 2500);
    const result = await executeWithRetry(job);
    results.push(result);
  }

  return results;
}

export async function executeWithRetry(job: SourceJob): Promise<JobResult> {
  if (!job.crawlFn) {
    return {
      source: job.name,
      domain: job.domain,
      status: 'failed',
      items: [],
      error: 'No crawl function provided',
      retries: 0,
    };
  }

  let retries = 0;

  while (retries <= MAX_RETRIES) {
    try {
      const items = await job.crawlFn();
      return {
        source: job.name,
        domain: job.domain,
        status: 'success',
        items,
        retries
      };
    } catch (error) {
      retries++;
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (retries > MAX_RETRIES) {
        return {
          source: job.name,
          domain: job.domain,
          status: 'failed',
          items: [],
          error: errorMessage,
          retries
        };
      }

      await sleep(1000 * retries);
    }
  }

  return {
    source: job.name,
    domain: job.domain,
    status: 'failed',
    items: [],
    error: 'Max retries exceeded',
    retries: MAX_RETRIES + 1
  };
}

export async function runAll(sources: SourceJob[]): Promise<JobResult[]> {
  const domainMap = groupByDomain(sources);
  const domainArrays = Array.from(domainMap.values());

  const domainResults = await runWithConcurrency(
    domainArrays,
    MAX_CONCURRENT_DOMAINS,
    async (domainJobs: SourceJob[]) => {
      return await runDomainJobs(domainJobs);
    }
  );

  return domainResults.flat();
}

export const DomainScheduler = {
  runAll,
  runDomainJobs,
  executeWithRetry,
  groupByDomain,
  extractDomain,
  sortByReliability
};

export { extractDomain, sortByReliability };