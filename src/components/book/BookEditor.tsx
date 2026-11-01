'use client';

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { BookDoc, BookPage } from '@/lib/types';
import { useDoc } from '@/lib/store';
import { SaveDot } from '@/components/ui';
import { type BookActions, flatten, initBook, newChapter, newPage } from './shared';
import { PhoneHome, PhonePage } from './PhoneBook';
import { DesktopCover, DesktopSpread, Outline } from './DesktopBook';

const MD = '(min-width: 768px)';

function useIsDesktop(): boolean | null {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(MD);
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () => window.matchMedia(MD).matches,
    () => null,
  );
}

export function BookEditor() {
  const { data: book, update, status } = useDoc<BookDoc>('book', 'main', initBook, (d) => d.title || 'Untitled story');
  const router = useRouter();
  const pathname = usePathname() || '/book';
  const params = useSearchParams();
  const selParam = params.get('p');
  const desktop = useIsDesktop();

  const flat = useMemo(() => (book ? flatten(book) : []), [book]);
  const cur = selParam ? flat.find((x) => x.page.id === selParam) ?? null : null;

  const open = useCallback((pageId: string | null, how: 'push' | 'replace' = 'push') => {
    const url = pageId ? `${pathname}?p=${encodeURIComponent(pageId)}` : pathname;
    if (how === 'replace') router.replace(url);
    else router.push(url);
  }, [pathname, router]);

  // A stale or unknown ?p= (deleted page, old link) falls back to the cover.
  useEffect(() => {
    if (book && selParam && !cur) open(null, 'replace');
  }, [book, selParam, cur, open]);

  const go = useCallback((i: number) => {
    if (i < 0) { if (desktop) open(null, 'replace'); return; }
    const target = flat[i];
    if (target) open(target.page.id, 'replace');
  }, [flat, open, desktop]);

  const act = useMemo<BookActions>(() => {
    const patchChapters = (fn: (b: BookDoc) => BookDoc['chapters']) => update((b) => ({ ...b, chapters: fn(b) }));
    return {
      setTitle: (title) => update((b) => ({ ...b, title })),
      setAuthor: (author) => update((b) => ({ ...b, author })),
      setCover: (cover) => update((b) => ({ ...b, cover })),
      setCoverImg: (coverImg) => update((b) => ({ ...b, coverImg })),
      setChapterTitle: (id, title) => patchChapters((b) => b.chapters.map((c) => (c.id === id ? { ...c, title } : c))),
      addPage: (chapterId) => {
        const np = newPage();
        patchChapters((b) => b.chapters.map((c) => (c.id === chapterId ? { ...c, pages: [...c.pages, np] } : c)));
        open(np.id);
      },
      addChapter: () => {
        const ch = newChapter();
        patchChapters((b) => [...b.chapters, ch]);
        if (desktop) open(ch.pages[0].id);
      },
      patchPage: (pageId, patch: Partial<Omit<BookPage, 'id'>>) => patchChapters((b) => b.chapters.map((c) => (
        c.pages.some((p) => p.id === pageId) ? { ...c, pages: c.pages.map((p) => (p.id === pageId ? { ...p, ...patch } : p)) } : c
      ))),
      deletePage: (pageId) => {
        const i = flat.findIndex((x) => x.page.id === pageId);
        if (i < 0 || flat.length <= 1) return;
        const target = flat[i + 1] ?? flat[i - 1];
        patchChapters((b) => b.chapters
          .map((c) => ({ ...c, pages: c.pages.filter((p) => p.id !== pageId) }))
          .filter((c) => c.pages.length > 0));
        open(target.page.id, 'replace');
      },
      open,
    };
  }, [update, open, flat, desktop]);

  // Arrow keys flip pages when focus isn't in a text field.
  useEffect(() => {
    if (!cur) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(cur.index + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur.index - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cur, go]);

  if (!book || desktop === null) {
    return <div aria-busy="true" className="min-h-dvh" />;
  }

  const save = (
    <div className="pointer-events-none fixed right-4 top-4 z-20 md:absolute">
      <SaveDot status={status} />
    </div>
  );

  if (!desktop) {
    return (
      <div className="relative">
        {save}
        {cur
          ? <PhonePage key="page" cur={cur} total={flat.length} act={act} go={go} />
          : <PhoneHome book={book} flat={flat} act={act} />}
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh">
      {save}
      <Outline book={book} selId={cur ? cur.page.id : null} act={act} />
      <div className="flex min-w-0 flex-1 flex-col items-center gap-[22px] px-[5%] pb-20 pt-12">
        {cur
          ? <DesktopSpread cur={cur} total={flat.length} act={act} go={go} />
          : <DesktopCover book={book} flat={flat} act={act} />}
      </div>
    </div>
  );
}
