'use client';

import { memo, useCallback } from 'react';
import { AutoTextarea, Icon, type AutoTextareaHandle } from '@/components/ui';
import { LINE_LABEL, LINE_STYLE, type LineType } from '@/lib/screenplay';

export interface LineHandlers {
  change(id: string, value: string): void;
  keyDown(id: string, e: React.KeyboardEvent<HTMLTextAreaElement>): void;
  openChanger(id: string): void;
  register(id: string, h: AutoTextareaHandle | null): void;
}

const CHANGER_LABEL: Partial<Record<LineType, string>> = {
  scene: 'Change scene heading',
  shot: 'Change shot',
  transition: 'Change transition',
};

export const ScriptLine = memo(function ScriptLine({ id, text, type, index, handlers }: {
  id: string; text: string; type: LineType; index: number; handlers: LineHandlers;
}) {
  const ref = useCallback((h: AutoTextareaHandle | null) => handlers.register(id, h), [handlers, id]);
  const changer = CHANGER_LABEL[type];
  return (
    <div className="relative">
      {changer && (
        <button type="button" aria-label={changer} onClick={() => handlers.openChanger(id)}
          className="absolute -left-10 -top-[7px] inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-muted hover:bg-surface hover:text-ink md:-top-1.5">
          <Icon.Chevrons />
        </button>
      )}
      <AutoTextarea
        ref={ref}
        value={text}
        data-line={id}
        aria-label={`Line ${index + 1}${type !== 'blank' ? ', ' + LINE_LABEL[type] : ''}`}
        spellCheck={type === 'action' || type === 'dialogue'}
        onChange={(e) => handlers.change(id, e.target.value)}
        onKeyDown={(e) => handlers.keyDown(id, e)}
        className="scroll-mt-24"
        style={LINE_STYLE[type]}
      />
    </div>
  );
});
