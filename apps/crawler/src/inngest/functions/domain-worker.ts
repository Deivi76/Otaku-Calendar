import { inngest } from '../client';
import { runDomainJobs, type SourceJob } from '../../utils/domain-scheduler';
import { crawlAPI } from '../../sources/api';
import { crawlRSS } from '../../sources/rss';
import { crawlSite } from '../../sources/sites';
import { crawlSocial } from '../../sources/social';
import { extractAndClassify } from '../../sources/extractors';
import type { CrawledItem, NormalizedItem } from '../../utils/queue';

interface DomainRunData {
  domain: string;
  jobs: Array<{
    id: string;
    name: string;
    url: string;
    domain: string;
    type: 'api' | 'rss' | 'site' | 'social';
    reliability?: number;
  }>;
  crawlId?: string;
}

async function createCrawlFunction(url: string, type: string): Promise<() => Promise<CrawledItem[]>> {
  return async () => {
    switch (type) {
      case 'api':
        return crawlAPI(url);
      case 'rss':
        return crawlRSS(url);
      case 'site':
        return crawlSite(url);
      case 'social':
        return crawlSocial();
      default:
        return [];
    }
  };
}

export const runDomainCrawler = inngest.createFunction(
  {
    name: 'crawler-domain-worker',
    id: 'crawler-domain-worker',
    concurrency: 30,
  },
  { event: 'crawler/domain.run' },
  async ({ event, step }: { event: { data: DomainRunData }; step: any }) => {
    const { domain, jobs, crawlId } = event.data;
    const currentCrawlId = crawlId || new Date().toISOString();
    
    console.log(`[Domain Worker] Starting crawl for domain: ${domain} (${jobs.length} jobs)`);
    
    const jobsByType = {
      api: jobs.filter(j => j.type === 'api'),
      rss: jobs.filter(j => j.type === 'rss'),
      site: jobs.filter(j => j.type === 'site'),
      social: jobs.filter(j => j.type === 'social'),
    };
    
    const allItems: CrawledItem[] = [];
    const normalizedResults: NormalizedItem[] = [];
    
    for (const [type, typeJobs] of Object.entries(jobsByType)) {
      if (typeJobs.length === 0) continue;
      
      console.log(`[Domain Worker] Processing ${typeJobs.length} ${type} jobs...`);
      
      const jobsWithCrawlFn: SourceJob[] = await Promise.all(
        typeJobs.map(async (job) => ({
          ...job,
          crawlFn: await createCrawlFunction(job.url, job.type),
        }))
      );
      
      const results = await runDomainJobs(jobsWithCrawlFn);
      
      for (const result of results) {
        allItems.push(...result.items);
      }
      
      if (allItems.length > 0) {
        console.log(`[Domain Worker] Running normalize + classify for ${type}...`);
        const classified = await extractAndClassify(allItems);
        normalizedResults.push(...classified);
        console.log(`[Domain Worker] Extracted ${classified.length} normalized items from ${type}`);
      }
    }
    
    const successCount = jobs.filter(j => allItems.some(i => i.source === j.url)).length;
    const failedCount = jobs.length - successCount;
    
    console.log(`[Domain Worker] Completed ${domain}: ${successCount} success, ${failedCount} failed, ${allItems.length} total items`);
    
    if (normalizedResults.length > 0) {
      console.log(`[Domain Worker] Sending ${normalizedResults.length} items to collector...`);
      
      await step.sendEvent(`worker-completed-${domain}`, {
        name: 'crawler/worker.completed',
        data: {
          domain,
          normalizedItems: normalizedResults,
          crawlId: currentCrawlId,
        },
      });
    }
    
    return {
      domain,
      totalJobs: jobs.length,
      successCount,
      failedCount,
      totalItems: allItems.length,
      normalizedItems: normalizedResults.length,
      crawlId: currentCrawlId,
    };
  }
);