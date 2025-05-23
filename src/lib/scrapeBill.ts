import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import dedent from "dedent";
import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"

const model = openai("gpt-4.1-mini")

export const extractSchema = z.object({
  businessName: z
    .string()
    .nullable()
    .optional()
    .describe("Name of the business where the bill was created"),
  date: z
    .string()
    .nullable()
    .optional()
    .describe("Date of the receipt in YYYY-MM-DD format. Return null if the date is missing or unreadable"),
  billItems: z
    .array(
      z.object({
        name: z.string().describe("Name or description of the item as shown on the receipt"),
        units: z.number().describe("Quantity or number of units purchased for this item"),
        unitPrice: z.number().describe("Price per unit of the item in decimal format"),
        price: z.number().describe("Total price for this item (units × unitPrice), in decimal format"),
      })
    )
    .describe("List of items in the bill"),
  tax: z
    .number()
    .nullable()
    .optional()
    .describe("Any additional monetary charge such as tax, service fee, or delivery fee. Do not extract percentages, only actual money amounts")
  ,
  tip: z
    .number()
    .nullable()
    .optional()
    .describe("Service charge or tip (usually 10% in Brazil). Only extract the amount in currency, never the percentage. If more than one value is shown, return the medium one")

});


export type ExtractSchemaType = z.infer<typeof extractSchema>;

const systemPrompt = dedent`
  You are an expert at extracting information from receipts.

  Your task:
  1. Analyze the receipt image provided
  2. Extract all relevant billing information
  3. Format the data in a structured way

  Guidelines for extraction:
  - Identify the restaurant/business name and location if available otherwise just return null
  - Find the receipt date or return null, date format should be YYYY-MM-DD but if day it's less than 10 don't add a 0 in front
  - Extract each item with its name and total price
  - Capture tax amount, if applicable and not percentage but the money amount otherwise return null
  - Identify any tips or gratuities, if multiple tips are shown just output the medium one otherwise return null
  - Ensure all numerical values are accurate
  - Convert all prices to decimal numbers
  
  IMPORTANT: Extract ONLY the information visible in the receipt. Do not make assumptions about missing data.
`;

export async function scrapeBill({
  billUrl,
}: {
  billUrl: string;
}): Promise<ExtractSchemaType> {

  try {
    const messages = [
      {
        role: "user",
        content: [
          {
            type: "image",
            image: billUrl,
            providerOptions: {
              openai: { imageDetail: "high" },
            },
          },
        ],
      },
    ];

    const result = await generateObject({
      model,
      schema: extractSchema,
      system: systemPrompt,
      // @ts-ignore
      messages,
    });

    // Verifica se o resultado realmente possui o objeto esperado
    if (!result?.object || typeof result.object !== "object") {
      console.log(result)
      throw new Error("Estrutura de resposta inválida ou ausente");
    }

    return result.object;
  } catch (error: any) {
    console.error("Erro ao extrair informações da nota fiscal:", error.message || error);
    throw new Error("Não foi possível extrair os dados do recibo. Verifique a imagem e tente novamente.");
  }
}
