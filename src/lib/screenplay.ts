import type { CSSProperties } from 'react';
import type { Line } from './types';

/** Fountain-style screenplay helpers. Pure functions only. */

export type LineType = 'blank' | 'action' | 'scene' | 'shot' | 'character' | 'paren' | 'dialogue' | 'transition' | 'slash';
export type OptionGroup = 'transition' | 'shot' | 'scene';
export type ChangeableKind = OptionGroup;

export interface LineOption { group: OptionGroup; value: string }

export const TRANSITIONS = ['CUT TO:', 'SMASH CUT TO:', 'MATCH CUT TO:', 'JUMP CUT TO:', 'DISSOLVE TO:', 'FADE IN:', 'FADE OUT.', 'FADE TO BLACK.', 'INTERCUT WITH:'] as const;
export const SHOTS = ['CLOSE ON', 'ANGLE ON', 'WIDE SHOT', 'POV', 'INSERT', 'PAN TO', 'TRACKING SHOT', 'PUSH IN', 'PULL BACK', 'OVERHEAD', 'AERIAL SHOT', 'SLOW MOTION', 'MONTAGE', 'BACK TO SCENE'] as const;
export const SCENES = ['INT.', 'EXT.', 'INT./EXT.'] as const;

export const GROUPS: Record<OptionGroup, readonly string[]> = { transition: TRANSITIONS, shot: SHOTS, scene: SCENES };
export const GROUP_LABEL: Record<OptionGroup, string> = { transition: 'Transitions', shot: 'Shots', scene: 'Scene' };

const SCENE_DETECT = /^(int|ext|est|int\.?\/ext|i\/e)[.\s]/i;
export const SCENE_RE = /^(INT\.\/EXT\.|I\/E\.?|INT\.|EXT\.|EST\.)\s*/i;
export const SHOT_RE = /^(CLOSE ON|CLOSE UP|ANGLE ON|WIDE SHOT|WIDE ON|POV|INSERT|PAN TO|TRACKING SHOT|PUSH IN|PULL BACK|OVERHEAD|AERIAL SHOT|SLOW MOTION|MONTAGE|SERIES OF SHOTS|BACK TO SCENE|TILT UP|TILT DOWN|PAN)\b/i;
export const TRANS_RE = /^([A-Z0-9 .\-']+TO:|FADE IN:|FADE OUT\.|FADE TO BLACK\.|INTERCUT WITH:)$/;

/** Approximate characters per printed line, by element. */
export const CPL: Record<LineType, number> = { action: 60, scene: 60, shot: 60, transition: 60, slash: 60, blank: 60, character: 38, paren: 26, dialogue: 35 };
export const LINES_PER_PAGE = 55;

/**
 * Inline styles per element. Inline because `.bare` is unlayered CSS and would
 * override Tailwind padding utilities.
 */
export const LINE_STYLE: Record<LineType, CSSProperties> = {
  blank: {},
  action: {},
  scene: { fontWeight: 700, textTransform: 'uppercase' },
  shot: { textTransform: 'uppercase', letterSpacing: '0.02em' },
  character: { paddingLeft: '37%', textTransform: 'uppercase' },
  paren: { paddingLeft: '28%' },
  dialogue: { paddingLeft: '17%', paddingRight: '15%' },
  transition: { textAlign: 'right', textTransform: 'uppercase' },
  slash: { color: 'var(--muted)' },
};

export const LINE_LABEL: Record<LineType, string> = {
  blank: '', action: 'action', scene: 'scene heading', shot: 'shot', character: 'character',
  paren: 'parenthetical', dialogue: 'dialogue', transition: 'transition', slash: 'command',
};

export function isShot(t: string): boolean {
  const m = t.match(SHOT_RE);
  return !!m && m[0] === m[0].toUpperCase();
}

/** Kind of a single line on its own, for the changer. */
export function lineKind(text: string): ChangeableKind | null {
  const t = text.trim();
  if (SCENE_DETECT.test(t)) return 'scene';
  if (TRANS_RE.test(t)) return 'transition';
  if (isShot(t)) return 'shot';
  return null;
}

export function isCurrent(text: string, group: OptionGroup, value: string): boolean {
  const t = text.trim();
  if (group === 'transition') return t === value;
  if (group === 'shot') { const m = t.match(SHOT_RE); return !!m && m[0].toUpperCase() === value; }
  const s = t.match(SCENE_RE);
  return !!s && s[1].toUpperCase() === value;
}

/** Format follows what you type; context (previous line) decides character/dialogue. */
export function lineTypes(lines: readonly Line[]): LineType[] {
  const out: LineType[] = [];
  let prev: LineType = 'blank';
  for (const line of lines) {
    const t = line.text.trim();
    const dlg = prev === 'character' || prev === 'paren' || prev === 'dialogue';
    let ty: LineType;
    if (!t) ty = 'blank';
    else if (t.charAt(0) === '/') ty = 'slash';
    else if (SCENE_DETECT.test(t)) ty = 'scene';
    else if (TRANS_RE.test(t)) ty = 'transition';
    else if (dlg && t.startsWith('(')) ty = 'paren';
    else if (dlg) ty = 'dialogue';
    else if (isShot(t)) ty = 'shot';
    else if (prev === 'blank' && /[A-Z]/.test(t) && t === t.toUpperCase() && t.length <= 32) ty = 'character';
    else ty = 'action';
    out.push(ty);
    prev = ty;
  }
  return out;
}

export interface Pagination { pageOf: number[]; total: number }

/** Standard screenplay page: about 55 printed lines. */
export function paginate(lines: readonly Line[], types: readonly LineType[]): Pagination {
  const pageOf: number[] = [];
  let page = 0;
  let used = 0;
  for (let i = 0; i < lines.length; i++) {
    const n = Math.max(1, Math.ceil(lines[i].text.length / (CPL[types[i]] ?? 60)));
    if (used + n > LINES_PER_PAGE && used > 0) { page++; used = 0; }
    pageOf.push(page);
    used += n;
  }
  return { pageOf, total: page + 1 };
}

/** Options for the changer (current kind's group first) or the slash menu (filtered by query). */
export function menuOptions(text: string, slash: boolean): LineOption[] {
  const t = text.trim();
  const kind = lineKind(t);
  const q = slash ? t.slice(1).trim().toUpperCase() : '';
  const order: OptionGroup[] = slash ? ['shot', 'transition', 'scene']
    : kind === 'shot' ? ['shot', 'transition', 'scene']
    : kind === 'scene' ? ['scene', 'shot', 'transition']
    : ['transition', 'shot', 'scene'];
  const out: LineOption[] = [];
  for (const g of order) for (const v of GROUPS[g]) if (!q || v.includes(q)) out.push({ group: g, value: v });
  return out;
}

/** Replace the line's keyword with the chosen one, keeping the rest of the line. */
export function applyLineOption(text: string, group: OptionGroup, value: string): string {
  const t = text.trim();
  let rest = '';
  if (t.charAt(0) !== '/') {
    const scene = t.match(SCENE_RE);
    const shot = t.match(SHOT_RE);
    if (scene) rest = t.slice(scene[0].length);
    else if (shot && isShot(t)) rest = t.slice(shot[0].length);
    else if (!TRANS_RE.test(t)) rest = t;
  }
  rest = rest.replace(/^[\s—\-:]+/, '');
  if (group === 'transition') return value;
  if (group === 'shot') return rest ? `${value} — ${rest}` : `${value} — `;
  return `${value} ${rest}`;
}

export function groupOptions(opts: readonly LineOption[]): { group: OptionGroup; options: LineOption[] }[] {
  const out: { group: OptionGroup; options: LineOption[] }[] = [];
  for (const o of opts) {
    const g = out.find((x) => x.group === o.group);
    if (g) g.options.push(o); else out.push({ group: o.group, options: [o] });
  }
  return out;
}
