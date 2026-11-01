'use client';

import { Icon } from '@/components/ui';
import type { Seed } from '@/lib/types';
import { cx } from '@/lib/util';

export function Seeds({ seeds, open, onToggle, onUse }: {
  seeds: Seed[]; open: boolean; onToggle(): void; onUse(seed: Seed): void;
}) {
  if (!seeds.length) return null;
  return (
    <div className="-mr-5 flex items-center gap-2 md:mr-0 md:items-start">
      <button type="button" onClick={onToggle} aria-expanded={open} aria-label={`From notes, ${seeds.length}`}
        className="inline-flex h-9 flex-none items-center gap-1.5 rounded-full bg-surface pl-3 pr-2.5 text-[13px] font-medium tabular-nums text-ink2">
        <span aria-hidden>🌱</span>{seeds.length}
        <Icon.Next size={14} className={cx('text-muted transition-transform duration-150', open && 'rotate-180')} />
      </button>
      {open && (
        <div role="group" aria-label="From notes"
          className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto pr-5 md:flex-wrap md:overflow-visible md:pr-0">
          {seeds.map((s) => (
            <button key={s.id} type="button" onClick={() => onUse(s)} aria-label={`Add to script: ${s.text}`}
              className="flex max-w-[260px] flex-none items-center rounded-[20px] bg-surface px-3.5 py-[9px] hover:bg-surface2 md:max-w-[340px]">
              <span className="truncate font-serif text-[15px] italic leading-[1.3] text-ink2">{s.text}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
