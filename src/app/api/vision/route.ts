import { scrapeBill } from "../../../lib/scrapeBill";

export async function POST(req: Request) {
  const { billUrl } = await req.json();

  const output = await scrapeBill({
    billUrl,
  });


  return Response.json(output);
}
