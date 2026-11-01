'use client';

import { Suspense, use, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { patchDoc, useApp, useDoc } from '@/lib/store';
import { useRecorder } from '@/lib/media';
import type { AudioBlock, Block, DayBlock, MonthDoc, MusicDoc, ScriptDoc } from '@/lib/types';
import { DAYS, monthFromId, today, uid } from '@/lib/util';
import { AudioPill, AutoTextarea, type AutoTextareaHandle, Icon, IconButton, RecordButton, SaveDot, Sheet } from '@/components/ui';

const MONTH_RE = /^\d{2}\.\d{2}$/;

export default function MonthPage({ params }: { params: Promise<{ month: string }> }) {
  const { month } = use(params);
  const router = useRouter();
  if (!MONTH_RE.test(month)) {
    return <p className="px-6 py-16 text-muted">That month doesn’t exist.</p>;
  }
  return <Suspense><MonthFile key={month} id={month} onBack={() => router.push('/')} /></Suspense>;
}

function MonthFile({ id, onBack }: { id: string; onBack: () => void }) {
  const search = useSearchParams();
  const router = useRouter();
  const { say } = useApp();
  const { data, update, status } = useDoc<MonthDoc>('month', id, () => ({ blocks: [] }), () => id);
  const recorder = useRecorder();
  const titleRefs = useRef(new Map<string, HTMLInputElement>());
  const [pendingFocus, setPendingFocus] = useState<string | null>(null);
  const [sheetFor, setSheetFor] = useState<Block | null>(null);
  const t = today();
  const isCurrent = id === t.id;
  const info = monthFromId(id);

  /** Make sure today's block exists (current month only) and focus its title. */
  const openToday = useCallback(() => {
    if (!isCurrent) { router.push('/today'); return; }
    const existing = data?.blocks.find((b) => b.kind === 'day' && b.day === t.day);
    if (existing) { setPendingFocus(existing.id); return; }
    const blk: DayBlock = { id: uid('b'), kind: 'day', day: t.day, wd: t.wd, title: '', body: '' };
    update((d) => (d.blocks.some((b) => b.kind === 'day' && b.day === t.day) ? d : { blocks: [blk, ...d.blocks] }));
    setPendingFocus(blk.id);
  }, [isCurrent, router, update, data, t.day, t.wd]);

  // Arriving via "day N".
  const handledToday = useRef(false);
  useEffect(() => {
    if (!data || handledToday.current || search.get('today') !== '1') return;
    handledToday.current = true;
    openToday();
    router.replace(`/m/${id}`);
  }, [data, search, openToday, router, id]);

  useEffect(() => {
    if (!pendingFocus) return;
    const el = titleRefs.current.get(pendingFocus);
    if (el) { el.focus(); el.scrollIntoView({ block: 'center' }); setPendingFocus(null); }
  }, [pendingFocus, data]);

  useEffect(() => { if (recorder.error) { say(recorder.error); recorder.clearError(); } }, [recorder, say]);

  const setBlock = (bid: string, patch: Partial<DayBlock>) =>
    update((d) => ({ blocks: d.blocks.map((b) => (b.id === bid && b.kind !== 'audio' ? { ...b, ...patch } : b)) }));

  const addMemo = (rec: { media: string; dur: number; peaks: number[] }) => {
      update((d) => {
        let blocks = d.blocks;
        let idx = blocks.findIndex((b) => b.kind === 'day' && b.day === t.day);
        if (idx < 0) {
          blocks = [{ id: uid('b'), kind: 'day', day: t.day, wd: t.wd, title: '', body: '' }, ...blocks];
          idx = 0;
        }
        const memo: AudioBlock = { id: uid('a'), kind: 'audio', day: t.day, dur: rec.dur, media: rec.media, peaks: rec.peaks };
        const next = blocks.slice();
        next.splice(idx + 1, 0, memo);
        return { blocks: next };
      });
  };

  const toggleRecord = async () => {
    if (recorder.state === 'recording') {
      const rec = await recorder.stop();
      if (rec) addMemo(rec);
    } else if (recorder.state === 'idle') {
      if (!isCurrent) { router.push('/today'); return; }
      await recorder.start();
    }
  };

  const sendToScript = async (b: Block) => {
    const text = b.kind === 'audio' ? `Memo from day ${b.day}` : (b.title || b.body.split('\n')[0] || 'Untitled');
    setSheetFor(null);
    try {
      await patchDoc<ScriptDoc>('script', 'main', () => ({ title: '', lines: [{ id: uid('l'), text: '' }], seeds: [] }),
        (d) => ({ ...d, seeds: [{ id: uid('s'), from: id, text, used: false }, ...d.seeds] }));
      say('Sent to script');
    } catch { say('Couldn’t send to script. Try again.'); }
  };

  const startSong = async (b: Block) => {
    setSheetFor(null);
    try {
      await patchDoc<MusicDoc>('music', 'main',
        () => ({ songs: [], release: { title: '', format: 'single', tracks: [] }, cover: 'sw1', moodNote: '', moodImgs: [null, null, null] }),
        (d) => ({
          ...d,
          songs: [{
            id: uid('so'), title: b.kind === 'audio' ? '' : b.title, status: 'Idea', len: 0, lyrics: b.kind === 'audio' ? '' : b.body,
            structured: false, sections: [], from: id,
            takes: b.kind === 'audio' ? [{ id: uid('t'), dur: b.dur, media: b.media, peaks: b.peaks, keeper: false }] : [],
          }, ...d.songs],
        }));
      say('Song started');
    } catch { say('Couldn’t start the song. Try again.'); }
  };

  const remove = (b: Block) => { setSheetFor(null); update((d) => ({ blocks: d.blocks.filter((x) => x.id !== b.id) })); };

  return (
    <div className="relative">
      <div className="mx-auto max-w-[720px] px-6 pb-48 pt-3 md:px-[6%] md:pt-14">
        <div className="flex items-center justify-between md:hidden">
          <IconButton label="Notebook" onClick={onBack} className="-ml-3"><Icon.Back /></IconButton>
          <SaveDot status={status} />
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="mt-3 text-[44px] font-semibold leading-none tracking-[-0.03em] md:mt-0 md:text-[52px]">{id}</h1>
          <span className="hidden md:block"><SaveDot status={status} /></span>
        </div>
        <p className="sr-only">{info.name} {info.year}</p>

        {data && data.blocks.length === 0 && (
          <div className="flex flex-col items-start gap-4 pt-10">
            <button type="button" onClick={openToday} className="flex items-center gap-2 text-lg text-ink2"><span aria-hidden>🌱</span>day {isCurrent ? t.day : ''}</button>
          </div>
        )}

        {data?.blocks.map((b) => b.kind === 'audio' ? (
          <div key={b.id} className="my-2 max-w-[480px]">
            <AudioPill media={b.media} peaks={b.peaks} dur={b.dur} label={`memo, day ${b.day}`}
              trailing={<IconButton label="More, memo" onClick={() => setSheetFor(b)}><More /></IconButton>} />
          </div>
        ) : (
          <DayBlockView key={b.id} block={b}
            titleRef={(el) => { if (el) titleRefs.current.set(b.id, el); else titleRefs.current.delete(b.id); }}
            onChange={(patch) => setBlock(b.id, patch)} onMore={() => setSheetFor(b)} />
        ))}
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(92px+env(safe-area-inset-bottom))] z-20 flex items-center justify-center gap-3.5 md:sticky md:bottom-8">
        <button type="button" onClick={openToday} aria-label="New day"
          className="pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-bg text-ink shadow-[0_0_0_1px_var(--line),0_8px_20px_-10px_var(--shadow)]">
          <Icon.Plus />
        </button>
        <RecordButton state={recorder.state} seconds={recorder.seconds} level={recorder.level} onClick={toggleRecord} />
        {recorder.hasFailed && recorder.state === 'idle' && (
          <button type="button" onClick={async () => { const rec = await recorder.retryUpload(); if (rec) addMemo(rec); }}
            className="pointer-events-auto h-12 rounded-full bg-bg px-4 text-sm font-medium text-danger shadow-[0_0_0_1px_var(--line)]">
            Retry upload
          </button>
        )}
      </div>

      <Sheet open={!!sheetFor} onClose={() => setSheetFor(null)} label="Block actions">
        {sheetFor && (
          <div className="flex flex-col p-1">
            <button type="button" onClick={() => sendToScript(sheetFor)} className="h-[52px] rounded-2xl px-3.5 text-left text-base font-medium hover:bg-surface">Send to script</button>
            <button type="button" onClick={() => startSong(sheetFor)} className="h-[52px] rounded-2xl px-3.5 text-left text-base font-medium hover:bg-surface">Start a song</button>
            <button type="button" onClick={() => remove(sheetFor)} className="h-[52px] rounded-2xl px-3.5 text-left text-base font-medium text-danger hover:bg-surface">Delete</button>
            <button type="button" onClick={() => setSheetFor(null)} className="mt-1 h-[52px] rounded-2xl bg-surface text-base font-semibold">Cancel</button>
          </div>
        )}
      </Sheet>
    </div>
  );
}

function More() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>;
}

function DayBlockView({ block, titleRef, onChange, onMore }: {
  block: DayBlock; titleRef: (el: HTMLInputElement | null) => void; onChange: (p: Partial<DayBlock>) => void; onMore: () => void;
}) {
  const body = useRef<AutoTextareaHandle>(null);
  const label = block.kind === 'reflection' ? 'reflection' : `day ${block.day}`;
  const wd = block.wd || DAYS[0];
  return (
    <article className="pt-7 md:pt-9">
      <div className="-mr-3 flex items-center justify-between gap-2">
        <p className="flex items-baseline gap-2 text-base font-medium text-ink2">
          <span aria-hidden className="text-[17px]">🌱</span>
          <span>{label}</span>
          <span className="font-normal text-muted">{wd}</span>
        </p>
        <IconButton label={`More, ${label}`} onClick={onMore}><More /></IconButton>
      </div>
      <input ref={titleRef} className="bare mt-1 text-[21px] font-semibold leading-snug tracking-[-0.015em] md:text-2xl"
        aria-label={`Title, ${label}`} placeholder="Title" value={block.title}
        onChange={(e) => onChange({ title: e.target.value })}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); body.current?.focus(block.body.length); } }} />
      <AutoTextarea ref={body} aria-label={`Note, ${label}`} value={block.body}
        onChange={(e) => onChange({ body: e.target.value })}
        className="mt-2 min-h-[30px] font-serif text-lg leading-[1.62] text-ink2 md:text-xl" />
    </article>
  );
}
