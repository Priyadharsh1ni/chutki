import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { MenuSchema, Menu } from "@/lib/schema";
import { ensureTables, insertMenu } from "@/lib/db";

export const runtime = "nodejs";

const OutputSchema = MenuSchema;

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function buildPrompt(text: string) {
  return `You are an expert data extraction assistant.
Extract a structured "Home Chef" style menu from the provided text. Return STRICT JSON that matches this TypeScript type:

type Menu = {
  vendor?: string;
  currency?: string; // e.g., "INR", "USD", or symbol like "Rs" / "₹"
  items: {
    name: string; // dish name
    category?: string; // e.g., "Veg", "Non-Veg", "Starter", "Main Course"
    description?: string;
    price?: string | number; // if multiple prices exist, choose the most likely single price or omit
    options?: { label: string; price?: string | number }[]; // optional variants
  }[];
}

Guidelines:
- If the text is a WhatsApp chat export, ignore non-menu chatter and timestamps.
- Consolidate duplicate items and prefer the clearest naming.
- Detect currency symbols such as Rs, ₹, $, INR and set currency accordingly.
- Keep descriptions short if present; it's ok to omit.
- If menu-like items are absent, return an empty items array.
- Respond with ONLY JSON. No markdown, no backticks, no commentary.

Text:
---
${text}
---`;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return new NextResponse("Missing file", { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const text = buf.toString("utf-8");

    // Call Gemini server-side
    if (!process.env.GEMINI_API_KEY) {
      return new NextResponse("GEMINI_API_KEY not configured", { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: MODEL,
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
      },
    });

    // Retry on 429 respecting RetryInfo if provided
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const parseRetryDelaySeconds = (err: any): number | null => {
      try {
        const details: any[] | undefined = err?.errorDetails || err?.response?.errorDetails;
        if (Array.isArray(details)) {
          const retryInfo = details.find((d) => d?.["@type"]?.includes("RetryInfo"));
          const delay = retryInfo?.retryDelay as string | undefined; // e.g., "43s"
          if (delay && /^(\d+)(?:\.(\d+))?s$/.test(delay)) {
            const m = delay.match(/^(\d+)(?:\.(\d+))?s$/)!;
            const secs = parseInt(m[1], 10);
            return Number.isFinite(secs) ? secs : null;
          }
        }
      } catch {}
      return null;
    };

    const generateWithRetry = async (): Promise<string> => {
      let lastErr: any;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const result = await model.generateContent(buildPrompt(text));
          const raw = result.response.text().trim();
          if (!raw) throw new Error("Empty response from model");
          return raw;
        } catch (e: any) {
          lastErr = e;
          const status = e?.status || e?.response?.status;
          if (status === 429) {
            const delaySecs = parseRetryDelaySeconds(e) ?? (2 ** attempt) * 2; // 2,4,8s
            await sleep(Math.min(delaySecs, 30) * 1000);
            continue;
          }
          break;
        }
      }
      throw lastErr;
    };

    const raw = await generateWithRetry();
    if (!raw) {
      return new NextResponse("Empty response from model", { status: 502 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      // Try to salvage by extracting the first JSON block
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) {
        return new NextResponse("Model did not return valid JSON", { status: 502 });
      }
      parsed = JSON.parse(match[0]);
    }

    // Validate with Zod
    const result2 = OutputSchema.safeParse(parsed);
    if (!result2.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: result2.error.issues, raw },
        { status: 422 }
      );
    }

    const menu: Menu = result2.data;

    await ensureTables();
    const menuId = await insertMenu(menu);

    return NextResponse.json({ ok: true, menuId, menu });
  } catch (err: any) {
    console.error("/api/process error", err);
    return new NextResponse("Server error", { status: 500 });
  }
}