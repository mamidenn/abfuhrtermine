import * as puppeteer from "puppeteer";
import * as moment from "moment";
import { Either, left, right } from "fp-ts/lib/Either";

export type Abfuhrkalender = {
  straße: string;
  nummer: string;
  stand: Date;
  restmüll: Date[];
  bio: Date[];
  papier: Date[];
  gelberSack: Date[];
};

export type HttpError = { code: number; message: string };

export class EbbWeb {
  async getDates(
    street: string,
    number: string
  ): Promise<Either<HttpError, Abfuhrkalender>> {
    const result = {
      straße: street,
      nummer: number,
      stand: moment().toDate(),
      restmüll: [],
      bio: [],
      papier: [],
      gelberSack: [],
    };

    const browser = await puppeteer.launch({
      headless: true,
      args: [
          "--disable-gpu",
          "--disable-dev-shm-usage",
          "--disable-setuid-sandbox",
          "--no-sandbox"
      ]
    });
    const page = await browser.newPage();
    const response = await page.goto(
      "https://ebbweb.stadt.bamberg.de/WasteManagementBamberg/WasteManagementServlet?SubmitAction=wasteDisposalServices&InFrameMode=TRUE"
    );
    if (!response.ok()) {
      throw new Error(`Got response status ${response.status()} from ebbweb`);
    }

    const getDatesFromColumn = async (selector: string) =>
      (
        await page.$$eval(selector, (elements) =>
          elements.map((element) => element.textContent)
        )
      ).map((content) => moment(content.substr(4, 10), "DD.MM.YYYY").toDate());

    await Promise.all([
      page.waitForNavigation(),
      page.select("select[name=Ort]", street.substr(0, 1)),
    ]);
    await page.select("select[name=Strasse]", street.replace(" ", "\xa0"));
    const numberInput = await page.$("input[name=Hausnummer]");
    await numberInput.click({ clickCount: 3 });
    await numberInput.type(number);
    await Promise.all([
      page.waitForNavigation(),
      page.click("a[name=forward]"),
    ]);

    if (!(await page.$("div#termineblock"))) {
      return left({
        code: 422,
        message: `ebbweb did not yield results for Straße ${street}, Nummer: ${number}`,
      });
    }

    result.restmüll.push(...(await getDatesFromColumn("td.workRest")));
    result.bio.push(...(await getDatesFromColumn("td.workBio")));
    result.papier.push(...(await getDatesFromColumn("td.workPapier")));
    result.gelberSack.push(...(await getDatesFromColumn("td.workGS")));

    await browser.close();

    return right(result);
  }
}
