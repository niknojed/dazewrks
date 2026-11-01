'use client';

import { useState } from 'react';
import { useApp } from '@/lib/store';
import { uploadImage } from '@/lib/media';
import type { MusicDoc } from '@/lib/types';
import { cx } from '@/lib/util';
import { AutoTextarea, Icon, StoredImage } from '../ui';
import { FORMAT_LABEL, MUSIC_SW } from './shared';

const SLOTS = 3;

export function Mood({ doc, update }: { doc: MusicDoc; update: (fn: (d: MusicDoc) => MusicDoc) => void }) {
  const { name, say } = useApp();
  const [busy, setBusy] = useState<number | null>(null);
  const sw = MUSIC_SW.find((x) => x.id === doc.cover) ?? MUSIC_SW[0];
  const title = doc.release.title || 'Untitled release';
  const artist = name.trim() || 'Artist';
  const imgs = Array.from({ length: SLOTS }, (_, i) => doc.moodImgs?.[i] ?? null);

  const setImg = (i: number, path: string | null) => update((d) => {
    const next = Array.from({ length: SLOTS }, (_, j) => d.moodImgs?.[j] ?? null);
    next[i] = path;
    return { ...d, moodImgs: next };
  });

  const pick = async (i: number, input: HTMLInputElement) => {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    setBusy(i);
    const r = await uploadImage(file);
    setBusy(null);
    if ('error' in r) { if (r.error) say(r.error); return; }
    setImg(i, r.path);
  };

  return (
    <div className="flex flex-col gap-7 md:flex-row md:flex-wrap md:items-start">
      <div role="img" aria-label={`Cover, ${title}`}
        className="flex aspect-square w-full max-w-[380px] flex-col justify-between rounded p-6 shadow-[0_24px_48px_-28px_var(--shadow)] md:flex-[0_1_380px] md:p-[26px]"
        style={{ background: sw.hex, color: sw.ink }}>
        <span className="text-xs font-medium uppercase tracking-[0.16em] opacity-75">{artist}</span>
        <span className="break-words font-serif text-[40px] font-medium italic leading-none md:text-5xl">{title}</span>
        <span className="text-xs font-medium uppercase tracking-[0.16em] opacity-75">{FORMAT_LABEL[doc.release.format]}</span>
      </div>

      <div className="flex min-w-0 flex-1 basis-[300px] flex-col gap-3.5">
        <div role="group" aria-label="Cover color" className="grid grid-cols-4 gap-2">
          {MUSIC_SW.map((x) => {
            const on = x.id === sw.id;
            return (
              <button key={x.id} type="button" aria-label={x.name} aria-pressed={on}
                onClick={() => update((d) => ({ ...d, cover: x.id }))}
                className={cx('h-[52px] rounded-xl', on ? 'shadow-[0_0_0_2px_var(--bg),0_0_0_4px_var(--ink)]' : 'shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]')}
                style={{ background: x.hex }} />
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {imgs.map((img, i) => (
            <div key={i} className="relative aspect-[4/5] overflow-hidden rounded-[10px] bg-surface">
              {img ? (
                <>
                  <StoredImage path={img} alt={`Reference ${i + 1}`} className="block h-full w-full" />
                  <button type="button" onClick={() => setImg(i, null)} aria-label={`Remove reference ${i + 1}`}
                    className="absolute right-1.5 top-1.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-page text-ink shadow-[0_2px_8px_var(--shadow)]">
                    <Icon.Close size={14} />
                  </button>
                </>
              ) : (
                <label className={cx('file-btn absolute inset-0 flex cursor-pointer items-center justify-center text-muted hover:text-ink', busy === i && 'cursor-wait opacity-50')}>
                  <input type="file" accept="image/*" className="sr-file" aria-label={`Add reference image ${i + 1}`} disabled={busy === i}
                    onChange={(e) => { void pick(i, e.currentTarget); }} />
                  <Icon.Plus size={22} />
                </label>
              )}
            </div>
          ))}
        </div>

        <AutoTextarea aria-label="Mood note" value={doc.moodNote}
          onChange={(e) => { const v = e.target.value; update((d) => ({ ...d, moodNote: v })); }}
          className="font-serif text-[19px] italic leading-[1.55] text-ink2 md:text-xl" />
      </div>
    </div>
  );
}
