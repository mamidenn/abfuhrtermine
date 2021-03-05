import { AzureFunction, Context, HttpRequest, Logger } from "@azure/functions"
import * as puppeteer from 'puppeteer';
import * as moment from 'moment';

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('HTTP trigger function processed a request.');
    const street = (req.query.straße || (req.body && req.body.straße));
    const number = (req.query.nummer || (req.body && req.body.nummer));

    if (street === undefined || number === undefined) {
        context.res = { status: 400 };
        return;
    }
    context.res = {
        // status: 200, /* Defaults to 200 */
        headers: {
            'Content-Type': 'application/json'
        },
        body: await getDates(street, number, context.log)
    };

};

const getDates = async (street: string, number: string, log: Logger) => {
    log(`Straße: ${street}, Nummer: ${number}..`)
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
        await getDatesFromColumn('td.workRest'),
        await getDatesFromColumn('td.workBio'),
        await getDatesFromColumn('td.workPapier'),
        await getDatesFromColumn('td.workGS')
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