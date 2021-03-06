import NodeCache = require("node-cache");

export interface ICache {
    getItem<T>(key: string): Promise<T>
    setItem<T>(key: string, value: T, seconds?: number): Promise<string>
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