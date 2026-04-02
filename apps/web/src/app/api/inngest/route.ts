import { serve } from 'inngest/next';
import { inngest } from './client';
import { scheduleCrawler } from '@otaku-calendar/crawler/inngest/functions/scheduler';
import { runDomainCrawler } from '@otaku-calendar/crawler/inngest/functions/domain-worker';

export const dynamic = 'force-dynamic';

const handler = serve({
  client: inngest,
  functions: [scheduleCrawler, runDomainCrawler],
});

export const GET = handler;
export const POST = handler;