'use client';

import { Suspense } from 'react';
import { BookEditor } from '@/components/book/BookEditor';

export default function BookPage() {
  return (
    <Suspense fallback={<div aria-busy="true" className="min-h-dvh" />}>
      <BookEditor />
    </Suspense>
  );
}
