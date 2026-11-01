'use client';

import type { MusicDoc, ReleaseFormat, Song } from '@/lib/types';
import { cx, fmt, pad2 } from '@/lib/util';
import { Chip, Icon, IconButton } from '../ui';
import { FORMATS, FORMAT_LABEL, classify, trackDur } from './shared';

export function Tracklist({ doc, update }: { doc: MusicDoc; update: (fn: (d: MusicDoc) => MusicDoc) => void }) {
  const { release } = doc;
  const tracks = release.tracks
    .map((id) => doc.songs.find((s) => s.id === id))
    .filter((s): s is Song => !!s);
  const bench = doc.songs.filter((s) => !release.tracks.includes(s.id));
  const total = tracks.reduce((n, s) => n + trackDur(s), 0);
  const cls = classify(tracks.length, total);
  const match = !cls || cls === release.format;

  const setRelease = (fn: (r: MusicDoc['release']) => MusicDoc['release']) => update((d) => ({ ...d, release: fn(d.release) }));
  const setFormat = (format: ReleaseFormat) => setRelease((r) => ({ ...r, format }));
  const move = (id: string, dir: -1 | 1) => setRelease((r) => {
    const t = r.tracks.slice();
    const i = t.indexOf(id), j = i + dir;
    if (i < 0 || j < 0 || j >= t.length) return r;
    [t[i], t[j]] = [t[j], t[i]];
    return { ...r, tracks: t };
  });
  const remove = (id: string) => setRelease((r) => ({ ...r, tracks: r.tracks.filter((x) => x !== id) }));
  const add = (id: string) => setRelease((r) => (r.tracks.includes(id) ? r : { ...r, tracks: [...r.tracks, id] }));

  return (
    <div className="flex max-w-[640px] flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {FORMATS.map((f) => (
          <Chip key={f} on={release.format === f} onClick={() => setFormat(f)}>{FORMAT_LABEL[f]}</Chip>
        ))}
        <span role="status" className={cx('ml-auto text-[13px] font-medium tabular-nums', match ? 'text-muted' : 'text-audio')}>
          {cls ? fmt(total) + (match ? '' : ` · ${FORMAT_LABEL[cls]} length`) : ''}
        </span>
      </div>

      {tracks.length > 0 && (
        <ol className="flex flex-col">
          {tracks.map((s, i) => {
            const d = trackDur(s);
            const name = s.title || 'Untitled';
            return (
              <li key={s.id} className="flex items-center gap-1 border-t border-line py-1.5 md:gap-2">
                <span className="w-7 flex-none text-[13px] font-medium tabular-nums text-muted">{pad2(i + 1)}</span>
                <span className={cx('min-w-0 flex-1 truncate text-base font-medium leading-tight', !s.title && 'text-muted')}>{name}</span>
                <span className="w-12 flex-none text-right text-[13px] tabular-nums text-muted">{d ? fmt(d) : '—'}</span>
                <IconButton label={`Move ${name} up`} disabled={i === 0} onClick={() => move(s.id, -1)}><Icon.Up /></IconButton>
                <IconButton label={`Move ${name} down`} disabled={i === tracks.length - 1} onClick={() => move(s.id, 1)}><Icon.Down /></IconButton>
                <IconButton label={`Remove ${name}`} onClick={() => remove(s.id)}><Icon.Close /></IconButton>
              </li>
            );
          })}
        </ol>
      )}

      {bench.length > 0 && (
        <ul className="flex flex-col">
          {bench.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => add(s.id)} aria-label={`Add ${s.title || 'Untitled'}`}
                className="flex min-h-11 w-full items-center gap-2.5 text-left text-[15px] font-medium leading-tight text-muted hover:text-ink">
                <Icon.Plus size={16} className="flex-none" />
                <span className="min-w-0 truncate">{s.title || 'Untitled'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
