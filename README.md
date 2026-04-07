# AI Chat

A full-featured ChatGPT-like chatbot interface built with Next.js, Supabase, and the OpenAI API.

## Features

- **Streaming responses** — real-time token-by-token output via Vercel AI SDK
- **Multi-LLM ready** — defaults to `gpt-5.4-mini`, configurable via env var
- **Image support** — paste or attach images (vision), sent directly to OpenAI
- **Document support** — upload PDF/TXT files; text is extracted and injected as context
- **Auth** — email/password signup & login via Supabase Auth
- **Anonymous access** — 3 free questions without an account
- **Persistent chat history** — sidebar with all past conversations
- **Cross-tab sync** — new chats appear in other open tabs via Supabase Realtime
- **Markdown rendering** — code blocks with syntax highlighting
- **Responsive** — works on mobile with a collapsible sidebar

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) + TanStack Query v5 |
| UI | shadcn/ui + Tailwind CSS v4 |
| AI | Vercel AI SDK v6 + OpenAI `gpt-5.4-mini` |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime |
| Storage | Supabase Storage (images) |
| Deployment | Railway (Railpack) |

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url>
cd ai-chat
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the migrations **in order**:
   ```
   supabase/migrations/001_init.sql
   supabase/migrations/002_rls.sql
   ```
3. Go to **Authentication → Configuration** and set **JWT expiry** to `604800` (7 days) so sessions last as long as the auth cookie.
5. Grab your keys from **Project Settings → API Keys**:
   - `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` — your project URL
   - `SUPABASE_SECRET_KEY` — the **secret key** (`sb_secret_...`)
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — the **publishable key** (`sb_publishable_...`)

### 3. Configure environment variables

```bash
cp .env.example .env.local
# Fill in all values
```

Required variables:
```
SUPABASE_URL
SUPABASE_SECRET_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
OPENAI_API_KEY
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment (Railway)

1. Push your code to GitHub
2. Create a new project on [Railway](https://railway.app)
3. Connect your GitHub repo
4. Add all environment variables from `.env.example`
5. Railway builds with **Railpack** automatically (configured in `railway.toml`)
6. The app starts via `node .next/standalone/server.js` with a health check at `/api/health`

## Architecture

```
app/
├── api/                    # REST API routes (all DB access here only)
│   ├── auth/               # login, signup, logout, me
│   ├── chats/[chatId]/     # CRUD + streaming messages
│   ├── uploads/            # image & document uploads
│   └── anonymous/session/  # free question tracking
├── (auth)/                 # login & signup pages
└── (app)/                  # authenticated app shell
    └── chat/[chatId]/      # chat conversation view

lib/
├── supabase/server.ts           # Service-role client (API routes only)
├── supabase/realtime-client.ts  # Anon client (browser Realtime only)
├── db/                          # DB query functions
├── auth/session.ts              # JWT session helpers
└── openai.ts                    # Model name constant
```

**Document handling:** Uploaded PDFs and text files are processed server-side with `unpdf` — extracted text is stored in the DB and injected into the system prompt. No embeddings, no vector search, no OpenAI Files API.

**Security:** `SUPABASE_SECRET_KEY` and `OPENAI_API_KEY` are never exposed to the browser — all DB and AI calls go through Next.js API routes. Only the Supabase publishable key is exposed client-side (for Realtime only).

## Development

```bash
npm run dev        # start dev server
npm run check      # lint + format check (Biome)
npm run lint:fix   # auto-fix lint issues
```
