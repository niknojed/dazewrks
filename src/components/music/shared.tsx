import type { ReleaseFormat, SectionType, Song, SongStatus } from '@/lib/types';
import { cx } from '@/lib/util';

export const STATUSES: SongStatus[] = ['Idea', 'Writing', 'Demo', 'Final'];

export const STATUS_DOT: Record<SongStatus, string> = {
  Idea: 'var(--bar)',
  Writing: 'var(--writing)',
  Demo: 'var(--audio)',
  Final: 'var(--accent)',
};

export const SECTION_TYPES: SectionType[] = ['Intro', 'Verse', 'Hook', 'Bridge', 'Outro'];

export const SECTION_STYLE: Record<SectionType, { block: string; dot: string }> = {
  Intro: { block: 'shadow-[inset_0_0_0_1.5px_var(--bar)] text-muted', dot: 'shadow-[inset_0_0_0_1.5px_var(--muted)]' },
  Verse: { block: 'bg-surface2 text-ink', dot: 'bg-bar' },
  Hook: { block: 'bg-ink text-invert', dot: 'bg-ink' },
  Bridge: { block: 'bg-accent text-invert', dot: 'bg-accent' },
  Outro: { block: 'shadow-[inset_0_0_0_1.5px_var(--bar)] text-muted', dot: 'shadow-[inset_0_0_0_1.5px_var(--muted)]' },
};

export const FORMAT_LABEL: Record<ReleaseFormat, string> = { single: 'Single', ep: 'EP', album: 'Album' };
export const FORMATS: ReleaseFormat[] = ['single', 'ep', 'album'];

export interface Swatch { id: string; name: string; hex: string; ink: string }
export const MUSIC_SW: Swatch[] = [
  { id: 'sw1', name: 'Moss', hex: '#2F3B2C', ink: '#EEEAE2' },
  { id: 'sw2', name: 'Amber', hex: '#E7A955', ink: '#1A1206' },
  { id: 'sw3', name: 'Bone', hex: '#D8CCB6', ink: '#1C1A17' },
  { id: 'sw4', name: 'Ink', hex: '#1A1918', ink: '#EEEAE2' },
];

/** Keeper take length, else the planned length. */
export function trackDur(song: Song): number {
  const k = (song.takes ?? []).find((t) => t.keeper);
  return k ? k.dur : song.len || 0;
}

/** What the stores would call a release of this size. */
export function classify(n: number, total: number): ReleaseFormat | null {
  if (n === 0) return null;
  if (n <= 3 && total < 1800) return 'single';
  if (n <= 6 && total < 1800) return 'ep';
  return 'album';
}

export function StatusDot({ status, className }: { status: SongStatus; className?: string }) {
  return <span aria-hidden className={cx('inline-block h-[7px] w-[7px] flex-none rounded-full', className)} style={{ background: STATUS_DOT[status] ?? STATUS_DOT.Idea }} />;
}
