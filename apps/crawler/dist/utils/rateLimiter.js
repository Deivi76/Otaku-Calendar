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
            const MAX_RETRIES = 1;
            const BASE_DELAY = 1000;
            const MAX_DELAY = 60000;
            const JITTER = 1000;
            let retries = 0;
            while (retries < MAX_RETRIES) {
                try {
                    this.consumeToken(source);
                    const result = await request.fn();
                    request.resolve(result);
                    queue.shift();
                    break;
                }
                catch (error) {
                    const err = error instanceof Error ? error : new Error(String(error));
                    const isRetryable = err.message.includes('429') ||
                        err.message.match(/5\d{2}/);
                    if (isRetryable && retries < MAX_RETRIES - 1) {
                        const delay = Math.min(BASE_DELAY * Math.pow(2, retries) + Math.random() * JITTER, MAX_DELAY);
                        console.log(`[RateLimiter] ${source}: Retry ${retries + 1}/${MAX_RETRIES} after ${Math.round(delay)}ms`);
                        await this.sleep(delay);
                        retries++;
                        continue;
                    }
                    request.reject(err);
                    queue.shift();
                    break;
                }
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
        maxRequests: 30,
        windowMs: 60000,
        retryAfter: 60000,
    },
    jikan: {
        maxRequests: 3,
        windowMs: 1000,
        retryAfter: 1500,
    },
    kitsu: {
        maxRequests: 50,
        windowMs: 60000,
        retryAfter: 60000,
    },
    tmdb: {
        maxRequests: 30,
        windowMs: 1000,
        retryAfter: 1500,
    },
    mangadex: {
        maxRequests: 5,
        windowMs: 1000,
        retryAfter: 2000,
    },
};
export const rateLimiter = new RateLimiter(DEFAULT_CONFIGS);
