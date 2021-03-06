import { AzureFunction, Context, HttpRequest, Logger } from "@azure/functions"
import * as puppeteer from 'puppeteer';
import * as moment from 'moment';
import { RedisClient } from 'redis';
import { promisify } from 'util';

type AbfuhrKalender = {
    straße: string,
    nummer: string,
    restmüll: Date[],
    bio: Date[],
    papier: Date[],
    gelberSack: Date[]
};

class AsyncRedisClient extends RedisClient {
    GETAsync = promisify(this.GET);
    SETEXAsync = promisify(this.SETEX);
}

const redisClient = new AsyncRedisClient({
    host: process.env['REDIS_HOST'],
    port: Number(process.env['REDIS_PORT']),
    password: process.env['REDIS_PASSWORD'],
});


const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const street = (req.query.straße || (req.body && req.body.straße));
    const number = (req.query.nummer || (req.body && req.body.nummer));

    if (street === undefined || number === undefined) {
        context.res = { status: 400 };
        return;
    }
    context.log(`Got request for Straße: ${street}, Nummer: ${number}..`)

    redisClient.on("error", (err) => context.log(err));

    const key = `${street} ${number}`
    const cached = await redisClient.GETAsync(key);

    let response: AbfuhrKalender;
    if (cached) {
        context.log("Serving from cache.")
        response = JSON.parse(cached);
    }
    else {
        context.log("Retrieving from ebbweb.")
        response = await getDates(street, number, context.log);
        await redisClient.SETEXAsync(key, 21600, JSON.stringify(response))
    }
    context.res = {
        headers: {
            'Content-Type': 'application/json'
        },
        body: response
    };
};

const getDates = async (street: string, number: string, log: Logger) => {

    const browser = await puppeteer.launch(
        { args: process.env['PuppeteerArguments']?.split(' ') }
    );
    const page = await browser.newPage();
    const response = await page.goto('https://ebbweb.stadt.bamberg.de/WasteManagementBamberg/WasteManagementServlet?SubmitAction=wasteDisposalServices&InFrameMode=TRUE');
    log(`ebbweb.stadt.bamberg.de returned ${response.status()}`)

    await Promise.all([
        page.waitForNavigation(),
        page.select('select[name=Ort]', street.substr(0, 1))
    ])
    await page.select('select[name=Strasse]', street.replace(' ', '\xa0'));
    await page.type('input[name=Hausnummer]', number);
    await Promise.all([
        page.waitForNavigation(),
        page.click('a[name=forward]'),
    ]);

    const getDatesFromColumn = async (selector: string) =>
        (await page.$$eval(selector, elements => elements.map(element => element.textContent)))
            .map(content => moment(content.substr(4, 10), 'DD.MM.YYYY').toDate());

    const [restmüll, bio, papier, gelberSack] = await Promise.all([
        getDatesFromColumn('td.workRest'),
        getDatesFromColumn('td.workBio'),
        getDatesFromColumn('td.workPapier'),
        getDatesFromColumn('td.workGS')
    ]);

    await browser.close();

    return {
        straße: street,
        nummer: number,
        restmüll: restmüll,
        bio: bio,
        papier: papier,
        gelberSack: gelberSack
    }
};

export default httpTrigger;