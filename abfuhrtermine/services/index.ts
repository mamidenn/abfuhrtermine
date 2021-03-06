import { EbbWeb } from "./ebbweb"
import { InMemoryCache } from "./cache"
import { Abfuhrtermine } from "./abfuhrtermine"
import { Logger } from "@azure/functions";

const ebbweb = new EbbWeb;
const cache = new InMemoryCache(21600);

export const abfuhrtermine = (log: Logger) => new Abfuhrtermine(ebbweb, cache, log);