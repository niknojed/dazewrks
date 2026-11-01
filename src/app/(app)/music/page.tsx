'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDoc } from '@/lib/store';
import type { MusicDoc, Song, Take } from '@/lib/types';
import { cx, uid } from '@/lib/util';
import { SaveDot, Segmented } from '@/components/ui';
import { SongList } from '@/components/music/SongList';
import { SongDetail } from '@/components/music/SongDetail';
import { Tracklist } from '@/components/music/Tracklist';
import { Mood } from '@/components/music/Mood';

type Tab = 'songs' | 'tracks' | 'mood';

const init = (): MusicDoc => ({
  songs: [],
  release: { title: '', format: 'single', tracks: [] },
  cover: 'sw1',
  moodNote: '',
  moodImgs: [null, null, null],
});

const newSong = (): Song => ({
  id: uid('so'), title: '', status: 'Idea', len: 0, lyrics: '', structured: false, sections: [], takes: [],
});

function isWide(): boolean {
  try { return window.matchMedia('(min-width: 768px)').matches; } catch { return false; }
}

export default function MusicPage() {
  const { data, update, status } = useDoc<MusicDoc>('music', 'main', init, (d) => d.release.title || 'Untitled release');
  const [tab, setTab] = useState<Tab>('songs');
  const [openId, setOpenId] = useState<string | null>(null);
  const [focusTitle, setFocusTitle] = useState(false);
  const [picked, setPicked] = useState(false);

  // On wide screens the detail pane sits beside the list, so open the first song once loaded.
  useEffect(() => {
    if (!data || picked) return;
    setPicked(true);
    if (!openId && data.songs.length && isWide()) setOpenId(data.songs[0].id);
  }, [data, picked, openId]);

  const clearFocus = useCallback(() => setFocusTitle(false), []);

  if (!data) {
    return <div className="mx-auto max-w-[1080px] px-4 pt-10 md:px-[5%] md:pt-14" aria-busy="true"><div className="h-10 w-2/3 max-w-sm rounded-lg bg-surface" /></div>;
  }

  const song = data.songs.find((s) => s.id === openId) ?? null;

  const updateSong = (id: string, fn: (s: Song) => Song) =>
    update((d) => ({ ...d, songs: d.songs.map((s) => (s.id === id ? fn(s) : s)) }));
  const addTake = (id: string, take: Take) => updateSong(id, (s) => ({ ...s, takes: [...(s.takes ?? []), take] }));
  const createSong = () => {
    const s = newSong();
    update((d) => ({ ...d, songs: [s, ...d.songs] }));
    setOpenId(s.id);
    setFocusTitle(true);
  };

  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-6 px-4 pb-32 pt-8 md:px-[5%] md:pt-14">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <input className="bare min-w-0 flex-[1_1_280px] text-[32px] font-semibold leading-[1.1] tracking-[-0.025em] md:text-[40px]"
          aria-label="Release title" placeholder="Untitled release" value={data.release.title}
          onChange={(e) => { const v = e.target.value; update((d) => ({ ...d, release: { ...d.release, title: v } })); }} />
        <div className="flex items-center gap-3">
          <SaveDot status={status} />
          <Segmented<Tab> value={tab} onChange={setTab}
            options={[{ value: 'songs', label: 'Songs' }, { value: 'tracks', label: 'Tracklist' }, { value: 'mood', label: 'Mood' }]} />
        </div>
      </header>

      {tab === 'songs' && (
        <div className="flex items-start gap-10">
          <SongList songs={data.songs} openId={openId} onOpen={setOpenId} onNew={createSong}
            className={cx('w-full md:w-auto md:max-w-[340px] md:flex-[1_1_260px]', song ? 'hidden md:flex' : 'flex')} />
          {song && (
            <div className="min-w-0 flex-[999_1_380px]">
              <SongDetail song={song}
                onChange={(fn) => updateSong(song.id, fn)}
                onAddTake={addTake}
                onBack={() => setOpenId(null)}
                focusTitle={focusTitle} onTitleFocused={clearFocus} />
            </div>
          )}
        </div>
      )}

      {tab === 'tracks' && <Tracklist doc={data} update={update} />}
      {tab === 'mood' && <Mood doc={data} update={update} />}
    </div>
  );
}
