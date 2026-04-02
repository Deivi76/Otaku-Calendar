import { inngest } from '../client';
import { groupByDomain, sortByReliability, type SourceJob } from '../../utils/domain-scheduler';
import { SOURCES_DATABASE } from '@otaku-calendar/core';
import type { ApiSource, RssSource, SiteSource, SocialSource } from '@otaku-calendar/core';

function getSourceUrl(source: ApiSource | RssSource | SiteSource | SocialSource): string {
  if ('url' in source && source.url) return source.url;
  if ('handle' in source && (source as any).handle) return `https://twitter.com/${(source as any).handle}`;
  if ('invite' in source && (source as any).invite) return `https://discord.gg/${(source as any).invite}`;
  return '';
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function getAllSourcesAsJobs(): SourceJob[] {
  const jobs: SourceJob[] = [];
  let id = 0;

  const processSources = (
    sources: (ApiSource | RssSource | SiteSource | SocialSource)[],
    type: SourceJob['type']
  ) => {
    for (const source of sources) {
      const url = getSourceUrl(source);
      if (!url) continue;

      jobs.push({
        id: `source-${id++}`,
        name: source.name,
        url,
        domain: extractDomain(url),
        type,
        reliability: source.reliability,
      });
    }
  };

  for (const sources of Object.values(SOURCES_DATABASE.apis)) {
    processSources(sources as ApiSource[], 'api');
  }
  for (const sources of Object.values(SOURCES_DATABASE.rss)) {
    processSources(sources as RssSource[], 'rss');
  }
  for (const sources of Object.values(SOURCES_DATABASE.sites)) {
    processSources(sources as SiteSource[], 'site');
  }
  for (const sources of Object.values(SOURCES_DATABASE.social)) {
    processSources(sources as SocialSource[], 'social');
  }

  return jobs;
}

export const scheduleCrawler = inngest.createFunction(
  { 
    name: 'crawler-scheduler',
    id: 'crawler-scheduler',
  },
  { cron: '0 * * * *' },
  async ({ step }: { step: any }) => {
    const crawlId = new Date().toISOString();
    console.log(`[Scheduler] Starting hourly crawl cycle... (ID: ${crawlId})`);
    
    const allSources = getAllSourcesAsJobs();
    console.log(`[Scheduler] Loaded ${allSources.length} sources`);
    
    const sortedSources = sortByReliability(allSources);
    const domainMap = groupByDomain(sortedSources);
    
    const domains = Array.from(domainMap.keys());
    console.log(`[Scheduler] Grouped into ${domains.length} domains`);
    
    const sentEvents: string[] = [];
    
    for (const domain of domains) {
      const jobs = domainMap.get(domain)!;
      
      await step.sendEvent(`crawler/domain-run-${domain}`, {
        name: 'crawler/domain.run',
        data: {
          domain,
          crawlId,
          jobs: jobs.map(j => ({
            id: j.id,
            name: j.name,
            url: j.url,
            domain: j.domain,
            type: j.type,
            reliability: j.reliability,
          })),
        },
      });
      
      sentEvents.push(domain);
    }
    
    console.log(`[Scheduler] Sent ${sentEvents.length} domain events`);
    
    return {
      crawlId,
      totalSources: allSources.length,
      totalDomains: domains.length,
      domains: sentEvents,
    };
  }
);