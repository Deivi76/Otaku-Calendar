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
        const apiJobs = this.jobs.filter(j => j.name.startsWith('API_'));
        const rssJobs = this.jobs.filter(j => j.name.startsWith('RSS_'));
        const sitesJobs = this.jobs.filter(j => j.name.startsWith('Sites_'));
        const socialJobs = this.jobs.filter(j => j.name.startsWith('Social_'));
        console.log(`\n📋 Starting queue with ${this.jobs.length} crawlers`);
        console.log(`📋 Wave 1: APIs (${apiJobs.length} jobs - sequential)`);
        console.log(`📋 Wave 2: RSS (${rssJobs.length} jobs - parallel)`);
        console.log(`📋 Wave 3: Sites (${sitesJobs.length} jobs - parallel)`);
        console.log(`📋 Wave 4: Social (${socialJobs.length} jobs - sequential)`);
        for (const job of apiJobs) {
            const result = await this.executeJob(job);
            results.push(result);
            await this.delay(1000);
        }
        if (rssJobs.length > 0) {
            const rssResults = await Promise.all(rssJobs.map(j => this.executeJob(j)));
            results.push(...rssResults);
            await this.delay(1000);
        }
        if (sitesJobs.length > 0) {
            const sitesResults = await Promise.all(sitesJobs.map(j => this.executeJob(j)));
            results.push(...sitesResults);
            await this.delay(1000);
        }
        for (const job of socialJobs) {
            const result = await this.executeJob(job);
            results.push(result);
            await this.delay(1000);
        }
        const totalDuration = Date.now() - totalStart;
        console.log(`\n📊 Queue completed in ${totalDuration}ms`);
        console.log(`📊 Total normalized items collected: ${this.normalizedResults.length}`);
        return results;
    }
    async executeJob(job) {
        const jobStart = Date.now();
        console.log(`\n🔄 Starting: ${job.name}`);
        try {
            const items = await job.fn();
            const duration = Date.now() - jobStart;
            console.log(`✅ ${job.name} completed: ${items.length} items in ${duration}ms`);
            let normalizedItems;
            if (job.extractorFn && items.length > 0) {
                console.log(`🔄 Running extractor for: ${job.name}`);
                normalizedItems = await job.extractorFn(items);
                this.normalizedResults.push(...normalizedItems);
                console.log(`✅ Extractor completed: ${normalizedItems.length} normalized items`);
            }
            return {
                name: job.name,
                items,
                normalizedItems,
                duration,
                status: 'success'
            };
        }
        catch (error) {
            const duration = Date.now() - jobStart;
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`❌ ${job.name} failed after ${duration}ms: ${errorMessage}`);
            return {
                name: job.name,
                items: [],
                normalizedItems: [],
                duration,
                status: 'error',
                error: errorMessage
            };
        }
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
