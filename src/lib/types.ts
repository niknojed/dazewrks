export type Kind = 'month' | 'script' | 'music' | 'book';

export interface DayBlock {
  id: string;
  kind: 'day' | 'reflection';
  day: number;
  wd: string;
  title: string;
  body: string;
}

export interface AudioBlock {
  id: string;
  kind: 'audio';
  day: number;
  dur: number;
  media: string | null; // storage path
  peaks: number[];      // 0..1, for the waveform
}

export type Block = DayBlock | AudioBlock;

export interface MonthDoc {
  blocks: Block[];
}

export interface Line {
  id: string;
  text: string;
}

export interface Seed {
  id: string;
  from: string; // month id, e.g. '10.26'
  text: string;
  used: boolean;
}

export interface ScriptDoc {
  title: string;
  lines: Line[];
  seeds: Seed[];
}

export type SectionType = 'Intro' | 'Verse' | 'Hook' | 'Bridge' | 'Outro';

export interface Section {
  id: string;
  type: SectionType;
  text: string;
}

export interface Take {
  id: string;
  dur: number;
  media: string | null;
  peaks: number[];
  keeper: boolean;
}

export type SongStatus = 'Idea' | 'Writing' | 'Demo' | 'Final';

export interface Song {
  id: string;
  title: string;
  status: SongStatus;
  len: number; // planned length in seconds, used until a keeper take exists
  lyrics: string;
  structured: boolean;
  sections: Section[];
  takes: Take[];
  from?: string;
}

export type ReleaseFormat = 'single' | 'ep' | 'album';

export interface MusicDoc {
  songs: Song[];
  release: { title: string; format: ReleaseFormat; tracks: string[] };
  cover: string;
  moodNote: string;
  moodImgs: (string | null)[];
}

export type PageLayout = 'split' | 'full' | 'text';

export interface BookPage {
  id: string;
  layout: PageLayout;
  text: string;
  img: string | null;
}

export interface Chapter {
  id: string;
  title: string;
  pages: BookPage[];
}

export interface BookDoc {
  title: string;
  author: string;
  cover: string;
  coverImg: string | null;
  chapters: Chapter[];
}

export interface Settings {
  works: { script: boolean; music: boolean; book: boolean };
  theme: 'light' | 'dark';
  reflectDay: string;
  eventsDone: Record<string, boolean>;
}

export const DEFAULT_SETTINGS: Settings = {
  works: { script: true, music: true, book: true },
  theme: 'light',
  reflectDay: 'Sunday',
  eventsDone: {},
};
