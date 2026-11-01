'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp, useDocList } from '@/lib/store';
import type { DayBlock, MonthDoc } from '@/lib/types';
import { monthFromId, monthId, plural, prevMonthId } from '@/lib/util';
import { Icon, IconButton, Segmented } from '@/components/ui';

export default function RecapPage() {
  return <Suspense><Recap /></Suspense>;
}

/** Last three months, newest last. */
function seasonOf(id: string): string[] {
  const [mm, yy] = id.split('.').map(Number);
  return [2, 1, 0].map((k) => monthId(new Date(2000 + yy, mm - 1 - k, 1)));
}

function Recap() {
  const router = useRouter();
  const search = useSearchParams();
  const { monthsRev, updateSettings } = useApp();
  const { rows } = useDocList<MonthDoc>('month', monthsRev);
  const [view, setView] = useState<'month' | 'season'>('month');
  const id = search.get('m') && /^\d{2}\.\d{2}$/.test(search.get('m')!) ? search.get('m')! : prevMonthId(new Date());
  const info = monthFromId(id);

  useEffect(() => {
    const key = search.get('e');
    if (key) updateSettings((s) => (s.eventsDone[key] ? s : { ...s, eventsDone: { ...s.eventsDone, [key]: true } }));
  }, [search, updateSettings]);

  const doc = rows?.find((r) => r.key === id)?.data;
  const blocks = doc?.blocks || [];
  const days = blocks.filter((b): b is DayBlock => b.kind === 'day');
  const memos = blocks.filter((b) => b.kind === 'audio').length;
  const words = blocks.reduce((n, b) => n + (b.kind === 'audio' ? 0 : `${b.title} ${b.body}`.trim().split(/\s+/).filter(Boolean).length), 0);
  const moments = days.filter((b) => b.title.trim()).slice().sort((a, b) => a.day - b.day);
  const season = seasonOf(id).map((m) => ({ id: m, days: (rows?.find((r) => r.key === m)?.data.blocks || []).filter((b) => b.kind === 'day').length }));
  const max = Math.max(1, ...season.map((s) => s.days));

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-6 px-6 pb-36 pt-3 md:gap-7 md:px-[6%] md:pt-16">
      <IconButton label="dazewrks" onClick={() => router.push('/')} className="-ml-3 md:hidden"><Icon.Back /></IconButton>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[30px] font-semibold leading-none tracking-[-0.025em] md:text-[40px]">{view === 'month' ? id : 'Season'}</h1>
        <Segmented value={view} onChange={setView} options={[{ value: 'month', label: info.name }, { value: 'season', label: 'Season' }]} />
      </div>

      {view === 'month' ? (
        <div className="flex flex-col gap-7">
          <div className="flex gap-8 md:gap-10">
            {[{ v: days.length, l: 'days' }, { v: memos, l: memos === 1 ? 'memo' : 'memos' }, { v: words, l: 'words' }].map((s) => (
              <div key={s.l} className="flex flex-col gap-1.5">
                <span className="text-[30px] font-medium leading-none tracking-[-0.02em] md:text-4xl">{s.v}</span>
                <span className="text-[13px] text-muted">{s.l}</span>
              </div>
            ))}
          </div>
          <div>
            {moments.map((m) => (
              <Link key={m.id} href={`/m/${id}`} className="flex items-baseline gap-4 border-t border-line py-3.5">
                <span className="w-14 flex-none text-[13px] font-medium text-accent">day {m.day}</span>
                <span className="font-serif text-[17px] leading-snug text-ink2">{m.title}</span>
              </Link>
            ))}
            {!moments.length && <p className="border-t border-line pt-4 text-muted">{plural(0, 'day', 'days')} written in {info.name}.</p>}
          </div>
        </div>
      ) : (
        <div className="grid h-60 grid-cols-3 items-end gap-5">
          {season.map((s) => (
            <div key={s.id} className="flex h-full flex-col justify-end gap-2.5">
              <span aria-hidden className="block w-full rounded-md" style={{ height: s.days ? Math.max(10, Math.round((160 * s.days) / max)) : 4, background: s.days ? 'var(--accent)' : 'var(--surface2)' }} />
              <span className="text-lg font-semibold leading-none">{s.id}</span>
              <span className="text-[13px] text-muted">{s.days ? plural(s.days, 'day', 'days') : '—'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
