'use client';

import { ScriptEditor } from '@/components/script/ScriptEditor';
import { useDoc } from '@/lib/store';
import type { ScriptDoc } from '@/lib/types';
import { uid } from '@/lib/util';

const init = (): ScriptDoc => ({ title: '', lines: [{ id: uid('l'), text: '' }], seeds: [] });
const titleOf = (d: ScriptDoc) => d.title || 'Untitled script';

export default function ScriptPage() {
  const { data, update, status } = useDoc<ScriptDoc>('script', 'main', init, titleOf);
  if (!data) return null;
  return <ScriptEditor doc={data} status={status} update={update} />;
}
