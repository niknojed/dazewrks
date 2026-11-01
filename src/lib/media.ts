'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getBackend } from './backend';

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'saving';

export interface Recording {
  media: string;
  dur: number;
  peaks: number[];
}

function pickMime(): { mime: string; ext: string } {
  const options = [
    { mime: 'audio/webm;codecs=opus', ext: 'webm' },
    { mime: 'audio/mp4', ext: 'm4a' },
    { mime: 'audio/webm', ext: 'webm' },
    { mime: 'audio/ogg;codecs=opus', ext: 'ogg' },
  ];
  for (const o of options) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(o.mime)) return o;
  }
  return { mime: '', ext: 'webm' };
}

/** Downsample decoded audio into `n` peak values between 0 and 1. */
async function computePeaks(blob: Blob, n = 48): Promise<number[]> {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    const ch = buf.getChannelData(0);
    const size = Math.max(1, Math.floor(ch.length / n));
    const out: number[] = [];
    for (let i = 0; i < n; i++) {
      let max = 0;
      for (let j = i * size; j < Math.min(ch.length, (i + 1) * size); j++) max = Math.max(max, Math.abs(ch[j]));
      out.push(max);
    }
    void ctx.close();
    const top = Math.max(0.01, ...out);
    return out.map((v) => Math.round((v / top) * 100) / 100);
  } catch {
    return Array.from({ length: n }, () => 0.3);
  }
}

/**
 * Record from the microphone. `stop()` uploads the take and resolves with its storage path,
 * duration and waveform peaks. Errors surface through `error`.
 */
export function useRecorder() {
  const [state, setState] = useState<RecorderState>('idle');
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const started = useRef(0);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const raf = useRef<number | null>(null);
  const mime = useRef(pickMime());
  const meterCtx = useRef<AudioContext | null>(null);
  const failed = useRef<{ blob: Blob; dur: number; peaks: number[] } | null>(null);
  const [hasFailed, setHasFailed] = useState(false);

  const cleanup = useCallback(() => {
    if (tick.current) clearInterval(tick.current);
    if (raf.current) cancelAnimationFrame(raf.current);
    tick.current = null; raf.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (meterCtx.current) { void meterCtx.current.close().catch(() => {}); meterCtx.current = null; }
    setLevel(0);
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const start = useCallback(async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Recording isn’t supported in this browser.');
      return;
    }
    setState('requesting');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      const r = mime.current.mime ? new MediaRecorder(s, { mimeType: mime.current.mime }) : new MediaRecorder(s);
      chunks.current = [];
      r.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      r.start(250);
      rec.current = r;
      started.current = performance.now();
      setSeconds(0);
      tick.current = setInterval(() => setSeconds(Math.floor((performance.now() - started.current) / 1000)), 250);
      // Live input level for the recording waveform.
      try {
        const ctx = new AudioContext();
        meterCtx.current = ctx;
        const an = ctx.createAnalyser();
        an.fftSize = 256;
        ctx.createMediaStreamSource(s).connect(an);
        const arr = new Uint8Array(an.frequencyBinCount);
        const loop = () => {
          an.getByteTimeDomainData(arr);
          let peak = 0;
          for (const v of arr) peak = Math.max(peak, Math.abs(v - 128));
          setLevel(Math.min(1, peak / 64));
          raf.current = requestAnimationFrame(loop);
        };
        loop();
      } catch { /* level meter is optional */ }
      setState('recording');
    } catch (e) {
      cleanup();
      setState('idle');
      const name = (e as { name?: string })?.name;
      setError(name === 'NotAllowedError' ? 'Microphone access is blocked. Allow it in your browser settings.' : 'Couldn’t start the microphone.');
    }
  }, [cleanup]);

  /** Upload with a few retries; on failure keep the take so it can be retried. */
  const upload = useCallback(async (blob: Blob, dur: number, peaks: number[]): Promise<Recording | null> => {
    setState('saving');
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const media = await getBackend().uploadMedia(blob, mime.current.ext);
        failed.current = null; setHasFailed(false);
        setState('idle');
        return { media, dur, peaks };
      } catch {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      }
    }
    failed.current = { blob, dur, peaks }; setHasFailed(true);
    setState('idle');
    setError('The recording didn’t upload. It’s kept here — retry when you’re back online.');
    return null;
  }, []);

  const retryUpload = useCallback(async (): Promise<Recording | null> => {
    const f = failed.current;
    if (!f) return null;
    return upload(f.blob, f.dur, f.peaks);
  }, [upload]);

  const stop = useCallback(async (): Promise<Recording | null> => {
    const r = rec.current;
    if (!r) return null;
    setState('saving');
    const dur = Math.max(1, Math.round((performance.now() - started.current) / 1000));
    const blob: Blob = await new Promise((resolve) => {
      r.onstop = () => resolve(new Blob(chunks.current, { type: r.mimeType || mime.current.mime || 'audio/webm' }));
      r.stop();
    });
    cleanup();
    rec.current = null;
    const peaks = await computePeaks(blob);
    return upload(blob, dur, peaks);
  }, [cleanup, upload]);

  return { state, seconds, level, error, start, stop, hasFailed, retryUpload, clearError: () => setError(null) };
}

/** Resolve a storage path to a playable/viewable URL. */
export function useMediaUrl(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    setUrl(null); setFailed(false);
    if (!path) return;
    getBackend().mediaUrl(path)
      .then((u) => { if (alive) setUrl(u); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [path]);
  return { url, failed };
}

const MAX_IMAGE = 20 * 1024 * 1024;

/** Validate and upload an image file from an <input type="file">. */
export async function uploadImage(file: File | undefined | null): Promise<{ path: string } | { error: string }> {
  if (!file) return { error: '' };
  if (!/^image\//.test(file.type)) return { error: 'That file isn’t an image.' };
  if (file.size > MAX_IMAGE) return { error: 'That image is over 20 MB.' };
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  try {
    return { path: await getBackend().uploadMedia(file, ext) };
  } catch {
    return { error: 'The image didn’t upload. Try again.' };
  }
}
