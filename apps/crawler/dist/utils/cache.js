import crypto from 'crypto';
class InMemoryCache {
    cache = new Map();
    maxSize;
    defaultTtl;
    constructor(maxSize = 500, defaultTtl = 300000) {
        this.maxSize = maxSize;
        this.defaultTtl = defaultTtl;
    }
    evictIfNeeded() {
        if (this.cache.size >= this.maxSize) {
            const keysWithExpiry = [];
            for (const [key, entry] of this.cache.entries()) {
                if (entry.expiresAt < Date.now()) {
                    this.cache.delete(key);
                }
                else {
                    keysWithExpiry.push({ key, expiresAt: entry.expiresAt });
                }
            }
            if (this.cache.size >= this.maxSize) {
                keysWithExpiry.sort((a, b) => a.expiresAt - b.expiresAt);
                const toRemove = Math.floor(this.maxSize * 0.2);
                for (let i = 0; i < toRemove && i < keysWithExpiry.length; i++) {
                    this.cache.delete(keysWithExpiry[i].key);
                }
            }
        }
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        if (entry.expiresAt < Date.now()) {
            this.cache.delete(key);
            return null;
        }
        return entry.value;
    }
    set(key, value, ttl = this.defaultTtl) {
        this.evictIfNeeded();
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + ttl,
        });
    }
    delete(key) {
        this.cache.delete(key);
    }
    clear(namespace) {
        if (!namespace) {
            this.cache.clear();
            return;
        }
        for (const key of this.cache.keys()) {
            if (key.startsWith(namespace)) {
                this.cache.delete(key);
            }
        }
    }
    keys(pattern) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return Array.from(this.cache.keys()).filter(key => regex.test(key));
    }
}
class RedisCache {
    client;
    namespace;
    constructor(url, namespace = 'crawler') {
        this.namespace = namespace;
        this.client = this.createClient(url);
    }
    prefixKey(key) {
        return `${this.namespace}:${key}`;
    }
    createClient(url) {
        let redisUrl = url;
        if (process.env.REDIS_HOST && process.env.REDIS_PORT) {
            const host = process.env.REDIS_HOST;
            const port = process.env.REDIS_PORT;
            const password = process.env.REDIS_PASSWORD || '';
            const db = process.env.REDIS_DB || '0';
            redisUrl = password
                ? `redis://:${password}@${host}:${port}/${db}`
                : `redis://${host}:${port}/${db}`;
        }
        const ns = this.namespace;
        const prefixKeyFn = this.prefixKey.bind(this);
        const baseClient = this.createRedisClient(redisUrl);
        return {
            async get(key) {
                return baseClient.get(prefixKeyFn(key));
            },
            async set(key, value, mode, ttlSeconds) {
                await baseClient.set(prefixKeyFn(key), value, mode, ttlSeconds);
            },
            async del(key) {
                return baseClient.del(prefixKeyFn(key));
            },
            async keys(pattern) {
                const keys = await baseClient.keys(prefixKeyFn(pattern));
                return keys.map(k => k.replace(`${ns}:`, ''));
            },
        };
    }
    createRedisClient(url) {
        let client = null;
        try {
            const { createClient } = require('redis');
            client = createClient({ url });
            client.on('error', (err) => {
                console.error('[Cache] Redis error:', err.message);
            });
        }
        catch {
            throw new Error('Redis client not available. Install ioredis: npm i ioredis');
        }
        return {
            async get(key) {
                if (!client.isOpen)
                    await client.connect();
                return client.get(key);
            },
            async set(key, value, mode, ttlSeconds) {
                if (!client.isOpen)
                    await client.connect();
                await client.set(key, value, { mode, TTL: ttlSeconds });
            },
            async del(key) {
                if (!client.isOpen)
                    await client.connect();
                return client.del(key);
            },
            async keys(pattern) {
                if (!client.isOpen)
                    await client.connect();
                return client.keys(pattern);
            },
        };
    }
    async get(key) {
        try {
            const value = await this.client.get(key);
            if (!value)
                return null;
            return JSON.parse(value);
        }
        catch (error) {
            console.error('[Cache] Redis get error:', error);
            return null;
        }
    }
    async set(key, value, options) {
        try {
            const ttlSeconds = options?.ttl
                ? Math.ceil(options.ttl / 1000)
                : Math.ceil(300000 / 1000);
            await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        }
        catch (error) {
            console.error('[Cache] Redis set error:', error);
        }
    }
    async delete(key) {
        try {
            await this.client.del(key);
        }
        catch (error) {
            console.error('[Cache] Redis delete error:', error);
        }
    }
    async clear(namespace) {
        try {
            const pattern = namespace ? `${namespace}*` : '*';
            const keys = await this.client.keys(pattern);
            for (const key of keys) {
                await this.client.del(key);
            }
        }
        catch (error) {
            console.error('[Cache] Redis clear error:', error);
        }
    }
}
export const DEFAULT_TTL = {
    schedule: 3600000,
    details: 86400000,
    list: 1800000,
    search: 900000,
    default: 300000,
};
export class CacheManager {
    memoryCache;
    redisCache = null;
    useRedis = false;
    stats = { hits: 0, misses: 0, size: 0, backend: 'memory' };
    constructor(redisUrl) {
        const maxSize = parseInt(process.env.CACHE_MAX_SIZE || '500', 10);
        const defaultTtl = parseInt(process.env.CACHE_DEFAULT_TTL || '300000', 10);
        this.memoryCache = new InMemoryCache(maxSize, defaultTtl);
        if (redisUrl || process.env.REDIS_URL || process.env.REDIS_HOST) {
            try {
                const url = redisUrl || process.env.REDIS_URL || '';
                this.redisCache = new RedisCache(url, 'crawler');
                this.useRedis = true;
                this.stats.backend = 'redis';
                console.log('[Cache] Using Redis backend');
            }
            catch (error) {
                console.log('[Cache] Redis not available, using memory cache');
                this.useRedis = false;
            }
        }
        else {
            console.log('[Cache] Using in-memory cache');
        }
    }
    getCache() {
        return this.useRedis && this.redisCache ? this.redisCache : this.memoryCache;
    }
    getNamespacedKey(key, namespace) {
        return namespace ? `${namespace}:${key}` : key;
    }
    async get(key, namespace) {
        const namespacedKey = this.getNamespacedKey(key, namespace);
        const cache = this.getCache();
        try {
            const value = await cache.get(namespacedKey);
            if (value !== null) {
                this.stats.hits++;
                return value;
            }
            this.stats.misses++;
            return null;
        }
        catch (error) {
            this.stats.misses++;
            return null;
        }
    }
    async set(key, value, options) {
        const namespacedKey = this.getNamespacedKey(key, options?.namespace);
        const ttl = options?.ttl ?? 300000;
        if (this.useRedis && (options?.useRedis || (!options?.useRedis && this.redisCache)) && this.redisCache) {
            await this.redisCache.set(namespacedKey, value, { ttl });
        }
        else {
            this.memoryCache.set(namespacedKey, value, ttl);
        }
    }
    async delete(key, namespace) {
        const namespacedKey = this.getNamespacedKey(key, namespace);
        const cache = this.getCache();
        await cache.delete(namespacedKey);
    }
    async clear(namespace) {
        const cache = this.getCache();
        await cache.clear(namespace);
    }
    static generateCacheKey(url, params) {
        const hash = crypto.createHash('md5');
        hash.update(url);
        if (params) {
            hash.update(JSON.stringify(params));
        }
        return hash.digest('hex');
    }
    async cacheApiResponse(source, endpoint, fetchFn, ttl) {
        const params = { source, endpoint };
        const cacheKey = CacheManager.generateCacheKey(endpoint, params);
        const namespacedKey = `api:${source}:${cacheKey}`;
        const cached = await this.get(cacheKey, `api:${source}`);
        if (cached !== null) {
            return cached;
        }
        const result = await fetchFn();
        const finalTtl = ttl || DEFAULT_TTL.default;
        await this.set(cacheKey, result, {
            namespace: `api:${source}`,
            ttl: finalTtl,
        });
        return result;
    }
    getStats() {
        this.stats.size = this.memoryCache.keys('*').length;
        return { ...this.stats };
    }
    resetStats() {
        this.stats = { hits: 0, misses: 0, size: 0, backend: this.stats.backend };
    }
    isUsingRedis() {
        return this.useRedis;
    }
}
let cacheInstance = null;
export function getCache(redisUrl) {
    if (!cacheInstance) {
        cacheInstance = new CacheManager(redisUrl);
    }
    return cacheInstance;
}
export function createCache(redisUrl) {
    return new CacheManager(redisUrl);
}
