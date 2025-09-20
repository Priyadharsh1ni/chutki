# Home Chef Menu Extractor

A minimal end-to-end Next.js app to upload a `.txt` file (e.g., WhatsApp chat export), extract a structured menu via OpenAI, store it in Vercel Postgres, and display results.

## Tech Stack
- **Frontend**: Next.js App Router (React)
- **Backend**: Next.js API Routes
- **Database**: Vercel Postgres (@vercel/postgres)
- **AI Service**: OpenAI Chat Completions API
- **Validation**: zod

## Features
- **Upload .txt** file from the browser
- **Server-side AI processing** with a strict JSON prompt
- **Zod validation** of model output
- **Persistence** to Vercel Postgres
- **View menus** via a simple HTML view and a list on the homepage

## Setup
1. Clone repo and install deps:
   ```bash
   pnpm i # or npm i, yarn install
   ```
2. Copy env and set secrets:
   ```bash
   cp .env.example .env.local
   # Set OPENAI_API_KEY
   # Set Vercel Postgres env vars (or POSTGRES_URL to any Postgres)
   ```
3. Run dev server:
   ```bash
   pnpm dev # or npm run dev, yarn dev
   ```
4. Open http://localhost:3000

No prisma migration needed; tables are created lazily at runtime.

## Deployment (Vercel)
- Add project, set the same env vars on Vercel
- Deploy

## API
- `POST /api/process` – form-data with `file`: text/plain; calls OpenAI, validates, stores, returns `{ menuId, menu }`
- `GET /api/list` – returns recent menus `{ menus: [...] }`
- `GET /api/menu?id=123` – renders a simple HTML page for that menu

## Prompt design
The server builds a single prompt that:
- Asks the model to output JSON only matching a `Menu` schema
- Gives guidelines to ignore chat noise, pick currency, consolidate items
- Validates with Zod and rejects invalid responses

## Assumptions & limitations
- Extraction quality depends on input text
- Prices are stored as strings to preserve symbol/format
- Basic duplication consolidation relies on the model
- No auth; public demo scope

## Future improvements
- Better UI rendering of items and options
- Deduplication/normalization heuristics
- Add vendor detection heuristics
- Add pagination/search