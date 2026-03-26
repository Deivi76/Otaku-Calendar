export class RateLimiter {
    buckets = new Map();
    queues = new Map();
    configs;
    processing = new Map();
    constructor(configs) {
        this.configs = configs;
        this.initializeBuckets();
    }
    initializeBuckets() {
        for (const source of Object.keys(this.configs)) {
            this.buckets.set(source, {
                tokens: this.configs[source].maxRequests,
                lastRefill: Date.now(),
            });
            this.queues.set(source, []);
        }
    }
    async refillBucket(source) {
        const config = this.configs[source];
        if (!config)
            return;
        const bucket = this.buckets.get(source);
        if (!bucket)
            return;
        const now = Date.now();
        const timePassed = now - bucket.lastRefill;
        const refills = Math.floor(timePassed / config.windowMs);
        if (refills > 0) {
            bucket.tokens = Math.min(config.maxRequests, bucket.tokens + refills * config.maxRequests);
            bucket.lastRefill = now;
        }
    }
    async waitForToken(source) {
        const config = this.configs[source];
        const bucket = this.buckets.get(source);
        if (!config || !bucket)
            return;
        await this.refillBucket(source);
        if (bucket.tokens < 1) {
            const waitTime = config.windowMs - (Date.now() - bucket.lastRefill);
            await this.sleep(Math.max(waitTime, 0));
            await this.refillBucket(source);
        }
    }
    consumeToken(source) {
        const bucket = this.buckets.get(source);
        if (bucket) {
            bucket.tokens -= 1;
        }
    }
    async sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    async throttle(source, fn) {
        const config = this.configs[source];
        if (!config) {
            return fn();
        }
        if (!this.buckets.has(source)) {
            this.buckets.set(source, {
                tokens: config.maxRequests,
                lastRefill: Date.now(),
            });
            this.queues.set(source, []);
        }
        return new Promise((resolve, reject) => {
            const queue = this.queues.get(source);
            queue.push({ fn, resolve, reject });
            this.processQueue(source);
        });
    }
    async processQueue(source) {
        if (this.processing.get(source))
            return;
        const queue = this.queues.get(source);
        if (!queue || queue.length === 0)
            return;
        this.processing.set(source, true);
        while (queue.length > 0) {
            await this.waitForToken(source);
            const request = queue[0];
            try {
                this.consumeToken(source);
                const result = await request.fn();
                request.resolve(result);
            }
            catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                if (err.message.includes('429')) {
                    const config = this.configs[source];
                    const retryAfter = config.retryAfter || config.windowMs;
                    await this.sleep(retryAfter);
                    continue;
                }
                request.reject(err);
            }
            finally {
                queue.shift();
            }
        }
        this.processing.set(source, false);
    }
    getWaitTime(source) {
        const config = this.configs[source];
        const bucket = this.buckets.get(source);
        if (!config || !bucket)
            return 0;
        if (bucket.tokens >= 1)
            return 0;
        return config.windowMs - (Date.now() - bucket.lastRefill);
    }
    reset(source) {
        const config = this.configs[source];
        if (config) {
            this.buckets.set(source, {
                tokens: config.maxRequests,
                lastRefill: Date.now(),
            });
        }
        this.queues.set(source, []);
    }
}
export const DEFAULT_CONFIGS = {
    anilist: {
        maxRequests: 90,
        windowMs: 60000,
        retryAfter: 60000,
    },
    jikan: {
        maxRequests: 3,
        windowMs: 1000,
        retryAfter: 1000,
    },
    kitsu: {
        maxRequests: 100,
        windowMs: 60000,
        retryAfter: 60000,
    },
    tmdb: {
        maxRequests: 40,
        windowMs: 1000,
        retryAfter: 1000,
    },
};
export const rateLimiter = new RateLimiter(DEFAULT_CONFIGS);
