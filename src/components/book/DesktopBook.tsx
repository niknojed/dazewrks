'use client';

import type { BookDoc, BookPage } from '@/lib/types';
import { Icon, IconButton, StoredImage } from '@/components/ui';
import { cx, plural } from '@/lib/util';
import {
  type BookActions, type FlatPage, CoverArt, CoverImageControls, ImageSlot, LayoutPicker, PageText, Swatches, BareInput,
  swatchOf, useSwipe, wordCount,
} from './shared';

const rowCls = (on: boolean) => cx(
  'flex min-h-10 w-full items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-left',
  on ? 'bg-surface text-ink' : 'text-ink2 hover:bg-surface',
);

function Mini({ page }: { page: BookPage }) {
  const bg = page.img ? 'var(--surface2)' : page.layout === 'text'
    ? 'var(--page)' : 'linear-gradient(90deg, var(--surface2) 50%, var(--page) 50%)';
  return (
    <span aria-hidden className="relative block h-[22px] w-11 flex-none overflow-hidden rounded-[2px] shadow-[inset_0_0_0_1px_var(--line)]" style={{ background: bg }}>
      {page.img && <StoredImage path={page.img} alt="" className="absolute inset-0 h-full w-full" />}
      {!page.img && page.layout === 'text' && (
        <span className="mx-auto mt-[5px] block h-[2px] w-3/5 rounded-[1px] bg-bar shadow-[0_4px_0_var(--bar),0_8px_0_var(--bar)]" />
      )}
    </span>
  );
}

export function Outline({ book, selId, act }: { book: BookDoc; selId: string | null; act: BookActions }) {
  const sw = swatchOf(book.cover);
  let counter = 0;
  return (
    <nav aria-label="Book outline" className="flex w-[240px] flex-none flex-col gap-[18px] border-r border-line px-3.5 py-10">
      <button type="button" className={rowCls(selId === null)} aria-current={selId === null ? 'page' : undefined} onClick={() => act.open(null)}>
        <span aria-hidden className="relative block h-[22px] w-[22px] flex-none overflow-hidden rounded-[2px]" style={{ background: sw.hex }}>
          {book.coverImg && <StoredImage path={book.coverImg} alt="" className="absolute inset-0 h-full w-full" />}
        </span>
        <span className="text-sm font-medium">Cover</span>
      </button>
      {book.chapters.map((c, ci) => {
        const shown = c.title || `Chapter ${ci + 1}`;
        return (
          <div key={c.id} className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1 pb-1 pl-2">
              <BareInput className="flex-1 text-[13px] font-semibold leading-[1.3] text-ink2" label={`Chapter ${ci + 1} title`}
                placeholder={`Chapter ${ci + 1}`} value={c.title} onValue={(v) => act.setChapterTitle(c.id, v)} />
              <IconButton label={`Add page to ${shown}`} onClick={() => act.addPage(c.id)} className="!h-8 !w-8">
                <Icon.Plus size={15} />
              </IconButton>
            </div>
            {c.pages.map((p) => {
              counter += 1;
              const on = p.id === selId;
              const first = p.text.split('\n')[0];
              return (
                <button key={p.id} type="button" className={rowCls(on)} aria-current={on ? 'page' : undefined}
                  aria-label={`Page ${counter}`} onClick={() => act.open(p.id)}>
                  <Mini page={p} />
                  <span className="text-[13px] leading-none tabular-nums text-muted">{counter}</span>
                  <span className="min-w-0 flex-1 truncate font-serif text-[13px] italic leading-[1.3] text-ink2">{first}</span>
                </button>
              );
            })}
          </div>
        );
      })}
      <button type="button" onClick={act.addChapter} className="flex h-10 items-center gap-2 px-2 text-[13px] font-medium text-muted hover:text-ink">
        <Icon.Plus size={15} />Chapter
      </button>
    </nav>
  );
}

export function DesktopCover({ book, flat, act }: { book: BookDoc; flat: FlatPage[]; act: BookActions }) {
  return (
    <div className="flex w-full max-w-[980px] flex-wrap items-center gap-12">
      <div className="relative flex-[0_1_420px] rounded overflow-hidden shadow-[0_1px_2px_var(--shadow),0_28px_56px_-30px_var(--shadow)]">
        <CoverArt book={book} titleSize="text-[46px]" className="w-full" />
        <CoverImageControls coverImg={book.coverImg} onChange={act.setCoverImg} className="absolute right-3 top-3" />
      </div>
      <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-3.5">
        <BareInput className="text-[40px] font-semibold leading-[1.1] tracking-[-0.025em]" label="Book title" placeholder="Title" value={book.title} onValue={(v) => act.setTitle(v)} />
        <BareInput className="text-xl leading-[1.3] text-ink2" label="Author" placeholder="Author" value={book.author} onValue={(v) => act.setAuthor(v)} />
        <div className="mt-2"><Swatches value={book.cover} onPick={act.setCover} size={40} /></div>
        <p className="mt-2 text-sm leading-[1.4] text-muted">
          {plural(flat.length, 'page', 'pages')} · {plural(book.chapters.length, 'chapter', 'chapters')} · {plural(wordCount(flat), 'word', 'words')}
        </p>
      </div>
    </div>
  );
}

export function DesktopSpread({ cur, total, act, go }: {
  cur: FlatPage; total: number; act: BookActions; go: (i: number) => void;
}) {
  const { page, index } = cur;
  const num = index + 1;
  const swipe = useSwipe((dir) => go(index + dir));
  const setImg = (img: string | null) => act.patchPage(page.id, { img });
  const setText = (text: string) => act.patchPage(page.id, { text });

  return (
    <div className="flex w-full max-w-[1040px] flex-col gap-[18px]">
      <div {...swipe} className="relative aspect-[2/1] w-full overflow-hidden rounded bg-page shadow-[0_1px_2px_var(--shadow),0_28px_56px_-30px_var(--shadow)]"
        style={page.layout !== 'full' ? { backgroundImage: 'linear-gradient(90deg, transparent calc(50% - 1px), var(--line) 50%, transparent calc(50% + 1px))' } : undefined}>
        {page.layout === 'split' && (
          <div className="flex h-full w-full">
            <ImageSlot img={page.img} pageNum={num} onChange={setImg} className="flex-1" />
            <PageText page={page} pageNum={num} index={index} onText={setText}
              font="text-2xl leading-[1.55]" padding="9%" />
          </div>
        )}
        {page.layout === 'full' && (
          <div className="absolute inset-0">
            <ImageSlot img={page.img} pageNum={num} onChange={setImg} className="absolute inset-0" />
            <div className="absolute bottom-[7%] left-[5%] flex h-[40%] w-[42%] rounded-md bg-page">
              <PageText page={page} pageNum={num} index={index} onText={setText}
                font="text-[21px] leading-[1.5]" padding="20px 24px" />
            </div>
          </div>
        )}
        {page.layout === 'text' && (
          <div className="flex h-full w-full">
            <PageText page={page} pageNum={num} index={index} onText={setText}
              font="text-2xl leading-[1.6]" padding="7% 12%" />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <LayoutPicker value={page.layout} onPick={(layout) => act.patchPage(page.id, { layout })} />
        <span className="ml-auto text-[13px] font-medium tabular-nums text-muted">{num} / {total}</span>
        <IconButton label="Previous page" onClick={() => go(index - 1)}><Icon.Back size={18} /></IconButton>
        <IconButton label="Next page" onClick={() => go(index + 1)} disabled={index >= total - 1}><Icon.Next size={18} /></IconButton>
        <IconButton label={`Delete page ${num}`} onClick={() => act.deletePage(page.id)} disabled={total <= 1}><Icon.Trash /></IconButton>
      </div>
    </div>
  );
}
