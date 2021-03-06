import { EbbWeb } from "./ebbweb"
import { EmptyCache, InMemoryCache, RedisCache } from "./cache"
import { Abfuhrtermine } from "./abfuhrtermine"
import { Logger } from "@azure/functions";

const ebbweb = new EbbWeb;
// const cache = new RedisCache({
//     host: process.env['REDIS_HOST'],
//     port: Number(process.env['REDIS_PORT']),
//     password: process.env['REDIS_PASSWORD'],
//     defaultTTL: 21600
// });
// const cache = new EmptyCache;
const cache = new InMemoryCache(21600);

export const abfuhrtermine = (log: Logger) => new Abfuhrtermine(ebbweb, cache, log);