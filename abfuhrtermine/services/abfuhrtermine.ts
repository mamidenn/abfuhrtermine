import { Logger } from "@azure/functions";
import { ICache } from "./cache";
import { Abfuhrkalender, EbbWeb } from "./ebbweb";
import { right } from "fp-ts/lib/Either"

export class Abfuhrtermine {
    private ebbweb: EbbWeb
    private cache: ICache

    constructor(ebbweb: EbbWeb, cache: ICache, log: Logger) {
        this.ebbweb = ebbweb;
        this.cache = cache;
        this.log = log;
    }
    async getAbfuhrtermine(street: string, number: string) {
        this.log(`Got request for Straße: ${street}, Nummer: ${number}..`)

        const key = `${street} ${number}`
        const cached = await this.cache.getItem<Abfuhrkalender>(key);

        if (cached) {
            this.log("Serving from cache.")
            return right(cached);
        }

        this.log("Retrieving from ebbweb.")
        let response = await this.ebbweb.getDates(street, number);
        if (response._tag == "Right") {
            await this.cache.setItem<Abfuhrkalender>(key, response.right)
        }
        return response;

    }
    log: Logger
}