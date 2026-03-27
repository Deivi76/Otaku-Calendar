export class CrawlerQueue {
    jobs = [];
    normalizedResults = [];
    add(name, fn, priority = 0, extractorFn) {
        this.jobs.push({ name, fn, priority, extractorFn });
        this.jobs.sort((a, b) => b.priority - a.priority);
    }
    getNormalizedResults() {
        return this.normalizedResults;
    }
    async processAll() {
        const results = [];
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
                let normalizedItems;
                if (job.extractorFn && items.length > 0) {
                    console.log(`🔄 [${i + 1}/${this.jobs.length}] Running extractor for: ${job.name}`);
                    normalizedItems = await job.extractorFn(items);
                    this.normalizedResults.push(...normalizedItems);
                    console.log(`✅ [${i + 1}/${this.jobs.length}] Extractor completed: ${normalizedItems.length} normalized items`);
                }
                results.push({
                    name: job.name,
                    items,
                    normalizedItems,
                    duration,
                    status: 'success'
                });
            }
            catch (error) {
                const duration = Date.now() - jobStart;
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`❌ [${i + 1}/${this.jobs.length}] ${job.name} failed after ${duration}ms: ${errorMessage}`);
                results.push({
                    name: job.name,
                    items: [],
                    normalizedItems: [],
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
        console.log(`📊 Total normalized items collected: ${this.normalizedResults.length}`);
        return results;
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
