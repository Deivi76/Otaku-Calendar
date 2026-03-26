import crypto from 'crypto';

export interface CacheOptions {
  ttl?: number;
  namespace?: string;
  useRedis?: boolean;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;
}

class InMemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private maxSize: number;
  private defaultTtl: number;

  constructor(maxSize: number = 500, defaultTtl: number = 300000) {
    this.maxSize = maxSize;
    this.defaultTtl = defaultTtl;
  }

  private evictIfNeeded(): void {
    if (this.cache.size >= this.maxSize) {
      const keysWithExpiry: Array<{ key: string; expiresAt: number }> = [];
      
      for (const [key, entry] of this.cache.entries()) {
        if (entry.expiresAt < Date.now()) {
          this.cache.delete(key);
        } else {
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

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttl: number = this.defaultTtl): void {
    this.evictIfNeeded();
    
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(namespace?: string): void {
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

  keys(pattern: string): string[] {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Array.from(this.cache.keys()).filter(key => regex.test(key));
  }
}

class RedisCache {
  private client: RedisClient;
  private namespace: string;

  constructor(url: string, namespace: string = 'crawler') {
    this.namespace = namespace;
    this.client = this.createClient(url);
  }

  private prefixKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  private createClient(url: string): RedisClient {
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
      async get(key: string): Promise<string | null> {
        return baseClient.get(prefixKeyFn(key));
      },
      
      async set(key: string, value: string, mode?: string, ttlSeconds?: number): Promise<void> {
        await baseClient.set(
          prefixKeyFn(key),
          value,
          mode,
          ttlSeconds
        );
      },
      
      async del(key: string): Promise<number> {
        return baseClient.del(prefixKeyFn(key));
      },
      
      async keys(pattern: string): Promise<string[]> {
        const keys = await baseClient.keys(prefixKeyFn(pattern));
        return keys.map(k => k.replace(`${ns}:`, ''));
      },
    };
  }

  private createRedisClient(url: string): RedisClient {
    let client: any = null;
    
    try {
      const { createClient } = require('redis');
      client = createClient({ url });
      
      client.on('error', (err: Error) => {
        console.error('[Cache] Redis error:', err.message);
      });
    } catch {
      throw new Error('Redis client not available. Install ioredis: npm i ioredis');
    }

    return {
      async get(key: string): Promise<string | null> {
        if (!client.isOpen) await client.connect();
        return client.get(key);
      },
      
      async set(key: string, value: string, mode?: string, ttlSeconds?: number): Promise<void> {
        if (!client.isOpen) await client.connect();
        await client.set(key, value, { mode, TTL: ttlSeconds });
      },
      
      async del(key: string): Promise<number> {
        if (!client.isOpen) await client.connect();
        return client.del(key);
      },
      
      async keys(pattern: string): Promise<string[]> {
        if (!client.isOpen) await client.connect();
        return client.keys(pattern);
      },
    };
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('[Cache] Redis get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const ttlSeconds = options?.ttl 
        ? Math.ceil(options.ttl / 1000) 
        : Math.ceil(300000 / 1000);
      
      await this.client.set(
        key,
        JSON.stringify(value),
        'EX',
        ttlSeconds
      );
    } catch (error) {
      console.error('[Cache] Redis set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('[Cache] Redis delete error:', error);
    }
  }

  async clear(namespace?: string): Promise<void> {
    try {
      const pattern = namespace ? `${namespace}*` : '*';
      const keys = await this.client.keys(pattern);
      
      for (const key of keys) {
        await this.client.del(key);
      }
    } catch (error) {
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

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  backend: 'memory' | 'redis';
}

export class CacheManager {
  private memoryCache: InMemoryCache;
  private redisCache: RedisCache | null = null;
  private useRedis: boolean = false;
  private stats: CacheStats = { hits: 0, misses: 0, size: 0, backend: 'memory' };

  constructor(redisUrl?: string) {
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
      } catch (error) {
        console.log('[Cache] Redis not available, using memory cache');
        this.useRedis = false;
      }
    } else {
      console.log('[Cache] Using in-memory cache');
    }
  }

  private getCache() {
    return this.useRedis && this.redisCache ? this.redisCache : this.memoryCache;
  }

  private getNamespacedKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key;
  }

  async get<T>(key: string, namespace?: string): Promise<T | null> {
    const namespacedKey = this.getNamespacedKey(key, namespace);
    const cache = this.getCache();
    
    try {
      const value = await cache.get<T>(namespacedKey);
      
      if (value !== null) {
        this.stats.hits++;
        return value;
      }
      
      this.stats.misses++;
      return null;
    } catch (error) {
      this.stats.misses++;
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const namespacedKey = this.getNamespacedKey(key, options?.namespace);
    const ttl = options?.ttl ?? 300000;
    
    if (this.useRedis && (options?.useRedis || (!options?.useRedis && this.redisCache)) && this.redisCache) {
      await this.redisCache.set(namespacedKey, value, { ttl });
    } else {
      this.memoryCache.set(namespacedKey, value, ttl);
    }
  }

  async delete(key: string, namespace?: string): Promise<void> {
    const namespacedKey = this.getNamespacedKey(key, namespace);
    const cache = this.getCache();
    await cache.delete(namespacedKey);
  }

  async clear(namespace?: string): Promise<void> {
    const cache = this.getCache();
    await cache.clear(namespace);
  }

  static generateCacheKey(url: string, params?: Record<string, unknown>): string {
    const hash = crypto.createHash('md5');
    hash.update(url);
    
    if (params) {
      hash.update(JSON.stringify(params));
    }
    
    return hash.digest('hex');
  }

  async cacheApiResponse<T>(
    source: string,
    endpoint: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const params = { source, endpoint };
    const cacheKey = CacheManager.generateCacheKey(endpoint, params);
    const namespacedKey = `api:${source}:${cacheKey}`;
    
    const cached = await this.get<T>(cacheKey, `api:${source}`);
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

  getStats(): CacheStats {
    this.stats.size = this.memoryCache.keys('*').length;
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats = { hits: 0, misses: 0, size: 0, backend: this.stats.backend };
  }

  isUsingRedis(): boolean {
    return this.useRedis;
  }
}

let cacheInstance: CacheManager | null = null;

export function getCache(redisUrl?: string): CacheManager {
  if (!cacheInstance) {
    cacheInstance = new CacheManager(redisUrl);
  }
  return cacheInstance;
}

export function createCache(redisUrl?: string): CacheManager {
  return new CacheManager(redisUrl);
}
