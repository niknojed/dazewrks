'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon, IconButton, SaveDot, type AutoTextareaHandle } from '@/components/ui';
import type { SaveStatus } from '@/lib/store';
import { applyLineOption, menuOptions, lineTypes, paginate, type OptionGroup } from '@/lib/screenplay';
import type { Line, ScriptDoc, Seed } from '@/lib/types';
import { prefersReducedMotion, uid } from '@/lib/util';
import { LineMenu } from './LineMenu';
import { PageRail } from './PageRail';
import { ScriptLine, type LineHandlers } from './ScriptLine';
import { Seeds } from './Seeds';

type Menu = { lineId: string; slash: boolean } | null;
type Focus = { id: string; pos: number };

const SEEDS_KEY = 'nb:seedsOpen';
const newLine = (text = ''): Line => ({ id: uid('l'), text });

function readSeedsOpen(): boolean {
  try { return typeof window === 'undefined' ? true : localStorage.getItem(SEEDS_KEY) !== '0'; } catch { return true; }
}

export function ScriptEditor({ doc, status, update }: {
  doc: ScriptDoc; status: SaveStatus; update(fn: (d: ScriptDoc) => ScriptDoc): void;
}) {
  const lines = doc.lines;
  const seeds = doc.seeds ?? [];
  const types = useMemo(() => lineTypes(lines), [lines]);
  const pgn = useMemo(() => paginate(lines, types), [lines, types]);

  const [menu, setMenu] = useState<Menu>(null);
  const [pageMode, setPageMode] = useState(false);
  const [page, setPage] = useState(0);
  const [curPage, setCurPage] = useState(0);
  const [showRail, setShowRail] = useState(false);
  const [seedsOpen, setSeedsOpen] = useState(readSeedsOpen);

  const handles = useRef(new Map<string, AutoTextareaHandle>());
  const pending = useRef<Focus | null>(null);
  const scrollTo = useRef<number | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const raf = useRef<number | null>(null);
  const linesRef = useRef(lines);
  const menuRef = useRef(menu);
  const pgnRef = useRef(pgn);
  const updateRef = useRef(update);
  linesRef.current = lines;
  menuRef.current = menu;
  pgnRef.current = pgn;
  updateRef.current = update;

  const spage = Math.max(0, Math.min(page, pgn.total - 1));

  // An empty document always keeps one line to type into.
  useEffect(() => {
    if (lines.length === 0) update((d) => (d.lines.length ? d : { ...d, lines: [newLine()] }));
  }, [lines.length, update]);

  const setLines = useCallback((fn: (ls: Line[]) => Line[]) => {
    updateRef.current((d) => {
      const next = fn(d.lines);
      return next === d.lines ? d : { ...d, lines: next.length ? next : [newLine()] };
    });
  }, []);

  const pick = useCallback((lineId: string, group: OptionGroup, value: string) => {
    const ln = linesRef.current.find((l) => l.id === lineId);
    setMenu(null);
    if (!ln) return;
    const text = applyLineOption(ln.text, group, value);
    pending.current = { id: lineId, pos: text.length };
    setLines((ls) => ls.map((l) => (l.id === lineId ? { ...l, text } : l)));
  }, [setLines]);

  // Focus a line now if it's on screen; otherwise queue it (page view switches page first).
  const [, bump] = useState(0);
  const focusLine = useCallback((id: string, pos: number) => {
    const h = handles.current.get(id);
    if (h) { h.focus(pos); return; }
    pending.current = { id, pos };
    bump((n) => n + 1);
  }, []);

  const handlers = useMemo<LineHandlers>(() => ({
    register(id, h) { if (h) handles.current.set(id, h); else handles.current.delete(id); },
    openChanger(id) { setMenu({ lineId: id, slash: false }); },
    change(id, raw) {
      const value = raw.replace(/\r\n?/g, '\n');
      if (!value.includes('\n')) {
        const slash = value.trim().startsWith('/');
        setMenu((m) => (slash ? { lineId: id, slash: true } : m && m.slash && m.lineId === id ? null : m));
        setLines((ls) => ls.map((l) => (l.id === id ? { ...l, text: value } : l)));
        return;
      }
      // Paste or soft-keyboard return: one line per row.
      const [first, ...rest] = value.split('\n');
      const made = rest.map((t) => newLine(t));
      const last = made[made.length - 1];
      pending.current = { id: last.id, pos: last.text.length };
      setMenu((m) => (m && m.lineId === id ? null : m));
      setLines((ls) => {
        const i = ls.findIndex((l) => l.id === id);
        if (i < 0) return ls;
        const next = ls.slice();
        next.splice(i, 1, { ...ls[i], text: first }, ...made);
        return next;
      });
    },
    keyDown(id, e) {
      if (e.nativeEvent.isComposing) return;
      const ls = linesRef.current;
      const i = ls.findIndex((l) => l.id === id);
      if (i < 0) return;
      const cur = ls[i];
      const el = e.currentTarget;
      const a = el.selectionStart;
      const z = el.selectionEnd;
      const m = menuRef.current;

      if (m && m.slash && m.lineId === id) {
        if (e.key === 'Escape') { e.preventDefault(); setMenu(null); return; }
        if (e.key === 'Enter') {
          const first = menuOptions(cur.text, true)[0];
          if (first) { e.preventDefault(); pick(id, first.group, first.value); return; }
        }
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const nl = newLine(cur.text.slice(z));
        pending.current = { id: nl.id, pos: 0 };
        setMenu(null);
        setLines((xs) => {
          const j = xs.findIndex((l) => l.id === id);
          if (j < 0) return xs;
          const next = xs.slice();
          next.splice(j, 1, { ...xs[j], text: xs[j].text.slice(0, a) }, nl);
          return next;
        });
      } else if (e.key === 'Backspace' && a === 0 && z === 0 && i > 0) {
        e.preventDefault();
        const prev = ls[i - 1];
        pending.current = { id: prev.id, pos: prev.text.length };
        setMenu((mm) => (mm && mm.lineId === id ? null : mm));
        setLines((xs) => {
          const j = xs.findIndex((l) => l.id === id);
          if (j < 1) return xs;
          const next = xs.slice();
          next.splice(j - 1, 2, { ...xs[j - 1], text: xs[j - 1].text + xs[j].text });
          return next;
        });
      } else if (e.key === 'ArrowUp' && a === 0 && z === 0 && i > 0) {
        e.preventDefault();
        const prev = ls[i - 1];
        focusLine(prev.id, prev.text.length);
      } else if (e.key === 'ArrowDown' && a === cur.text.length && z === a && i < ls.length - 1) {
        e.preventDefault();
        focusLine(ls[i + 1].id, 0);
      }
    },
  }), [pick, setLines, focusLine]);

  // Apply queued focus after every render (the request lives in a ref). Passive effect so it runs
  // after a closing Sheet restores its own focus. setPage only fires when the page differs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const pf = pending.current;
    if (!pf) return;
    const h = handles.current.get(pf.id);
    if (h) { pending.current = null; h.focus(pf.pos); return; }
    const ix = lines.findIndex((l) => l.id === pf.id);
    if (ix < 0) { pending.current = null; return; }
    if (pageMode && pgn.pageOf[ix] !== spage) setPage(pgn.pageOf[ix]);
    else pending.current = null;
  });

  // Rail: current page and visibility, measured at most once per frame.
  const measure = useCallback(() => {
    const de = document.documentElement;
    setShowRail(window.scrollY > 8 || de.scrollHeight > window.innerHeight + 4);
    const ls = linesRef.current;
    const pg = pgnRef.current;
    let cur = 0;
    for (let i = 0; i < ls.length; i++) {
      const el = handles.current.get(ls[i].id)?.el;
      if (el && el.getBoundingClientRect().bottom > 80) { cur = pg.pageOf[i] ?? 0; break; }
    }
    setCurPage(cur);
  }, []);

  useEffect(() => {
    if (pageMode) return;
    const onScroll = () => {
      if (raf.current != null) return;
      raf.current = requestAnimationFrame(() => { raf.current = null; measure(); });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf.current != null) { cancelAnimationFrame(raf.current); raf.current = null; }
    };
  }, [pageMode, measure]);

  useEffect(() => { if (!pageMode) measure(); }, [pageMode, lines, measure]);

  const jumpToPage = useCallback((p: number, smooth = true) => {
    const ls = linesRef.current;
    const idx = pgnRef.current.pageOf.indexOf(p);
    if (idx < 0) return;
    const el = handles.current.get(ls[idx].id)?.el;
    if (!el) return;
    el.scrollIntoView({ block: 'start', behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto' });
    setCurPage(p);
  }, []);

  // Leaving page view lands on the page you were reading.
  useEffect(() => {
    if (pageMode || scrollTo.current == null) return;
    const p = scrollTo.current;
    scrollTo.current = null;
    jumpToPage(p, false);
  }, [pageMode, jumpToPage]);

  const togglePageMode = () => {
    setMenu(null);
    if (pageMode) { scrollTo.current = spage; setPageMode(false); }
    else { setPage(curPage); setPageMode(true); window.scrollTo({ top: 0 }); }
  };

  const goPage = (p: number) => setPage(Math.max(0, Math.min(pgn.total - 1, p)));

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = t ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const st = touch.current;
    const t = e.changedTouches[0];
    touch.current = null;
    if (!pageMode || !st || !t) return;
    const dx = t.clientX - st.x;
    const dy = t.clientY - st.y;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    goPage(dx < 0 ? spage + 1 : spage - 1);
  };

  const toggleSeeds = () => {
    setSeedsOpen((o) => {
      const next = !o;
      try { localStorage.setItem(SEEDS_KEY, next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  };

  const addSeed = (seed: Seed) => {
    const lastLine = lines[lines.length - 1];
    const emptyEnd = !!lastLine && !lastLine.text.trim();
    const added = [...(emptyEnd ? [] : [newLine()]), newLine(seed.text), newLine()];
    pending.current = { id: added[added.length - 1].id, pos: 0 };
    update((d) => {
      const ls = d.lines.slice();
      const end = ls[ls.length - 1];
      if (end && !end.text.trim()) ls.pop();
      return { ...d, lines: ls.concat(added), seeds: (d.seeds ?? []).map((s) => (s.id === seed.id ? { ...s, used: true } : s)) };
    });
  };

  const closeMenu = () => {
    const m = menu;
    setMenu(null);
    if (m && !m.slash) {
      const ln = lines.find((l) => l.id === m.lineId);
      if (ln) pending.current = { id: ln.id, pos: ln.text.length };
    }
  };

  const menuLine = menu ? lines.find((l) => l.id === menu.lineId) : undefined;
  const openSeeds = seeds.filter((s) => !s.used);
  const visible = lines
    .map((l, i) => ({ l, i }))
    .filter(({ i }) => !pageMode || pgn.pageOf[i] === spage);

  return (
    <>
      <div className="mx-auto flex max-w-[760px] flex-col gap-5 px-5 pb-[120px] pt-10 md:gap-[22px] md:px-[5%] md:pt-14">
        <div className="flex items-center gap-1.5 md:gap-2">
          <input className="bare min-w-0 flex-1 px-1 font-sans text-[30px] font-semibold leading-[1.1] tracking-[-0.025em] md:px-0 md:text-[40px]"
            aria-label="Script title" placeholder="Untitled script" value={doc.title}
            onChange={(e) => { const v = e.target.value; update((d) => ({ ...d, title: v })); }} />
          <SaveDot status={status} />
          {pageMode && <span className="text-[13px] font-medium tabular-nums text-muted">{spage + 1} / {pgn.total}</span>}
          <IconButton label="Page view" pressed={pageMode} onClick={togglePageMode} className="aria-pressed:bg-surface aria-pressed:text-ink">
            <Icon.Pages />
          </IconButton>
        </div>

        {!pageMode && <Seeds seeds={openSeeds} open={seedsOpen} onToggle={toggleSeeds} onUse={addSeed} />}

        <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
          className="min-h-[420px] pl-[22px] pt-1 font-mono text-[14px] leading-[1.55] md:min-h-[60vh] md:pl-7 md:pt-2 md:text-[15px] md:leading-[1.6]">
          {visible.map(({ l, i }) => (
            <ScriptLine key={l.id} id={l.id} text={l.text} type={types[i]} index={i} handlers={handlers} />
          ))}
        </div>

        {pageMode && (
          <div className="flex justify-center gap-3.5">
            <PagerButton label="Previous page" onClick={() => goPage(spage - 1)} disabled={spage <= 0}><Icon.Back size={20} /></PagerButton>
            <PagerButton label="Next page" onClick={() => goPage(spage + 1)} disabled={spage >= pgn.total - 1}><Icon.Next /></PagerButton>
          </div>
        )}
      </div>

      {!pageMode && showRail && <PageRail total={pgn.total} current={curPage} onGo={(p) => jumpToPage(p)} />}

      {menu && menuLine && (
        <LineMenu text={menuLine.text} slash={menu.slash}
          onPick={(g, v) => pick(menu.lineId, g, v)} onClose={closeMenu} />
      )}
    </>
  );
}

function PagerButton({ label, onClick, disabled, children }: { label: string; onClick(): void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} disabled={disabled}
      className="inline-flex h-12 w-12 items-center justify-center rounded-full text-ink shadow-[0_0_0_1px_var(--line)] hover:bg-surface disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent">
      {children}
    </button>
  );
}
