'use client';

import Link from 'next/link';
import { useApp, useDocList } from '@/lib/store';
import type { MonthDoc } from '@/lib/types';
import { cx, monthFromId, monthSortKey, plural, today } from '@/lib/util';
import { EventCards } from '@/components/Events';
import { Icon } from '@/components/ui';

export default function LibraryPage() {
  const { name, monthsRev } = useApp();
  const { rows, error } = useDocList<MonthDoc>('month', monthsRev);
  const t = today();
  const initial = ((name || '').trim().charAt(0) || '·').toUpperCase();
  const months = (rows || []).slice().sort((a, b) => monthSortKey(b.key).localeCompare(monthSortKey(a.key)));
  const current = months.find((m) => m.key === t.id);
  const hasToday = !!current?.data.blocks?.some((b) => b.kind === 'day' && b.day === t.day);
  if (!current) months.unshift({ key: t.id, title: t.id, status: 'draft', data: { blocks: [] }, updatedAt: '' });

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-7 px-6 pb-16 pt-10 md:px-[6%] md:pt-14">
      <div className="flex items-end justify-between gap-3">
        <header className="flex flex-col gap-2">
          <p className="text-[13px] font-medium text-muted">{t.long}</p>
          <h1 className="text-[34px] font-semibold leading-none tracking-[-0.03em] md:text-[44px]">dazewrks</h1>
        </header>
        <Link href="/profile" aria-label="Profile"
          className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-full bg-ink text-[17px] font-semibold text-invert md:hidden">
          {initial}
        </Link>
      </div>

      <Link href="/today" className="flex items-center gap-3 rounded-[18px] bg-surface px-5 py-[18px]">
        <span aria-hidden className="text-[22px] leading-none">🌱</span>
        <span className="flex-1 text-lg font-semibold">{(hasToday ? 'day ' : 'day ') + t.day}</span>
        <Icon.Next size={18} className="text-muted" />
      </Link>

      <div className="md:hidden"><EventCards /></div>

      {error && <p className="text-sm text-danger">Couldn’t load your months. Check your connection.</p>}

      <section aria-label="Months" className="flex flex-col">
        {months.map((m) => {
          const blocks = m.data.blocks || [];
          const days = new Set(blocks.filter((b) => b.kind === 'day').map((b) => b.day));
          const memos = blocks.filter((b) => b.kind === 'audio').length;
          const info = monthFromId(m.key);
          const meta = plural(days.size, 'day', 'days') + (memos ? ' · ' + plural(memos, 'memo', 'memos') : '');
          return (
            <Link key={m.key} href={m.key === t.id && !blocks.length ? '/today' : `/m/${m.key}`} aria-label={`${m.key}, ${meta}`}
              className="flex flex-col gap-3 border-t border-line py-4">
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-[30px] font-semibold leading-none tracking-[-0.02em]">{m.key}</span>
                <span className="text-[13px] text-muted">{meta}</span>
              </span>
              <span aria-hidden className="grid gap-[3px]" style={{ gridTemplateColumns: 'repeat(31, minmax(0, 1fr))' }}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <span key={d} className={cx('block aspect-square rounded-full',
                    d > info.days ? 'bg-transparent' : days.has(d) ? 'bg-accent' : 'bg-surface2',
                    m.key === t.id && d === t.day && !days.has(d) && 'shadow-[inset_0_0_0_1.5px_var(--accent)]')} />
                ))}
              </span>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
