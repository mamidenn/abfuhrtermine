import NodeCache = require("node-cache");
import { ClientOpts, RedisClient } from "redis";
import { promisify } from "util";

class AsyncRedisClient extends RedisClient {
    GETAsync = promisify(this.GET);
    SETEXAsync = promisify(this.SETEX);
}

export interface ICache {
    getItem<T>(key: string): Promise<T>
    setItem<T>(key: string, value: T, seconds?: number): Promise<string>
}

export type RedisCacheOptions = ClientOpts & {
    defaultTTL?: number;
}

export class RedisCache implements ICache {
    private redisClient: AsyncRedisClient;
    options: RedisCacheOptions;

    constructor(options: RedisCacheOptions) {
        this.options = Object.assign(options, {
            defaultTTL: options.defaultTTL ?? 10
        });
        this.redisClient = new AsyncRedisClient(this.options);
    }
    async getItem<T>(key: string) {
        return JSON.parse(await this.redisClient.GETAsync(key)) as T;
    }
    setItem<T>(key: string, value: T, seconds?: number) {
        return this.redisClient.SETEXAsync(key, seconds ?? this.options.defaultTTL, JSON.stringify(value));
    }
}

export class EmptyCache implements ICache {
    async getItem<T>(key: string): Promise<T> {
        return null;
    }
    async setItem<T>(key: string, value: T, seconds?: number): Promise<string> {
        return "OK";
    }
}

export class InMemoryCache implements ICache {
    private nodeCache: NodeCache;

    constructor(defaultTTL?: number) {
        this.nodeCache = new NodeCache({
            stdTTL: defaultTTL
        })
    }
    async getItem<T>(key: string): Promise<T> {
        return this.nodeCache.get<T>(key);
    }
    async setItem<T>(key: string, value: T, seconds?: number): Promise<string> {
        return this.nodeCache.set<T>(key, value, seconds) ? "OK" : "NOK";
    }
}