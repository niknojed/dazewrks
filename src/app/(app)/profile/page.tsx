'use client';

import { useRouter } from 'next/navigation';
import { clearBackups, useApp } from '@/lib/store';
import { getBackend } from '@/lib/backend';
import type { Settings } from '@/lib/types';
import { DAYS_LONG, cx } from '@/lib/util';
import { Chip, Icon, IconButton, Segmented } from '@/components/ui';

const WORKS: { id: keyof Settings['works']; label: string; icon: React.ReactNode }[] = [
  { id: 'script', label: 'Script', icon: <Icon.Script /> },
  { id: 'music', label: 'Music', icon: <Icon.Music /> },
  { id: 'book', label: 'Books', icon: <Icon.Book /> },
];

export default function ProfilePage() {
  const router = useRouter();
  const { name, setName, email, settings, updateSettings, mode, say } = useApp();
  const initial = ((name || '').trim().charAt(0) || '·').toUpperCase();

  const signOut = async () => {
    try {
      await getBackend().signOut();
      clearBackups();
      router.replace('/login');
    } catch { say('Couldn’t sign out. Try again.'); }
  };

  return (
    <div className="mx-auto flex max-w-[600px] flex-col gap-8 px-6 pb-36 pt-3 md:px-[6%] md:pt-16">
      <IconButton label="Notebook" onClick={() => router.push('/')} className="-ml-3 md:hidden"><Icon.Back /></IconButton>

      <div className="flex items-center gap-4">
        <span aria-hidden className="inline-flex h-16 w-16 flex-none items-center justify-center rounded-full bg-ink text-[26px] font-semibold text-invert">{initial}</span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <input className="bare text-2xl font-semibold tracking-[-0.02em] md:text-[30px]" aria-label="Name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <span className="text-[15px] text-muted">{mode === 'local' ? 'Saved on this device' : email}</span>
        </div>
      </div>

      <section aria-labelledby="works-h" className="flex flex-col">
        <h2 id="works-h" className="mb-1.5 text-[13px] font-medium text-muted">Works</h2>
        {WORKS.map((w) => {
          const on = settings.works[w.id];
          return (
            <button key={w.id} type="button" role="switch" aria-checked={on}
              onClick={() => updateSettings((s) => ({ ...s, works: { ...s.works, [w.id]: !s.works[w.id] } }))}
              className="flex min-h-14 items-center gap-3.5 border-t border-line text-left">
              <span className="text-ink2">{w.icon}</span>
              <span className="flex-1 text-[17px] font-medium">{w.label}</span>
              <span aria-hidden className={cx('flex h-7 w-[46px] flex-none rounded-full p-[3px]', on ? 'justify-end bg-accent' : 'justify-start bg-surface2')}>
                <span className="h-[22px] w-[22px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.25)]" />
              </span>
            </button>
          );
        })}
      </section>

      <section aria-labelledby="look-h" className="flex flex-col gap-2.5">
        <h2 id="look-h" className="text-[13px] font-medium text-muted">Appearance</h2>
        <Segmented className="self-start" value={settings.theme} onChange={(v) => updateSettings((s) => ({ ...s, theme: v }))}
          options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
      </section>

      <section aria-labelledby="rd-h" className="flex flex-col gap-2.5">
        <h2 id="rd-h" className="text-[13px] font-medium text-muted">Reflection day</h2>
        <div className="flex flex-wrap gap-1.5">
          {DAYS_LONG.map((d) => (
            <Chip key={d} on={settings.reflectDay === d} label={d} className="min-w-12"
              onClick={() => updateSettings((s) => ({ ...s, reflectDay: d }))}>{d.slice(0, 3)}</Chip>
          ))}
        </div>
      </section>

      {mode === 'cloud' && (
        <button type="button" onClick={signOut} className="self-start text-[15px] font-medium text-muted hover:text-ink">Sign out</button>
      )}
    </div>
  );
}
