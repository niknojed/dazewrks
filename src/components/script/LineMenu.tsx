'use client';

import { Sheet } from '@/components/ui';
import { GROUP_LABEL, groupOptions, isCurrent, menuOptions, type OptionGroup } from '@/lib/screenplay';
import { cx } from '@/lib/util';

/** Changer (modal) or slash menu (non-modal; focus stays in the line). */
export function LineMenu({ text, slash, onPick, onClose }: {
  text: string; slash: boolean; onPick(group: OptionGroup, value: string): void; onClose(): void;
}) {
  const opts = menuOptions(text, slash);
  if (!opts.length) return null;
  const groups = groupOptions(opts);
  return (
    <Sheet open onClose={onClose} modal={!slash} label="Change">
      {groups.map((g) => (
        <div key={g.group}>
          <p className="px-3 pb-1 pt-3 text-xs font-medium text-muted">{GROUP_LABEL[g.group]}</p>
          <div className="flex flex-wrap gap-1.5 px-2 py-1.5">
            {g.options.map((o) => {
              const on = !slash && isCurrent(text, o.group, o.value);
              return (
                <button key={o.group + o.value} type="button" aria-pressed={on}
                  onMouseDown={slash ? (e) => e.preventDefault() : undefined}
                  onClick={() => onPick(o.group, o.value)}
                  className={cx('min-h-10 rounded-full px-3.5 font-mono text-[13px] leading-none', on ? 'bg-ink text-invert' : 'bg-surface text-ink hover:bg-surface2')}>
                  {o.value}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </Sheet>
  );
}
