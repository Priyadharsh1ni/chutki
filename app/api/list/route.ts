import { NextResponse } from "next/server";
import { ensureTables, listMenus } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureTables();
    const menus = await listMenus(20);
    return NextResponse.json({ menus });
  } catch (e) {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}