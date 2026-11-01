'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { patchDoc, useApp } from '@/lib/store';
import type { MonthDoc } from '@/lib/types';
import { today, uid, weekRange } from '@/lib/util';
import { AutoTextarea, Icon, IconButton } from '@/components/ui';

const PROMPTS = ['What moved this week?', 'What kept coming back?', 'What do you want to carry into next week?'];

export default function ReflectPage() {
  return <Suspense><Reflect /></Suspense>;
}

function Reflect() {
  const router = useRouter();
  const search = useSearchParams();
  const { say, updateSettings, bumpMonths } = useApp();
  const [answers, setAnswers] = useState(['', '', '']);
  const [saving, setSaving] = useState(false);
  const t = today();
  const can = answers.some((a) => a.trim()) && !saving;

  const save = async () => {
    if (!can) return;
    setSaving(true);
    const body = PROMPTS.map((q, i) => (answers[i].trim() ? `${q}\n${answers[i].trim()}` : '')).filter(Boolean).join('\n\n');
    try {
      await patchDoc<MonthDoc>('month', t.id, () => ({ blocks: [] }), (d) => ({
        blocks: [{ id: uid('r'), kind: 'reflection', day: t.day, wd: t.wd, title: `${t.wdLong} reflection`, body }, ...d.blocks],
      }), t.id);
      const key = search.get('e');
      if (key) updateSettings((s) => ({ ...s, eventsDone: { ...s.eventsDone, [key]: true } }));
      bumpMonths();
      say(`Saved to ${t.id}`);
      router.push(`/m/${t.id}`);
    } catch {
      say('Didn’t save. Your answers are still here.');
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-6 px-6 pb-36 pt-3 md:gap-7 md:px-[6%] md:pt-16">
      <IconButton label="Notebook" onClick={() => router.push('/')} className="-ml-3 md:hidden"><Icon.Back /></IconButton>
      <header className="flex flex-col gap-2">
        <p className="text-[13px] font-medium text-muted">{weekRange(t.date)}</p>
        <h1 className="text-[34px] font-semibold leading-none tracking-[-0.03em] md:text-[44px]">{t.wdLong}</h1>
      </header>
      {PROMPTS.map((q, i) => (
        <section key={q} className="flex flex-col gap-2.5 pt-2">
          <label htmlFor={`rf-${i}`} className="font-serif text-[22px] font-medium leading-snug md:text-[26px]">{q}</label>
          <AutoTextarea id={`rf-${i}`} value={answers[i]}
            onChange={(e) => { const v = e.target.value; setAnswers((a) => a.map((x, j) => (j === i ? v : x))); }}
            className="min-h-14 font-serif text-lg leading-relaxed text-ink2 md:text-xl" />
        </section>
      ))}
      <button type="button" onClick={save} disabled={!can}
        className="h-12 self-start rounded-full bg-ink px-6 text-[15px] font-semibold text-invert disabled:opacity-30">
        {saving ? 'Saving…' : `Save to ${t.id}`}
      </button>
    </div>
  );
}
