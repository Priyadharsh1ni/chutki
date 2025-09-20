import { NextRequest, NextResponse } from "next/server";
import { ensureTables, getMenu } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  if (!id) return new NextResponse("Missing id", { status: 400 });
  await ensureTables();
  const menu = await getMenu(id);
  if (!menu) return new NextResponse("Not found", { status: 404 });

  // Render a simple HTML page for quick viewing
  const itemsHtml = (menu.items as any[]).map((it) => {
    const options = it.options ? JSON.stringify(it.options) : "";
    return `<tr>
      <td>${it.name ?? ""}</td>
      <td>${it.category ?? ""}</td>
      <td>${it.description ?? ""}</td>
      <td>${it.price ?? ""}</td>
      <td>${options}</td>
    </tr>`;
  }).join("");

  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Menu #${menu.id}</title>
      <style>
        body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding: 24px; max-width: 960px; margin: 0 auto; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #eee; padding: 8px; text-align: left; vertical-align: top; }
        th { background: #fafafa; }
      </style>
    </head>
    <body>
      <h1>Menu #${menu.id}</h1>
      <div>Vendor: ${menu.vendor ?? "Unknown"}</div>
      <div>Currency: ${menu.currency ?? "-"}</div>
      <h2>Items</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th><th>Category</th><th>Description</th><th>Price</th><th>Options</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    </body>
  </html>`;

  return new NextResponse(html, { headers: { "content-type": "text/html" } });
}