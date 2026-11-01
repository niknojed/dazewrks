'use client';

import { useEffect, useRef } from 'react';
import { useApp } from '@/lib/store';
import { useRecorder } from '@/lib/media';
import type { Section, Song, Take } from '@/lib/types';
import { cx, uid } from '@/lib/util';
import { AudioPill, AutoTextarea, Icon, IconButton, RecordButton, Segmented } from '../ui';
import { STATUSES, StatusDot } from './shared';
import { Structure, lyricsToSections, sectionsToLyrics } from './Structure';

type Mode = 'lyrics' | 'structure';

export function SongDetail({ song, onChange, onAddTake, onBack, focusTitle, onTitleFocused }: {
  song: Song;
  onChange: (fn: (s: Song) => Song) => void;
  /** Files a take under the song that started recording, even if another song is open by then. */
  onAddTake: (songId: string, take: Take) => void;
  onBack?: () => void;
  focusTitle: boolean;
  onTitleFocused: () => void;
}) {
  const { say } = useApp();
  const rec = useRecorder();
  const titleRef = useRef<HTMLInputElement>(null);
  // The take is attached to whichever song started the recording, even if the view changes.
  const recFor = useRef<string | null>(null);

  useEffect(() => {
    if (!focusTitle) return;
    titleRef.current?.focus();
    onTitleFocused();
  }, [focusTitle, onTitleFocused, song.id]);

  useEffect(() => {
    if (!rec.error) return;
    say(rec.error);
    rec.clearError();
  }, [rec, say]);

  const mode: Mode = song.structured ? 'structure' : 'lyrics';
  const setMode = (m: Mode) => {
    if (m === mode) return;
    onChange((s) => (m === 'structure'
      ? { ...s, structured: true, sections: lyricsToSections(s.lyrics, s.sections ?? []) }
      : { ...s, structured: false, lyrics: sectionsToLyrics(s.sections ?? []) }));
  };

  const cycleStatus = () => onChange((s) => ({ ...s, status: STATUSES[(STATUSES.indexOf(s.status) + 1) % STATUSES.length] }));

  const toggleRec = async () => {
    if (rec.state === 'recording') {
      const target = recFor.current;
      const r = await rec.stop();
      recFor.current = null;
      if (!r || !target) return;
      onAddTake(target, { id: uid('tk'), dur: r.dur, media: r.media, peaks: r.peaks, keeper: false });
      return;
    }
    if (rec.state === 'idle') {
      recFor.current = song.id;
      await rec.start();
    }
  };

  const setKeeper = (id: string) => onChange((s) => ({ ...s, takes: s.takes.map((t) => ({ ...t, keeper: t.id === id ? !t.keeper : false })) }));
  const removeTake = (id: string) => onChange((s) => ({ ...s, takes: s.takes.filter((t) => t.id !== id) }));
  const setSections = (fn: (s: Section[]) => Section[]) => onChange((s) => ({ ...s, sections: fn(s.sections ?? []) }));

  const takes = song.takes ?? [];

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex items-center gap-2 md:gap-3">
        {onBack && (
          <IconButton label="Songs" onClick={onBack} className="-ml-3 md:hidden"><Icon.Back /></IconButton>
        )}
        <input ref={titleRef} className="bare min-w-0 flex-1 text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] md:text-[30px]"
          aria-label="Song title" placeholder="Untitled" value={song.title}
          onChange={(e) => { const v = e.target.value; onChange((s) => ({ ...s, title: v })); }} />
        <button type="button" onClick={cycleStatus} aria-label={`Status ${song.status}`}
          className="inline-flex h-11 flex-none items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-ink2 hover:bg-surface">
          <StatusDot status={song.status} />{song.status}
        </button>
      </div>

      <Segmented<Mode> className="self-start" value={mode} onChange={setMode}
        options={[{ value: 'lyrics', label: 'Lyrics' }, { value: 'structure', label: 'Structure' }]} />

      {mode === 'lyrics' ? (
        <AutoTextarea aria-label="Lyrics" value={song.lyrics}
          onChange={(e) => { const v = e.target.value; onChange((s) => ({ ...s, lyrics: v })); }}
          className="min-h-20 font-serif text-[19px] leading-[1.7] text-ink2 md:text-xl" />
      ) : (
        <Structure key={song.id} sections={song.sections ?? []} onChange={setSections} />
      )}

      <div className="mt-2 flex max-w-[520px] flex-col gap-2">
        {takes.map((t, i) => (
          <AudioPill key={t.id} media={t.media} peaks={t.peaks} dur={t.dur} label={`take ${i + 1}`}
            trailing={(
              <span className="flex flex-none items-center">
                <IconButton label={`Keeper, take ${i + 1}`} pressed={t.keeper} onClick={() => setKeeper(t.id)}
                  className={cx(t.keeper ? 'text-audio hover:text-audio' : '')}>
                  <Icon.Star filled={t.keeper} />
                </IconButton>
                <IconButton label={`Delete take ${i + 1}`} onClick={() => removeTake(t.id)}><Icon.Trash /></IconButton>
              </span>
            )} />
        ))}
        <div className="self-start">
          <RecordButton size="md" state={rec.state} seconds={rec.seconds} level={rec.level} onClick={() => { void toggleRec(); }} />
        </div>
      </div>
    </div>
  );
}
