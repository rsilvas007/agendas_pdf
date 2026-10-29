const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function parts(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return { y, m, d, wd: new Date(y, m - 1, d).getDay() };
}

export function dayMonth(date: string) {
  if (!date) return 'sem data';
  const { m, d } = parts(date);
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]}`;
}

export function weekday(date: string) {
  return date ? WEEKDAYS[parts(date).wd] : '';
}

export function yearOf(date: string) {
  return date ? parts(date).y : 0;
}

export function longDay(date: string) {
  const { m, d, wd } = parts(date);
  return `${WEEKDAYS[wd]}, ${d} ${MONTHS[m - 1]}`;
}

export function timeRange(start: string, end: string) {
  if (!start) return 'dia inteiro';
  return end ? `${start}–${end}` : start;
}

export function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function agoText(ts: number | null, now: number) {
  if (!ts) return '';
  const s = Math.round((now - ts) / 1000);
  if (s < 15) return 'atualizada agora';
  if (s < 60) return `atualizada há ${s} s`;
  const m = Math.round(s / 60);
  return `atualizada há ${m} min`;
}

export const TIME_ZONES = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Cuiaba',
  'America/Belem',
  'America/Fortaleza',
  'America/Recife',
  'America/Bahia',
  'America/Rio_Branco',
  'America/Noronha',
  'Europe/Lisbon',
];

export function defaultTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
  } catch {
    return 'America/Sao_Paulo';
  }
}
