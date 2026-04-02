import { serve } from 'inngest/next';
import { inngest } from './client';
import { scheduleCrawler } from './functions/scheduler';
import { runDomainCrawler } from './functions/domain-worker';
import { runCollector } from './functions/collector';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [scheduleCrawler, runDomainCrawler, runCollector],
});