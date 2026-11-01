'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { today } from '@/lib/util';

/** "day N": open this month with today's block ready to write in. */
export default function TodayPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/m/${today().id}?today=1`);
  }, [router]);
  return null;
}
