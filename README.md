# GC Rankings

Rank the people in your group chats across any category you invent
(Performativeness, Funniest, Best Hoopers, Stupidest), then see everyone
land on an interactive node map.

## Stack

- Next.js 15 (App Router) + TypeScript + React 19
- Tailwind CSS 3 + motion (Framer Motion)
- Persistence: localStorage today, Supabase drop-in later (see below)
- Deploy: Vercel

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Features

- Home hub: create group chats, seed a roster.
- Group hub (`/gc/[id]`): manage the roster, see every ranking as a card.
- Ranking editor (`/gc/[id]/rank/[rankId]`): order people with move
  up / down / top / bottom. Autosaves.
- Node map (`/gc/[id]/map`): every person is a draggable node. Hover to
  enlarge. Switch "Position by" between Overall and any single ranking.
  Overall map: x = overall standing, y = consistency vs volatility.

## Data layer

All reads/writes go through `src/lib/store.ts`, an async interface backed
by localStorage. To move to Supabase for cross-device sync, implement the
same `Store` surface against `@supabase/supabase-js` and swap the export.
Suggested tables: `group_chats`, `people`, `rankings` (with `order` as a
`text[]` of person ids). No component changes required.

_Auto-deploy connected via Vercel + GitHub._
