'use client';

import type { BookDoc, BookPage } from '@/lib/types';
import { Icon, IconButton, StoredImage } from '@/components/ui';
import { plural } from '@/lib/util';
import {
  type BookActions, type FlatPage, CoverArt, CoverImageControls, ImageSlot, LayoutPicker, PageText, Swatches, BareInput,
  useSwipe, wordCount,
} from './shared';

// ------------------------------------------------------------------ Book home

function Thumb({ page, num, onOpen }: { page: BookPage; num: number; onOpen: () => void }) {
  const snippet = page.text.trim();
  const showSnippet = !!snippet && !(page.layout === 'full' && page.img);
  const bg = page.img ? undefined : page.layout === 'text'
    ? 'var(--page)' : 'linear-gradient(180deg, var(--surface2) 50%, var(--page) 50%)';
  return (
    <button type="button" onClick={onOpen} aria-label={`Page ${num}`} className="flex flex-col gap-1.5 text-left">
      <span aria-hidden className="relative block aspect-[3/4] w-full overflow-hidden rounded-md shadow-[inset_0_0_0_1px_var(--line)]" style={{ background: bg }}>
        {page.img && (
          <StoredImage path={page.img} alt=""
            className={page.layout === 'split' ? 'absolute inset-x-0 top-0 h-1/2 w-full' : 'absolute inset-0 h-full w-full'} />
        )}
        {showSnippet && (
          <span className="absolute inset-x-2.5 bottom-2.5 line-clamp-3 font-serif text-[13px] leading-[1.35] text-ink2">
            {snippet}
          </span>
        )}
      </span>
      <span className="text-xs font-medium tabular-nums text-muted">{num}</span>
    </button>
  );
}

export function PhoneHome({ book, flat, act }: { book: BookDoc; flat: FlatPage[]; act: BookActions }) {
  let counter = 0;
  return (
    <div className="flex flex-col gap-[18px] px-6 pb-10 pt-8">
      <div className="relative w-full max-w-[300px] self-center">
        <CoverArt book={book} titleSize="text-[32px]" className="w-full rounded-md" />
        <CoverImageControls coverImg={book.coverImg} onChange={act.setCoverImg} className="absolute right-2.5 top-2.5" />
      </div>
      <div className="flex justify-center">
        <Swatches value={book.cover} onPick={act.setCover} size={36} />
      </div>
      <BareInput className="text-[30px] font-semibold leading-[1.1] tracking-[-0.025em]" label="Book title" placeholder="Title" value={book.title} onValue={(v) => act.setTitle(v)} />
      <BareInput className="-mt-2.5 text-[17px] leading-[1.3] text-ink2" label="Author" placeholder="Author" value={book.author} onValue={(v) => act.setAuthor(v)} />
      <span className="text-[13px] leading-none text-muted">
        {plural(flat.length, 'page', 'pages')} · {plural(wordCount(flat), 'word', 'words')}
      </span>

      {book.chapters.map((c, ci) => {
        const shown = c.title || `Chapter ${ci + 1}`;
        return (
          <section key={c.id} aria-label={shown} className="flex flex-col">
            <div className="flex items-center gap-1 pb-1.5 pt-2.5">
              <BareInput className="flex-1 text-[15px] font-semibold leading-[1.3]" label={`Chapter ${ci + 1} title`}
                placeholder={`Chapter ${ci + 1}`} value={c.title} onValue={(v) => act.setChapterTitle(c.id, v)} />
              <IconButton label={`Add page to ${shown}`} onClick={() => act.addPage(c.id)} className="-mr-2.5">
                <Icon.Plus size={17} />
              </IconButton>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-3.5 pt-1">
              {c.pages.map((p) => {
                counter += 1;
                return <Thumb key={p.id} page={p} num={counter} onOpen={() => act.open(p.id)} />;
              })}
            </div>
          </section>
        );
      })}

      <button type="button" onClick={act.addChapter}
        className="flex h-12 items-center gap-2.5 border-t border-line text-[15px] font-medium text-muted hover:text-ink">
        <Icon.Plus size={16} />Chapter
      </button>
    </div>
  );
}

// ------------------------------------------------------------------ Single page

export function PhonePage({ cur, total, act, go }: {
  cur: FlatPage; total: number; act: BookActions; go: (i: number) => void;
}) {
  const { page, index } = cur;
  const num = index + 1;
  const swipe = useSwipe((dir) => go(index + dir));
  const setImg = (img: string | null) => act.patchPage(page.id, { img });
  const setText = (text: string) => act.patchPage(page.id, { text });

  return (
    <div className="flex flex-col gap-3.5 px-6 pb-10 pt-3">
      <div className="-mx-3 flex items-center gap-1">
        <IconButton label="Book" onClick={() => act.open(null)}><Icon.Back /></IconButton>
        <IconButton label="Previous page" onClick={() => go(index - 1)} disabled={index <= 0} className="ml-auto">
          <Icon.Back size={20} />
        </IconButton>
        <span className="text-[13px] font-medium tabular-nums text-muted">{num} / {total}</span>
        <IconButton label="Next page" onClick={() => go(index + 1)} disabled={index >= total - 1}>
          <Icon.Next />
        </IconButton>
        <IconButton label={`Delete page ${num}`} onClick={() => act.deletePage(page.id)} disabled={total <= 1}>
          <Icon.Trash />
        </IconButton>
      </div>

      <div {...swipe} className="relative -mx-6 aspect-[3/4] overflow-hidden bg-page shadow-[0_1px_0_var(--line),0_-1px_0_var(--line)]">
        {page.layout === 'split' && (
          <div className="flex h-full flex-col">
            <ImageSlot img={page.img} pageNum={num} onChange={setImg} className="flex-[0_0_50%]" />
            <PageText page={page} pageNum={num} index={index} onText={setText}
              font="text-[22px] leading-[1.5]" padding="18px 24px 24px" />
          </div>
        )}
        {page.layout === 'full' && (
          <div className="absolute inset-0">
            <ImageSlot img={page.img} pageNum={num} onChange={setImg} className="absolute inset-0" />
            <div className="absolute inset-x-[5%] bottom-[5%] flex h-[36%] rounded-md bg-page">
              <PageText page={page} pageNum={num} index={index} onText={setText}
                font="text-[20px] leading-[1.45]" padding="14px 16px" />
            </div>
          </div>
        )}
        {page.layout === 'text' && (
          <div className="absolute inset-0 flex">
            <PageText page={page} pageNum={num} index={index} onText={setText}
              font="text-[22px] leading-[1.55]" padding="36px 32px" />
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <LayoutPicker value={page.layout} onPick={(layout) => act.patchPage(page.id, { layout })} large />
      </div>
    </div>
  );
}
