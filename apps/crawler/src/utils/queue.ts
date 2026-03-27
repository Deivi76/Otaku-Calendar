export interface CrawledItem {
  title: string;
  content: string;
  source: string;
  sourceType: 'api' | 'rss' | 'site' | 'social' | 'community' | 'platform' | 'rumor';
  url?: string;
  publishedAt?: string;
}

export interface CrawlerJob {
  name: string;
  fn: () => Promise<CrawledItem[]>;
  priority: number;
}

export interface CrawlerResult {
  name: string;
  items: CrawledItem[];
  duration: number;
  status: 'success' | 'error';
  error?: string;
}

export class CrawlerQueue {
  private jobs: CrawlerJob[] = [];

  add(name: string, fn: () => Promise<CrawledItem[]>, priority: number = 0) {
    this.jobs.push({ name, fn, priority });
    this.jobs.sort((a, b) => b.priority - a.priority);
  }

  async processAll(): Promise<CrawlerResult[]> {
    const results: CrawlerResult[] = [];
    const totalStart = Date.now();

    console.log(`\n📋 Starting queue with ${this.jobs.length} crawlers`);

    for (let i = 0; i < this.jobs.length; i++) {
      const job = this.jobs[i];
      const jobStart = Date.now();

      console.log(`\n🔄 [${i + 1}/${this.jobs.length}] Starting: ${job.name}`);

      try {
        const items = await job.fn();
        const duration = Date.now() - jobStart;

        console.log(`✅ [${i + 1}/${this.jobs.length}] ${job.name} completed: ${items.length} items in ${duration}ms`);

        results.push({
          name: job.name,
          items,
          duration,
          status: 'success'
        });
      } catch (error) {
        const duration = Date.now() - jobStart;
        const errorMessage = error instanceof Error ? error.message : String(error);

        console.error(`❌ [${i + 1}/${this.jobs.length}] ${job.name} failed after ${duration}ms: ${errorMessage}`);

        results.push({
          name: job.name,
          items: [],
          duration,
          status: 'error',
          error: errorMessage
        });
      }

      if (i < this.jobs.length - 1) {
        console.log(`⏳ Waiting 1s before next crawler...`);
        await this.delay(1000);
      }
    }

    const totalDuration = Date.now() - totalStart;
    console.log(`\n📊 Queue completed in ${totalDuration}ms`);

    return results;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}