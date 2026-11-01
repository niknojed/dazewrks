'use client';

import { useEffect, useRef, useState } from 'react';
import type { Section, SectionType } from '@/lib/types';
import { cx, uid } from '@/lib/util';
import { AutoTextarea, type AutoTextareaHandle, Icon, Sheet } from '../ui';
import { SECTION_STYLE, SECTION_TYPES } from './shared';

/** Split free lyrics into sections: repeated paragraphs read as hooks, earlier types are kept by position. */
export function lyricsToSections(lyrics: string, prev: Section[]): Section[] {
  const paras = (lyrics || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (!paras.length) return prev.length ? prev : [{ id: uid('sec'), type: 'Verse', text: '' }];
  const seen = new Map<string, number>();
  for (const p of paras) seen.set(p, (seen.get(p) ?? 0) + 1);
  return paras.map((p, i) => ({
    id: prev[i]?.id ?? uid('sec'),
    type: prev[i]?.type ?? ((seen.get(p) ?? 0) > 1 ? 'Hook' : 'Verse'),
    text: p,
  }));
}

export function sectionsToLyrics(sections: Section[]): string {
  return sections.map((s) => s.text.trim()).filter(Boolean).join('\n\n');
}

export function Structure({ sections, onChange }: { sections: Section[]; onChange: (fn: (s: Section[]) => Section[]) => void }) {
  const refs = useRef(new Map<string, AutoTextareaHandle | null>());
  const addRow = useRef<HTMLDivElement>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const menuSec = sections.find((s) => s.id === menuId) ?? null;

  useEffect(() => {
    if (!focusId) return;
    const h = refs.current.get(focusId);
    if (h?.el) {
      h.focus(h.el.value.length);
      h.el.scrollIntoView({ block: 'nearest' });
    } else {
      addRow.current?.querySelector<HTMLButtonElement>('button')?.focus();
    }
    setFocusId(null);
  }, [focusId, sections]);

  const counts: Partial<Record<SectionType, number>> = {};
  const form = sections.map((s) => {
    counts[s.type] = (counts[s.type] ?? 0) + 1;
    return { s, n: counts[s.type] ?? 1 };
  });

  const setType = (id: string, type: SectionType) => {
    onChange((ss) => ss.map((x) => (x.id === id ? { ...x, type } : x)));
    setMenuId(null);
  };
  const remove = (id: string) => {
    const i = sections.findIndex((x) => x.id === id);
    const neighbour = sections[i - 1] ?? sections[i + 1] ?? null;
    onChange((ss) => ss.filter((x) => x.id !== id));
    setMenuId(null);
    // Let the Sheet restore focus first, then move it somewhere that still exists.
    setTimeout(() => setFocusId(neighbour ? neighbour.id : '__add'), 0);
  };
  const add = (type: SectionType) => {
    const id = uid('sec');
    onChange((ss) => [...ss, { id, type, text: '' }]);
    setFocusId(id);
  };

  return (
    <div className="flex flex-col gap-[18px]">
      {sections.length > 0 && (
        <div role="group" aria-label="Song form" className="flex flex-wrap gap-1">
          {form.map(({ s, n }) => (
            <button key={s.id} type="button" onClick={() => setFocusId(s.id)} aria-label={`${s.type} ${n}`}
              className={cx('inline-flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold', SECTION_STYLE[s.type].block)}>
              {s.type.charAt(0)}
            </button>
          ))}
        </div>
      )}

      {sections.map((s) => (
        <section key={s.id} className="flex flex-col gap-0.5">
          <button type="button" onClick={() => setMenuId(s.id)} aria-haspopup="dialog" aria-label={`${s.type} section`}
            className="-ml-2 inline-flex h-8 items-center gap-[7px] self-start rounded-lg px-2 text-xs font-semibold uppercase tracking-[0.08em] text-ink2 hover:bg-surface">
            <span aria-hidden className={cx('h-2 w-2 rounded-[2px]', SECTION_STYLE[s.type].dot)} />
            {s.type}
            <Icon.Down size={12} className="text-muted" />
          </button>
          <AutoTextarea ref={(h) => { refs.current.set(s.id, h); }} value={s.text} aria-label={`${s.type} lyrics`}
            onChange={(e) => { const v = e.target.value; onChange((ss) => ss.map((x) => (x.id === s.id ? { ...x, text: v } : x))); }}
            className="min-h-[30px] font-serif text-[19px] leading-[1.7] text-ink2 md:text-xl" />
        </section>
      ))}

      <div ref={addRow} className="flex flex-wrap items-center gap-1.5">
        <Icon.Plus size={16} className="flex-none text-muted" />
        {SECTION_TYPES.map((ty) => (
          <button key={ty} type="button" onClick={() => add(ty)} aria-label={`Add ${ty}`}
            className="h-9 rounded-full bg-surface px-3.5 text-[13px] font-medium text-ink2 hover:text-ink">
            {ty}
          </button>
        ))}
      </div>

      <Sheet open={!!menuSec} onClose={() => setMenuId(null)} label={menuSec ? `${menuSec.type} section` : 'Section'}>
        {menuSec && (
          <div className="flex flex-col gap-2 p-3">
            <div className="flex flex-wrap gap-1.5">
              {SECTION_TYPES.map((ty) => (
                <button key={ty} type="button" aria-pressed={ty === menuSec.type} onClick={() => setType(menuSec.id, ty)}
                  className={cx('min-h-10 rounded-full px-3.5 text-sm font-medium', ty === menuSec.type ? 'bg-ink text-invert' : 'bg-surface text-ink')}>
                  {ty}
                </button>
              ))}
            </div>
            <div>
              <button type="button" onClick={() => remove(menuSec.id)} className="min-h-10 rounded-full px-3.5 text-sm font-medium text-danger hover:bg-surface">
                Remove
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
