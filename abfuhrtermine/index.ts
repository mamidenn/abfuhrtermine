import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { abfuhrtermine } from "./services"

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const street = (req.query.straße || (req.body && req.body.straße));
    const number = (req.query.nummer || (req.body && req.body.nummer));

    if (street === undefined || number === undefined) {
        context.res = { status: 400 };
        return;
    }

    const response = await abfuhrtermine(context.log).getAbfuhrtermine(street, number);
    switch (response._tag) {
        case "Left":
            context.log(`WARNING: ${response.left.message}`);
            context.res = {
                status: response.left.code
            };
            break;
        case "Right":
            context.res = {
                headers: {
                    'Content-Type': 'application/json'
                },
                body: response.right
            };
            break;
    }
};

export default httpTrigger;