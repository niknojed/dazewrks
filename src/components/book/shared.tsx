'use client';

import { useRef, useState } from 'react';
import type { BookDoc, BookPage, Chapter, PageLayout } from '@/lib/types';
import { uploadImage } from '@/lib/media';
import { useApp } from '@/lib/store';
import { Icon, StoredImage } from '@/components/ui';
import { cx, uid } from '@/lib/util';

// ------------------------------------------------------------------ Data

export interface Swatch { id: string; name: string; hex: string; ink: string }

export const SWATCHES: Swatch[] = [
  { id: 'k1', name: 'Sky', hex: '#BFD9EA', ink: '#14283A' },
  { id: 'k2', name: 'Sun', hex: '#F4C95D', ink: '#2A1D05' },
  { id: 'k3', name: 'Clay', hex: '#D9805F', ink: '#FFF8F2' },
  { id: 'k4', name: 'Leaf', hex: '#8DBA6A', ink: '#14240A' },
  { id: 'k5', name: 'Night', hex: '#22304A', ink: '#F4EFE6' },
];

export const swatchOf = (id: string): Swatch => SWATCHES.find((s) => s.id === id) ?? SWATCHES[0];

export const LAYOUTS: { id: PageLayout; name: string }[] = [
  { id: 'split', name: 'Picture and text' },
  { id: 'full', name: 'Full picture' },
  { id: 'text', name: 'Text only' },
];

export const newPage = (layout: PageLayout = 'split'): BookPage => ({ id: uid('p'), layout, text: '', img: null });
export const newChapter = (): Chapter => ({ id: uid('c'), title: '', pages: [newPage()] });

export const initBook = (): BookDoc => ({ title: '', author: '', cover: 'k1', coverImg: null, chapters: [newChapter()] });

export interface FlatPage { page: BookPage; chapterId: string; index: number }

export function flatten(book: BookDoc): FlatPage[] {
  const out: FlatPage[] = [];
  for (const c of book.chapters) for (const p of c.pages) out.push({ page: p, chapterId: c.id, index: out.length });
  return out;
}

export function wordCount(pages: FlatPage[]): number {
  return pages.reduce((n, x) => {
    const t = x.page.text.trim();
    return n + (t ? t.split(/\s+/).length : 0);
  }, 0);
}

export const placeholderFor = (index: number) => (index === 0 ? 'Once upon a time…' : '');

/** Everything the views can do to the book. Navigation is handled by the editor. */
export interface BookActions {
  setTitle(v: string): void;
  setAuthor(v: string): void;
  setCover(id: string): void;
  setCoverImg(path: string | null): void;
  setChapterTitle(chapterId: string, v: string): void;
  addPage(chapterId: string): void;
  addChapter(): void;
  patchPage(pageId: string, patch: Partial<Omit<BookPage, 'id'>>): void;
  deletePage(pageId: string): void;
  /** Select a page (or the cover / book home with null). */
  open(pageId: string | null, how?: 'push' | 'replace'): void;
}

// ------------------------------------------------------------------ Upload

export function useImagePick(onPath: (path: string) => void) {
  const { say } = useApp();
  const [busy, setBusy] = useState(false);
  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const res = await uploadImage(file);
      if ('path' in res) onPath(res.path);
      else if (res.error) say(res.error);
    } finally {
      setBusy(false);
    }
  };
  return { busy, onChange };
}

const floatBtn = 'inline-flex h-9 items-center justify-center rounded-full bg-page text-ink shadow-[0_2px_8px_var(--shadow)]';

export function RemoveButton({ label, onClick, className }: { label: string; onClick: () => void; className?: string }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={cx(floatBtn, 'w-9', className)}>
      <Icon.Close size={14} />
    </button>
  );
}

/** Illustration area: whole-slot upload target when empty, image + remove when filled. */
export function ImageSlot({ img, pageNum, onChange, className }: {
  img: string | null; pageNum: number; onChange: (path: string | null) => void; className?: string;
}) {
  const pick = useImagePick((p) => onChange(p));
  return (
    <div className={cx('relative overflow-hidden bg-surface', className)}>
      {img ? (
        <>
          <StoredImage path={img} alt={`Illustration, page ${pageNum}`} className="absolute inset-0 h-full w-full" />
          <RemoveButton label="Remove illustration" onClick={() => onChange(null)} className="absolute right-2.5 top-2.5" />
        </>
      ) : (
        <label className={cx('file-btn absolute inset-0 flex cursor-pointer items-center justify-center text-muted hover:text-ink', pick.busy && 'pointer-events-none opacity-50')}
          style={{ borderRadius: 0, outlineOffset: -4 }}>
          <input type="file" accept="image/*" className="sr-file" disabled={pick.busy}
            aria-label={`Add illustration, page ${pageNum}`} onChange={pick.onChange} />
          <Icon.Plus size={26} />
        </label>
      )}
    </div>
  );
}

/** Cover image controls: "Image" upload pill and remove. */
export function CoverImageControls({ coverImg, onChange, className }: {
  coverImg: string | null; onChange: (p: string | null) => void; className?: string;
}) {
  const pick = useImagePick((p) => onChange(p));
  return (
    <div className={cx('flex gap-1.5', className)}>
      <label className={cx('file-btn cursor-pointer gap-1.5 px-3 text-[13px] font-medium', floatBtn, pick.busy && 'pointer-events-none opacity-60')}>
        <input type="file" accept="image/*" className="sr-file" disabled={pick.busy} aria-label="Cover image" onChange={pick.onChange} />
        <Icon.Image />Image
      </label>
      {coverImg && <RemoveButton label="Remove cover image" onClick={() => onChange(null)} />}
    </div>
  );
}

/** The square cover art with title + author. */
export function CoverArt({ book, titleSize, className }: { book: BookDoc; titleSize: string; className?: string }) {
  const sw = swatchOf(book.cover);
  const hasImg = !!book.coverImg;
  return (
    <div className={cx('relative aspect-square overflow-hidden', className)}
      style={{ background: sw.hex, color: hasImg ? '#FFFFFF' : sw.ink, textShadow: hasImg ? '0 1px 12px rgba(0,0,0,0.45)' : undefined }}>
      {book.coverImg && <StoredImage path={book.coverImg} alt="" className="absolute inset-0 h-full w-full" />}
      <div className="relative flex h-full flex-col justify-between p-[9%]">
        <span className={cx('font-serif font-semibold leading-[1.05] [text-wrap:balance]', titleSize)}>{book.title || 'Title'}</span>
        <span className="text-[13px] font-medium leading-none tracking-[0.06em] md:text-[15px]">{book.author || 'Author'}</span>
      </div>
    </div>
  );
}

export function Swatches({ value, onPick, size }: { value: string; onPick: (id: string) => void; size: number }) {
  return (
    <div role="group" aria-label="Cover color" className="flex gap-2">
      {SWATCHES.map((s) => {
        const on = s.id === value;
        return (
          <button key={s.id} type="button" aria-label={s.name} aria-pressed={on} onClick={() => onPick(s.id)}
            className="flex-none rounded-full"
            style={{
              width: size, height: size, background: s.hex,
              boxShadow: on ? '0 0 0 2px var(--bg), 0 0 0 4px var(--ink)' : 'inset 0 0 0 1px rgba(0,0,0,0.08)',
            }} />
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------ Page text

/**
 * Notes-style page text: fills its region, caret goes wherever you tap.
 * `.bare` is unlayered CSS, so it outranks Tailwind utilities; font comes from the
 * wrapper (`font: inherit`) and padding/overflow go inline.
 */
export function PageText({ page, pageNum, index, onText, font, padding, className }: {
  page: BookPage; pageNum: number; index: number; onText: (v: string) => void;
  font: string; padding: string; className?: string;
}) {
  return (
    <div className={cx('flex min-h-0 min-w-0 flex-1 font-serif', font, className)}>
      <textarea value={page.text} onChange={(e) => onText(e.target.value)}
        aria-label={`Text, page ${pageNum}`} placeholder={placeholderFor(index)}
        className="bare h-full min-h-0 flex-1 cursor-text"
        style={{ padding, overflowY: 'auto', boxSizing: 'border-box' }} />
    </div>
  );
}

// ------------------------------------------------------------------ Layout picker

function LayoutIcon({ id }: { id: PageLayout }) {
  if (id === 'split') return (
    <svg width="22" height="16" viewBox="0 0 22 16" aria-hidden><rect x="1" y="1" width="20" height="14" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" /><rect x="1" y="1" width="10" height="14" fill="currentColor" opacity="0.45" /><path d="M14 6h5M14 9h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
  );
  if (id === 'full') return (
    <svg width="22" height="16" viewBox="0 0 22 16" aria-hidden><rect x="1" y="1" width="20" height="14" rx="1.5" fill="currentColor" fillOpacity="0.45" stroke="currentColor" strokeWidth="1.4" /><rect x="3" y="9" width="8" height="4" rx="0.8" fill="var(--bg)" /></svg>
  );
  return (
    <svg width="22" height="16" viewBox="0 0 22 16" aria-hidden><rect x="1" y="1" width="20" height="14" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M7 6h8M6 9h10M8 12h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
  );
}

export function LayoutPicker({ value, onPick, large }: { value: PageLayout; onPick: (l: PageLayout) => void; large?: boolean }) {
  return (
    <div role="group" aria-label="Layout" className="flex gap-0.5 rounded-xl bg-surface p-[3px]">
      {LAYOUTS.map((l) => {
        const on = l.id === value;
        return (
          <button key={l.id} type="button" aria-label={l.name} aria-pressed={on} onClick={() => onPick(l.id)}
            className={cx('inline-flex items-center justify-center rounded-[9px]', large ? 'h-10 w-12' : 'h-9 w-11',
              on ? 'bg-bg text-ink shadow-[0_1px_2px_var(--shadow)]' : 'text-muted hover:text-ink')}>
            <LayoutIcon id={l.id} />
          </button>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------ Swipe

export function useSwipe(onSwipe: (dir: 1 | -1) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0];
      start.current = t && e.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const t = e.changedTouches[0];
      const s = start.current;
      start.current = null;
      if (!s || !t) return;
      const dx = t.clientX - s.x, dy = t.clientY - s.y;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      onSwipe(dx < 0 ? 1 : -1);
    },
  };
}

/** Borderless input. Typography goes on the wrapper because `.bare` inherits font and color. */
export function BareInput({ className, value, onValue, label, placeholder }: {
  className?: string; value: string; onValue: (v: string) => void; label: string; placeholder: string;
}) {
  return (
    <div className={cx('min-w-0', className)}>
      <input className="bare" aria-label={label} placeholder={placeholder} value={value} onChange={(e) => onValue(e.target.value)} />
    </div>
  );
}
