# Handoff — dazewrks

## State
- Next.js 15 + Tailwind v4 + Supabase. `npm run build`, `tsc` and `eslint` pass.
- Smoke-tested in a headless browser (phone and desktop widths, local mode): day blocks save and reload, typing survives autosave, script line inference + changers + slash menu, song structure mode, multi-line book pages, work toggles.
- Not yet tested against a live Supabase project, on real devices, or with real microphone input.

## Next steps
1. Create a Supabase project, apply `supabase/migrations/0001_init.sql`, set env vars, add auth redirect URLs.
2. Test sign-in, recording (MediaRecorder → `media` bucket) and image upload end to end.
3. Deploy to Hostinger (Node.js plan, `npm run build` / `npm start`, env vars in the panel) and connect the domain.

## Decisions already made
- Every work is one `documents` row (JSON `data`); `document_members` reserved for collaborators/credits.
- Local mode when Supabase env vars are missing (localStorage + IndexedDB).
- Turning a work off in Profile only hides it; nothing is deleted.
- Recaps are events (reflection day, first 3 days of a month), not a tab. AI summaries deferred.
- UI rule: no helper text; one use should teach each element.
