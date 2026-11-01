'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp, useDocList } from '@/lib/store';
import type { MonthDoc } from '@/lib/types';
import { cx, monthSortKey, today } from '@/lib/util';
import { Icon } from './ui';
import { EventCards } from './Events';

type NavItem = { href: string; label: string; icon: React.ReactNode; match: (p: string) => boolean };

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname() || '/';
  const { settings, name, toast, monthsRev, mode } = useApp();
  const { rows } = useDocList<MonthDoc>('month', monthsRev);
  const t = today();
  const initial = ((name || '').trim().charAt(0) || '·').toUpperCase();

  const works: NavItem[] = [
    settings.works.script && { href: '/script', label: 'Script', icon: <Icon.Script />, match: (p: string) => p.startsWith('/script') },
    settings.works.music && { href: '/music', label: 'Music', icon: <Icon.Music />, match: (p: string) => p.startsWith('/music') },
    settings.works.book && { href: '/book', label: 'Book', icon: <Icon.Book />, match: (p: string) => p.startsWith('/book') },
  ].filter(Boolean) as NavItem[];

  const tabs: NavItem[] = [
    { href: '/', label: 'Notes', icon: <Icon.Sprout />, match: (p) => p === '/' || p.startsWith('/m/') || p.startsWith('/reflect') || p.startsWith('/recap') || p.startsWith('/profile') },
    ...works,
  ];

  const months = (rows || []).slice().sort((a, b) => monthSortKey(b.key).localeCompare(monthSortKey(a.key)));

  return (
    <div className="min-h-dvh md:flex">
      {/* Sidebar (web) */}
      <aside aria-label="Library" className="sticky top-0 hidden h-dvh w-[260px] flex-none flex-col gap-6 overflow-y-auto border-r border-line bg-side px-3.5 py-7 md:flex">
        <div className="flex flex-col gap-1 px-3">
          <Link href="/" className="text-xl font-semibold tracking-tight">dazewrks</Link>
          <span className="text-[13px] text-muted">{t.long}</span>
        </div>
        <EventCards compact />
        <nav aria-label="Months" className="flex flex-col gap-0.5">
          <Link href="/today" className="nav-btn"><span aria-hidden>🌱</span>day {t.day}</Link>
          {months.map((m) => {
            const on = path === `/m/${m.key}`;
            const days = (m.data.blocks || []).filter((b) => b.kind === 'day').length;
            return (
              <Link key={m.key} href={`/m/${m.key}`} aria-current={on ? 'page' : undefined} className={cx('nav-btn', on && 'on')}>
                <span className="flex-1 font-semibold tracking-tight">{m.key}</span>
                <span className="text-xs text-muted">{days}</span>
              </Link>
            );
          })}
        </nav>
        {works.length > 0 && (
          <nav aria-label="Works" className="flex flex-col gap-0.5">
            <span className="px-3 pb-1.5 text-xs font-medium text-muted">Works</span>
            {works.map((w) => (
              <Link key={w.href} href={w.href} aria-current={w.match(path) ? 'page' : undefined} className={cx('nav-btn', w.match(path) && 'on')}>
                <span className="text-muted">{w.icon}</span>{w.label}
              </Link>
            ))}
          </nav>
        )}
        <Link href="/profile" aria-current={path.startsWith('/profile') ? 'page' : undefined} className={cx('nav-btn mt-auto', path.startsWith('/profile') && 'on')}>
          <span aria-hidden className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-full bg-ink text-[13px] font-semibold text-invert">{initial}</span>
          <span className="min-w-0 flex-1 truncate">{name || 'Profile'}</span>
          {mode === 'local' && <span className="text-[11px] text-muted">This device</span>}
        </Link>
      </aside>

      <main className="min-w-0 flex-1 pb-[calc(76px+env(safe-area-inset-bottom))] md:pb-0">{children}</main>

      {/* Tab bar (phone) */}
      <nav aria-label="Sections" className="fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-bg px-2 pb-[calc(14px+env(safe-area-inset-bottom))] md:hidden"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((tb) => {
          const on = tb.match(path);
          return (
            <Link key={tb.href} href={tb.href} aria-current={on ? 'page' : undefined}
              className={cx('flex h-[62px] flex-col items-center justify-center gap-1.5 rounded-2xl text-[11px] font-medium', on ? 'text-ink' : 'text-muted')}>
              {tb.icon}{tb.label}
            </Link>
          );
        })}
      </nav>

      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-4 top-4 z-50 flex justify-center">
        {toast && <span className="toast rounded-full bg-ink px-4 py-2.5 text-[13px] font-medium text-invert">{toast}</span>}
      </div>
    </div>
  );
}
