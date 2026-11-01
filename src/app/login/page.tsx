'use client';

import { useState } from 'react';
import { getSupabase, supabaseConfigured } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseConfigured()) { window.location.href = '/'; return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setState('error'); setMessage('Enter a valid email.'); return; }
    setState('sending');
    const { error } = await getSupabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setState('error'); setMessage(error.message); return; }
    setState('sent');
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col justify-center gap-8 px-6">
      <h1 className="text-[40px] font-semibold leading-none tracking-[-0.03em]">Notebook</h1>
      {state === 'sent' ? (
        <p className="font-serif text-xl leading-relaxed text-ink2">Check {email} for a sign-in link.</p>
      ) : (
        <form onSubmit={send} className="flex flex-col gap-4" noValidate>
          <label htmlFor="email" className="text-[13px] font-medium text-muted">Email</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-xl bg-surface px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-accent" />
          {state === 'error' && <p role="alert" className="text-sm text-danger">{message}</p>}
          <button type="submit" disabled={state === 'sending'}
            className="h-12 rounded-full bg-ink text-[15px] font-semibold text-invert disabled:opacity-50">
            {state === 'sending' ? 'Sending…' : 'Send sign-in link'}
          </button>
        </form>
      )}
    </main>
  );
}
