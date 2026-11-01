'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { useMediaUrl } from '@/lib/media';
import { cx, fmt } from '@/lib/util';

// ------------------------------------------------------------------ Icons
type IconProps = { size?: number; className?: string };
const base = (size = 20) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true });

export const Icon = {
  Back: (p: IconProps) => <svg {...base(p.size ?? 22)} className={p.className}><path d="M15 5l-7 7 7 7" /></svg>,
  Next: (p: IconProps) => <svg {...base(p.size)} className={p.className}><path d="M9 5l7 7-7 7" /></svg>,
  Up: (p: IconProps) => <svg {...base(p.size ?? 18)} className={p.className}><path d="M6 15l6-6 6 6" /></svg>,
  Down: (p: IconProps) => <svg {...base(p.size ?? 18)} className={p.className}><path d="M6 9l6 6 6-6" /></svg>,
  Plus: (p: IconProps) => <svg {...base(p.size)} className={p.className}><path d="M12 5v14M5 12h14" /></svg>,
  Close: (p: IconProps) => <svg {...base(p.size ?? 16)} className={p.className}><path d="M6 6l12 12M18 6L6 18" /></svg>,
  Mic: (p: IconProps) => <svg {...base(p.size)} className={p.className}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" /></svg>,
  Trash: (p: IconProps) => <svg {...base(p.size ?? 17)} className={p.className}><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" /></svg>,
  Sprout: (p: IconProps) => <svg {...base(p.size)} className={p.className}><path d="M12 21v-9" /><path d="M12 12c0-4 3-7 8-7 0 4-3 7-8 7z" /><path d="M12 14c0-3-2.5-5.5-7-5.5 0 3 2.5 5.5 7 5.5z" /></svg>,
  Script: (p: IconProps) => <svg {...base(p.size)} className={p.className}><rect x="5" y="3" width="14" height="18" rx="1.5" /><path d="M9 8h6M7.5 12h9M10 16h4" /></svg>,
  Music: (p: IconProps) => <svg {...base(p.size)} className={p.className}><path d="M9 18V6l10-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="16" r="2.5" /></svg>,
  Book: (p: IconProps) => <svg {...base(p.size)} className={p.className}><path d="M12 6c-2-1.5-5-2-8-1.5v14c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-14c-3-.5-6 0-8 1.5z" /><path d="M12 6v14" /></svg>,
  Pages: (p: IconProps) => <svg {...base(p.size)} className={p.className}><rect x="8" y="3" width="12" height="15" rx="1.5" /><path d="M5 7v12.5A1.5 1.5 0 0 0 6.5 21H15" /></svg>,
  Chevrons: (p: IconProps) => <svg {...base(p.size ?? 14)} strokeWidth={2.2} className={p.className}><path d="M8 9l4-4 4 4M8 15l4 4 4-4" /></svg>,
  Image: (p: IconProps) => <svg {...base(p.size ?? 15)} className={p.className}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5-8 8" /></svg>,
  Star: ({ size = 19, filled }: IconProps & { filled?: boolean }) => <svg {...base(size)} fill={filled ? 'currentColor' : 'none'} strokeWidth={1.8}><path d="M12 4l2.4 5 5.6.8-4 3.9.9 5.5L12 16.6 7.1 19.2l.9-5.5-4-3.9 5.6-.8z" /></svg>,
  Play: ({ size = 16 }: IconProps) => <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>,
  Pause: ({ size = 16 }: IconProps) => <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden><rect x="7" y="5" width="3.5" height="14" rx="1" fill="currentColor" /><rect x="13.5" y="5" width="3.5" height="14" rx="1" fill="currentColor" /></svg>,
};

// ------------------------------------------------------------------ IconButton
export function IconButton({ label, onClick, children, disabled, className, pressed }: {
  label: string; onClick?: () => void; children: React.ReactNode; disabled?: boolean; className?: string; pressed?: boolean;
}) {
  return (
    <button type="button" aria-label={label} aria-pressed={pressed} onClick={onClick} disabled={disabled}
      className={cx('inline-flex h-11 w-11 flex-none items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent', className)}>
      {children}
    </button>
  );
}

// ------------------------------------------------------------------ Auto-growing textarea, no chrome
export type AutoTextareaHandle = { focus(pos?: number): void; el: HTMLTextAreaElement | null };

export const AutoTextarea = forwardRef<AutoTextareaHandle, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }>(
  function AutoTextarea({ className, value, ...rest }, ref) {
    const el = useRef<HTMLTextAreaElement>(null);
    const resize = useCallback(() => {
      const t = el.current; if (!t) return;
      t.style.height = 'auto';
      t.style.height = t.scrollHeight + 'px';
    }, []);
    useLayoutEffect(resize, [value, resize]);
    useEffect(() => {
      const t = el.current; if (!t || typeof ResizeObserver === 'undefined') return;
      let w = t.clientWidth;
      const ro = new ResizeObserver(() => { if (t.clientWidth !== w) { w = t.clientWidth; resize(); } });
      ro.observe(t);
      return () => ro.disconnect();
    }, [resize]);
    useImperativeHandle(ref, () => ({
      el: el.current,
      focus(pos?: number) {
        const t = el.current; if (!t) return;
        t.focus();
        if (typeof pos === 'number') t.setSelectionRange(pos, pos);
      },
    }), []);
    return <textarea ref={el} rows={1} value={value} className={cx('bare', className)} {...rest} />;
  },
);

// ------------------------------------------------------------------ Waveform + audio
export function Bars({ peaks, playing, progress = 0, live }: { peaks: number[]; playing?: boolean; progress?: number; live?: boolean }) {
  const list = peaks.length ? peaks : Array.from({ length: 40 }, () => 0.2);
  return (
    <div className={cx('bars flex h-7 min-w-0 flex-1 items-center gap-[2px] overflow-hidden', playing && 'playing', live && 'live')} aria-hidden>
      {list.map((p, i) => (
        <span key={i} className="bar w-[3px] flex-none rounded-sm"
          style={{ height: Math.max(4, Math.round(4 + p * 22)), background: live ? 'var(--invert)' : (i / list.length < progress ? 'var(--audio)' : 'var(--bar)') }} />
      ))}
    </div>
  );
}

/** One recording: play button, waveform, length. Plays the stored file. */
export function AudioPill({ media, peaks, dur, trailing, label }: {
  media: string | null; peaks: number[]; dur: number; trailing?: React.ReactNode; label?: string;
}) {
  const { url, failed } = useMediaUrl(media);
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => () => { audio.current?.pause(); }, []);

  const toggle = async () => {
    if (!url) return;
    if (!audio.current) {
      const a = new Audio(url);
      a.ontimeupdate = () => setProgress(a.duration ? a.currentTime / a.duration : 0);
      a.onended = () => { setPlaying(false); setProgress(0); };
      a.onerror = () => setPlaying(false);
      audio.current = a;
    }
    const a = audio.current;
    if (a.paused) {
      try { await a.play(); setPlaying(true); } catch { setPlaying(false); }
    } else { a.pause(); setPlaying(false); }
  };

  return (
    <div className="flex items-center gap-3 rounded-[28px] bg-surface py-1.5 pl-1.5 pr-1">
      <button type="button" onClick={toggle} disabled={!url} aria-pressed={playing}
        aria-label={(playing ? 'Pause ' : 'Play ') + (label ? label + ' ' : '') + fmt(dur)}
        className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-full bg-ink text-invert disabled:opacity-40">
        {playing ? <Icon.Pause /> : <Icon.Play />}
      </button>
      <Bars peaks={peaks} playing={playing} progress={progress} />
      <span className="text-xs font-medium tabular-nums text-muted">{failed ? 'Missing' : fmt(dur)}</span>
      {trailing}
    </div>
  );
}

// ------------------------------------------------------------------ Record button (big, centered)
export function RecordButton({ state, seconds, level, onClick, size = 'lg' }: {
  state: 'idle' | 'requesting' | 'recording' | 'saving'; seconds: number; level: number; onClick: () => void; size?: 'lg' | 'md';
}) {
  const recording = state === 'recording';
  const busy = state === 'requesting' || state === 'saving';
  const live = Array.from({ length: 20 }, (_, i) => Math.max(0.15, level * (0.5 + 0.5 * Math.abs(Math.sin(i * 1.7 + seconds)))));
  const h = size === 'lg' ? 'h-16 min-w-16' : 'h-13 min-w-13';
  return (
    <button type="button" onClick={onClick} disabled={busy} aria-pressed={recording}
      aria-label={recording ? 'Stop recording' : state === 'saving' ? 'Saving recording' : 'Record'}
      className={cx('pointer-events-auto inline-flex items-center justify-center gap-3 rounded-full bg-ink text-invert shadow-[0_12px_28px_-12px_rgba(0,0,0,0.45)] disabled:opacity-60', h, recording ? 'px-5' : 'px-0')}>
      {recording ? (
        <>
          <span className="rec-dot" aria-hidden />
          <span className="w-24"><Bars peaks={live} live /></span>
          <span className="text-[15px] font-medium tabular-nums">{fmt(seconds)}</span>
          <span aria-hidden className="ml-1 h-3.5 w-3.5 rounded-[3px] bg-invert" />
        </>
      ) : state === 'saving' ? (
        <span className="px-5 text-sm font-medium">Saving…</span>
      ) : <Icon.Mic size={26} />}
    </button>
  );
}

// ------------------------------------------------------------------ Image from storage
export function StoredImage({ path, alt, className }: { path: string; alt: string; className?: string }) {
  const { url, failed } = useMediaUrl(path);
  if (failed) return <div className={cx('flex items-center justify-center bg-surface text-sm text-muted', className)}>Image missing</div>;
  if (!url) return <div className={cx('bg-surface', className)} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={cx('object-cover', className)} />;
}

// ------------------------------------------------------------------ Segmented control + chips
export function Segmented<T extends string>({ options, value, onChange, className }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; className?: string;
}) {
  return (
    <div className={cx('inline-flex gap-1 rounded-xl bg-surface p-1', className)}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}
          className={cx('h-9 rounded-[9px] px-4 text-[13px] font-medium', o.value === value ? 'bg-bg text-ink shadow-[0_1px_2px_var(--shadow)]' : 'text-muted')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({ on, onClick, children, label, className }: { on?: boolean; onClick?: () => void; children: React.ReactNode; label?: string; className?: string }) {
  return (
    <button type="button" aria-pressed={on} aria-label={label} onClick={onClick}
      className={cx('h-9 flex-none whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium', on ? 'bg-ink text-invert' : 'text-muted hover:text-ink', className)}>
      {children}
    </button>
  );
}

// ------------------------------------------------------------------ Bottom sheet / popover
export function Sheet({ open, onClose, label, modal = true, children }: {
  open: boolean; onClose: () => void; label: string; modal?: boolean; children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<Element | null>(null);
  useEffect(() => {
    if (!open || !modal) return;
    prevFocus.current = document.activeElement;
    panel.current?.querySelector<HTMLElement>('button, [href], input, textarea')?.focus();
    return () => { (prevFocus.current as HTMLElement | null)?.focus?.(); };
  }, [open, modal]);
  if (!open) return null;
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
    if (e.key === 'Tab' && modal && panel.current) {
      const f = panel.current.querySelectorAll<HTMLElement>('button, [href], input, textarea');
      if (!f.length) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  };
  return (
    <div className={cx('fixed z-40 flex flex-col items-center', modal ? 'inset-0 justify-end' : 'inset-x-0 bottom-24 md:bottom-6')}>
      {modal && <button type="button" tabIndex={-1} aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default bg-black/25" />}
      <div ref={panel} role="dialog" aria-modal={modal} aria-label={label} onKeyDown={onKey}
        className="sheet relative mb-3 max-h-[60vh] w-[min(560px,calc(100%-20px))] overflow-y-auto rounded-[22px] bg-bg px-1 pb-2 pt-1 shadow-[0_0_0_1px_var(--line),0_24px_48px_-20px_rgba(0,0,0,0.25)]">
        {children}
      </div>
    </div>
  );
}

export function SaveDot({ status }: { status: 'loading' | 'saved' | 'saving' | 'error' }) {
  if (status === 'saved' || status === 'loading') return null;
  return (
    <span role="status" className={cx('text-xs font-medium', status === 'error' ? 'text-danger' : 'text-muted')}>
      {status === 'error' ? 'Not saved' : 'Saving'}
    </span>
  );
}
