export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const pad2 = (n: number) => (n < 10 ? '0' : '') + n;

export function fmt(sec: number): string {
  const s = Math.max(0, Math.round(sec || 0));
  return Math.floor(s / 60) + ':' + pad2(s % 60);
}

export function uid(prefix = ''): string {
  const rand = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
    : Math.random().toString(36).slice(2, 14);
  return prefix + rand;
}

export function plural(n: number, one: string, many: string) {
  return n + ' ' + (n === 1 ? one : many);
}

export function monthId(d: Date): string {
  return pad2(d.getMonth() + 1) + '.' + String(d.getFullYear()).slice(2);
}

export function monthFromId(id: string): { name: string; year: string; days: number } {
  const [mm, yy] = id.split('.').map(Number);
  const year = 2000 + yy;
  return { name: MONTHS[mm - 1] ?? id, year: String(year), days: new Date(year, mm, 0).getDate() };
}

/** Sort key so months order newest first: '10.26' -> '2610'. */
export const monthSortKey = (id: string) => id.slice(3) + id.slice(0, 2);

export function today() {
  const d = new Date();
  return {
    date: d,
    id: monthId(d),
    day: d.getDate(),
    wd: DAYS[d.getDay()],
    wdLong: DAYS_LONG[d.getDay()],
    monthName: MONTHS[d.getMonth()],
    long: `${DAYS_LONG[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`,
  };
}

export function prevMonthId(d: Date): string {
  return monthId(new Date(d.getFullYear(), d.getMonth() - 1, 1));
}

export function weekRange(d: Date): string {
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 6);
  return `${MONTHS_SHORT[a.getMonth()]} ${a.getDate()} – ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}
