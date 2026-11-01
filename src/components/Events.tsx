'use client';

import Link from 'next/link';
import { useApp, useDocList } from '@/lib/store';
import type { MonthDoc } from '@/lib/types';
import { DAYS_LONG, cx, dayKey, monthFromId, prevMonthId, weekRange } from '@/lib/util';
import { Icon } from './ui';

export interface NotebookEvent {
  key: string;
  kind: 'week' | 'month';
  title: string;
  sub: string;
  href: string;
}

/** Reflection on the chosen weekday; last month's recap during the first three days of a month. */
export function useEvents(): NotebookEvent[] {
  const { settings, monthsRev } = useApp();
  const { rows } = useDocList<MonthDoc>('month', monthsRev);
  const d = new Date();
  const out: NotebookEvent[] = [];
  const rd = Math.max(0, DAYS_LONG.indexOf(settings.reflectDay));
  const wk = 'w' + dayKey(d);
  if (d.getDay() === rd && !settings.eventsDone[wk]) {
    out.push({ key: wk, kind: 'week', title: `${DAYS_LONG[rd]} reflection`, sub: weekRange(d), href: `/reflect?e=${wk}` });
  }
  const pm = prevMonthId(d);
  const mk = 'm' + pm;
  if (d.getDate() <= 3 && !settings.eventsDone[mk] && (rows || []).some((r) => r.key === pm)) {
    out.push({ key: mk, kind: 'month', title: `${monthFromId(pm).name} recap`, sub: pm, href: `/recap?m=${pm}&e=${mk}` });
  }
  return out;
}

export function EventCards({ compact }: { compact?: boolean }) {
  const events = useEvents();
  const { updateSettings } = useApp();
  if (!events.length) return null;
  const dismiss = (key: string) => updateSettings((s) => ({ ...s, eventsDone: { ...s.eventsDone, [key]: true } }));
  return (
    <div className="flex flex-col gap-2">
      {events.map((ev) => (
        <div key={ev.key} className={cx('flex items-center gap-1 rounded-[18px] bg-bg shadow-[inset_0_0_0_1px_var(--line)]', compact ? 'pl-3.5' : 'pl-5')}>
          <Link href={ev.href} className={cx('flex min-w-0 flex-1 flex-col gap-1', compact ? 'py-2.5' : 'py-3.5')}>
            <span className={cx('font-semibold', compact ? 'text-sm' : 'text-base')}>{ev.title}</span>
            <span className="text-[13px] text-muted">{ev.sub}</span>
          </Link>
          <button type="button" aria-label={`Dismiss ${ev.title}`} onClick={() => dismiss(ev.key)}
            className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink">
            <Icon.Close size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
