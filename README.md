# Invoice Data Extractor

A Next.js app that extracts structured data from PDF invoices using Google Gemini AI and stores results in Supabase.

## Features

- Upload PDF invoices or pick from example files
- AI-powered extraction via Google Gemini 2.5 Flash (supports German, French, English, and other languages)
- Displays extracted vendor/customer info, line items table, and totals
- Saves extracted data to a normalized Supabase database
- Supabase Studio, API, and Inbucket links in the header bar

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **UI**: shadcn/ui + Tailwind CSS v4
- **AI**: Google Gemini API (`@google/generative-ai`)
- **Database**: Supabase (Postgres) with generated TypeScript types

## Database Schema

Five normalized tables (no JSONB for structured data):

| Table | Purpose |
|---|---|
| `vendors` | Vendor/supplier info (name, address, tax_id, email, phone) |
| `customers` | Customer/buyer info (name, address, tax_id) |
| `invoices` | Invoice header (number, date, currency, totals, FK to vendor & customer) |
| `line_items` | Invoice line items (description, qty, unit_price, tax_rate, total) |
| `payment_info` | Payment details (IBAN, SWIFT, bank, terms) — 1:1 with invoice |

`invoices.raw_extraction` (JSONB) stores the full AI response as an archive.

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (for Supabase local)
- Supabase CLI (`npm i -g supabase`)
- A Google Gemini API key ([get one here](https://aistudio.google.com/apikey))

### Setup

```bash
# Install dependencies
npm install

# Start Supabase (uses custom ports 544xx to avoid conflicts)
npx supabase start

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

`.env.local` is pre-configured for local Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54421
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local anon key>
```

The Gemini API key is entered at runtime in the UI (stored in sessionStorage, never persisted server-side).

### Regenerate DB Types

After changing the schema:

```bash
npx supabase gen types typescript --local > lib/database.types.ts
```

## Local Supabase Ports

This project uses non-default ports to allow running alongside another Supabase project:

| Service | Port |
|---|---|
| API | 54421 |
| DB | 54422 |
| Studio | 54423 |
| Inbucket | 54424 |
| Analytics | 54427 |
| Pooler | 54429 |

## Project Structure

```
app/
├── page.tsx                          # Main page (file picker, extraction, results, saved list)
├── layout.tsx                        # Layout with Supabase links header
├── api/
│   ├── extract/route.ts              # POST: send PDF to Gemini, return structured JSON
│   ├── invoices/route.ts             # GET: list saved / POST: save to normalized tables
│   └── examples/
│       ├── route.ts                  # GET: list example PDFs
│       └── [filename]/route.ts       # GET: serve example PDF as base64
components/
├── api-key-input.tsx                 # Gemini API key input
├── file-picker.tsx                   # Drag-and-drop + example file buttons
├── invoice-details.tsx               # Extracted info cards (vendor, customer, totals)
├── invoice-table.tsx                 # Line items table with shadcn Table
└── ui/                               # shadcn/ui primitives
lib/
├── database.types.ts                 # Auto-generated Supabase types
├── supabase.ts                       # Typed Supabase client
└── types.ts                          # App-level TypeScript interfaces
supabase/
├── config.toml                       # Supabase config (custom ports)
└── migrations/
    └── 20260226_create_invoices.sql  # Schema: vendors, customers, invoices, line_items, payment_info
```
