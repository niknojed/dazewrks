# dazewrks — Notebook

Daily notes in monthly files, voice memos, a screenplay editor, a music workspace and picture-book writing. Next.js 15 (App Router) + Tailwind v4 + Supabase.

## Run it

```bash
npm install
cp .env.example .env.local   # optional: leave empty for local mode
npm run dev
```

- **Local mode** (no Supabase env vars): everything saves in this browser — documents in `localStorage`, audio and images in IndexedDB. No sign-in.
- **Cloud mode**: set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, then apply `supabase/migrations/0001_init.sql` (Supabase SQL editor or `supabase db push`). Sign-in is by email link; add `https://<your-domain>/auth/callback` (and `http://localhost:3000/auth/callback`) to Auth → URL Configuration → Redirect URLs.

## Structure

```
src/app/(app)/          signed-in app (shell: sidebar on web, tab bar on phone)
  page.tsx              Notebook library (months, today, events)
  m/[month]/            a month file: day blocks + voice memos
  today/                opens today's block
  reflect/  recap/      weekly reflection and monthly recap (shown as events)
  script/  music/  book/  works (can be turned off in Profile)
  profile/              name, works on/off, appearance, reflection day
src/app/login, auth/callback   email-link sign-in
src/lib/backend.ts      Supabase backend + local fallback (same interface)
src/lib/store.tsx       AppProvider, useDoc (debounced autosave, retry, on-device backup), useDocList, patchDoc
src/lib/media.ts        useRecorder (MediaRecorder → upload, waveform peaks), useMediaUrl, uploadImage
src/lib/screenplay.ts   Fountain-style line inference, pagination, shot/transition options
src/components/ui.tsx   icons, AutoTextarea, AudioPill, RecordButton, Sheet, Segmented, Chip
supabase/migrations     schema, RLS, storage bucket
```

## Data model

Every work is a row in `documents` (`kind` = month | script | music | book, `key` = '10.26' or 'main', JSON `data`). Rows have one owner and optional `document_members` (role + credit) so collaborators and shared credits can be added later without migrating. Media lives in the private `media` bucket under `<user id>/…`.

## Known limits (v1)

- One script, one music workspace, one book per account (`key: 'main'`). The schema already supports more.
- Last write wins if the same document is edited in two tabs at once.
- Monthly/seasonal AI summaries are not built; the recap screen shows stats and the month's titled days.
- Media storage policies only allow the owner's folder. When collaborators arrive, add a storage policy that checks `document_members` for shared media.
