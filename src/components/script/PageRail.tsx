'use client';

import { cx } from '@/lib/util';

export function PageRail({ total, current, onGo }: { total: number; current: number; onGo(page: number): void }) {
  return (
    <nav aria-label="Pages" className="fixed right-2 top-1/2 z-[4] flex h-[60vh] w-11 -translate-y-1/2 flex-col justify-center">
      <span aria-hidden className="absolute bottom-0 right-[15px] top-0 w-px bg-line" />
      {Array.from({ length: total }, (_, p) => {
        const on = p === current;
        return (
          <button key={p} type="button" onClick={() => onGo(p)} aria-label={`Page ${p + 1}`} aria-current={on ? 'page' : undefined}
            className="relative flex min-h-1.5 shrink grow-0 basis-6 items-center justify-end gap-1.5 pr-2">
            {on && <span className="text-[11px] font-semibold leading-none tabular-nums text-ink">{p + 1}</span>}
            <span aria-hidden className={cx('block h-0.5 rounded-[1px]', on ? 'w-4 bg-ink' : 'w-2.5 bg-bar')} />
          </button>
        );
      })}
    </nav>
  );
}
