'use client';

import type { Song } from '@/lib/types';
import { cx } from '@/lib/util';
import { Icon } from '../ui';
import { StatusDot } from './shared';

export function SongList({ songs, openId, onOpen, onNew, className }: {
  songs: Song[]; openId: string | null; onOpen: (id: string) => void; onNew: () => void; className?: string;
}) {
  return (
    <div className={cx('flex-col', className)}>
      <ul className="flex flex-col">
        {songs.map((so) => {
          const on = so.id === openId;
          return (
            <li key={so.id}>
              <button type="button" onClick={() => onOpen(so.id)} aria-current={on ? 'true' : undefined}
                className={cx('flex min-h-12 w-full items-center gap-3 rounded-[10px] px-3 py-3 text-left hover:bg-surface', on && 'bg-surface')}>
                <span className={cx('min-w-0 flex-1 truncate text-base font-medium leading-tight', !so.title && 'text-muted')}>{so.title || 'Untitled'}</span>
                <span className="inline-flex flex-none items-center gap-1.5 text-xs font-medium text-muted">
                  <StatusDot status={so.status} />{so.status}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" onClick={onNew} className="flex h-12 items-center gap-2.5 rounded-[10px] px-3 text-[15px] font-medium text-muted hover:text-ink">
        <Icon.Plus size={16} />New song
      </button>
    </div>
  );
}
