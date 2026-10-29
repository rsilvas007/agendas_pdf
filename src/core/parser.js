// Leitor de datas em português.
// Este arquivo é a única fonte do leitor: o app web importa daqui e a versão
// Apps Script recebe uma cópia embutida (ver src/gasTemplate.ts). Por isso ele
// é JavaScript puro, sem dependências e sem sintaxe de TypeScript.

export const MONTHS_PT = {
  janeiro: 1, jan: 1,
  fevereiro: 2, fev: 2,
  'março': 3, marco: 3, mar: 3,
  abril: 4, abr: 4,
  maio: 5, mai: 5,
  junho: 6, jun: 6,
  julho: 7, jul: 7,
  agosto: 8, ago: 8,
  setembro: 9, set: 9,
  outubro: 10, out: 10,
  novembro: 11, nov: 11,
  dezembro: 12, dez: 12,
};

const MONTH_RX = 'janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez';
// Limites de palavra que entendem acentos (\b do JavaScript não entende "à" ou "ç").
const B0 = '(?<![\\p{L}\\d])';
const B1 = '(?![\\p{L}\\d])';
const ORD = '(?:º|°)?';
const HOUR = '([01]?\\d|2[0-3])';
// Horário com marcador: 14h, 14h30, 14 h, 14hs, 14:00, 14:00h, 14h30min
const TM = HOUR + '(?:\\s?(?:horas?|hrs?|hs|h)(?:\\s?([0-5]\\d)(?:\\s?min)?)?|:([0-5]\\d)(?:\\s?h)?)(?![\\p{L}\\d])';
const GAP = '\u00A6';
const STOP = 'de|do|da|dos|das|dia|dias|às|as|à|a|ao|até|ate|e|em|no|na|nos|nas|entre|partir|para|o|os|horário|horario|data';

export function pad2(n) {
  return (n < 10 ? '0' : '') + n;
}

export function isValidDate(y, m, d) {
  if (!y || m < 1 || m > 12 || d < 1) return false;
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return d <= days[m - 1];
}

// Data sem ano: usa o ano atual; se já passou há mais de 60 dias, usa o próximo.
export function resolveYear(month, day, ref) {
  const now = ref || new Date();
  const year = now.getFullYear();
  const diff = (now.getTime() - new Date(year, month - 1, day).getTime()) / 864e5;
  return diff > 60 ? year + 1 : year;
}

function toYear(y) {
  return y < 100 ? 2000 + y : y;
}

function iso(y, m, d) {
  return y + '-' + pad2(m) + '-' + pad2(d);
}

function dayDiff(a, b) {
  const pa = a.split('-').map(Number);
  const pb = b.split('-').map(Number);
  return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 864e5);
}

export function toMinutes(hm) {
  if (!hm) return -1;
  const p = hm.split(':').map(Number);
  return p[0] * 60 + p[1];
}

function fromMinutes(min) {
  return pad2(Math.floor(min / 60)) + ':' + pad2(min % 60);
}

// Soma 1 hora sem passar da meia-noite (23:30 vira 23:59).
export function addOneHour(hm) {
  return fromMinutes(Math.min(toMinutes(hm) + 60, 23 * 60 + 59));
}

// Garante um horário de fim depois do início.
export function safeEnd(start, end) {
  if (!start) return '';
  if (!end || toMinutes(end) <= toMinutes(start)) return addOneHour(start);
  return end;
}

// Fim real de um compromisso com horário. Se o fim não vem depois do início,
// soma 1 hora de verdade, mesmo que isso passe para o dia seguinte.
export function eventEnd(date, endDate, start, end) {
  const lastDay = endDate || date;
  if (end && (lastDay !== date || toMinutes(end) > toMinutes(start))) return { date: lastDay, time: end };
  const p = lastDay.split('-').map(Number);
  const t = new Date(Date.UTC(p[0], p[1] - 1, p[2], 0, toMinutes(start) + 60));
  return {
    date: t.getUTCFullYear() + '-' + pad2(t.getUTCMonth() + 1) + '-' + pad2(t.getUTCDate()),
    time: pad2(t.getUTCHours()) + ':' + pad2(t.getUTCMinutes()),
  };
}

// Dia seguinte (o Google usa fim exclusivo em eventos de dia inteiro).
export function nextDay(date) {
  const p = date.split('-').map(Number);
  const t = new Date(Date.UTC(p[0], p[1] - 1, p[2] + 1));
  return t.getUTCFullYear() + '-' + pad2(t.getUTCMonth() + 1) + '-' + pad2(t.getUTCDate());
}

function overlaps(list, start, end) {
  return list.some(function (s) { return start < s.end && end > s.start; });
}

const PAGE_BEFORE = /(?:p[áa]g(?:ina)?s?\.?|pg\.?|fls?\.?|folhas?|n[º°o]\.?|item|art\.?|cap\.?|vol\.?|turma|sala|R\$)\s*$/iu;

// Datas "âncora": datas completas por si só.
function findAnchors(line, ref) {
  const out = [];
  let m;
  function add(match, y, mo, d) {
    const start = match.index;
    const end = start + match[0].length;
    if (!isValidDate(y, mo, d) || overlaps(out, start, end)) return;
    out.push({ start: start, end: end, y: y, mo: mo, d: d, explicitYear: true });
  }
  const isoRx = new RegExp(B0 + '(\\d{4})[-/.](\\d{1,2})[-/.](\\d{1,2})' + B1, 'gu');
  while ((m = isoRx.exec(line))) add(m, +m[1], +m[2], +m[3]);

  const fullRx = new RegExp(B0 + '(\\d{1,2})([/.-])(\\d{1,2})\\2(\\d{4}|\\d{2})' + B1, 'gu');
  while ((m = fullRx.exec(line))) add(m, toYear(+m[4]), +m[3], +m[1]);

  const shortRx = new RegExp(B0 + '(\\d{1,2})/(\\d{1,2})(?![\\p{L}\\d/])', 'gu');
  while ((m = shortRx.exec(line))) {
    if (PAGE_BEFORE.test(line.slice(0, m.index))) continue;
    const d = +m[1];
    const mo = +m[2];
    const before = out.length;
    add(m, resolveYear(mo, d, ref), mo, d);
    if (out.length > before) out[out.length - 1].explicitYear = false;
  }

  const writtenRx = new RegExp(
    B0 + '(\\d{1,2})' + ORD + '\\s*(?:de\\s+)?(' + MONTH_RX + ')\\.?(?:\\s*(?:de\\s+|/\\s*)?(\\d{4}))?' + B1,
    'giu'
  );
  while ((m = writtenRx.exec(line))) {
    const mo = MONTHS_PT[m[2].toLowerCase()];
    const d = +m[1];
    const before = out.length;
    add(m, m[3] ? +m[3] : resolveYear(mo, d, ref), mo, d);
    if (out.length > before && !m[3]) out[out.length - 1].explicitYear = false;
  }
  return out.sort(function (a, b) { return a.start - b.start; });
}

// "20 e 21/11", "20, 21 e 22 de novembro" (lista) ou "3 a 7 de novembro" (período)
const PREFIX_RX = new RegExp(
  '(?:^|[^\\p{L}\\d/:,.])(\\d{1,2})' + ORD + '((?:\\s*,\\s*\\d{1,2}' + ORD + ')*)(\\s+e\\s+|\\s*,\\s*|\\s+(?:a|até|ate)\\s+|[-–—])(?:dia\\s+)?$',
  'iu'
);
const BETWEEN_RANGE_RX = /^\s*(?:a|até|ate|-|–|—)\s*(?:o\s+dia\s+|dia\s+)?$/iu;

// Encontra todas as datas de uma linha. Cada item vira um compromisso:
// { start, end, dates: ['2026-11-20'], endDate: '' } ou um período com endDate.
export function extractDateItems(line, ref) {
  const anchors = findAnchors(line, ref);
  const items = [];
  let lastEnd = 0;
  anchors.forEach(function (a) {
    const anchorIso = iso(a.y, a.mo, a.d);
    let item = { start: a.start, end: a.end, dates: [anchorIso], endDate: '', anchor: a };
    const prefix = line.slice(lastEnd, a.start);
    const pm = prefix.match(PREFIX_RX);
    if (pm && !PAGE_BEFORE.test(prefix.slice(0, pm.index + pm[0].indexOf(pm[1])))) {
      const days = [+pm[1]].concat((pm[2].match(/\d{1,2}/g) || []).map(Number));
      const conj = pm[3].trim().toLowerCase();
      const isRange = /^(a|até|ate|-|–|—)$/.test(conj);
      const valid = days.every(function (d) { return d < a.d && isValidDate(a.y, a.mo, d); });
      if (valid && isRange && days.length === 1) {
        item = {
          start: lastEnd + pm.index + pm[0].indexOf(pm[1]),
          end: a.end,
          dates: [iso(a.y, a.mo, days[0])],
          endDate: anchorIso,
          anchor: a,
        };
      } else if (valid && !isRange) {
        item = {
          start: lastEnd + pm.index + pm[0].indexOf(pm[1]),
          end: a.end,
          dates: days.map(function (d) { return iso(a.y, a.mo, d); }).concat([anchorIso]),
          endDate: '',
          anchor: a,
        };
      }
    }
    // Período entre duas datas completas: "05/11 a 07/11", "28/12 até 03/01/2027"
    const prev = items[items.length - 1];
    if (prev && !prev.endDate && prev.dates.length === 1 && BETWEEN_RANGE_RX.test(line.slice(prev.end, a.start))) {
      let first = prev.dates[0];
      if (!prev.anchor.explicitYear && a.explicitYear && dayDiff(first, anchorIso) < 0) {
        first = iso(prev.anchor.y - 1, prev.anchor.mo, prev.anchor.d);
      }
      const span = dayDiff(first, anchorIso);
      if (span > 0 && span <= 62) {
        prev.end = a.end;
        prev.dates = [first];
        prev.endDate = anchorIso;
        lastEnd = a.end;
        return;
      }
    }
    items.push(item);
    lastEnd = item.end;
  });
  return items.map(function (it) {
    return { start: it.start, end: it.end, raw: line.slice(it.start, it.end), dates: it.dates, endDate: it.endDate };
  });
}

function blank(line, spans) {
  let out = line;
  spans.forEach(function (s) {
    out = out.slice(0, s.start) + ' '.repeat(s.end - s.start) + out.slice(s.end);
  });
  return out;
}

function hm(h, m1, m2) {
  return pad2(+h) + ':' + pad2(m1 ? +m1 : m2 ? +m2 : 0);
}

// Encontra horários. Números sem "h" ou ":" só contam depois de "às", "das" ou "entre".
export function extractTimes(line, dateSpans) {
  const text = blank(line, dateSpans || []);
  const found = [];
  let m;
  function push(match, start, end) {
    const s = match.index;
    const e = s + match[0].length;
    if (overlaps(found, s, e)) return;
    found.push({ start: s, end: e, raw: match[0], startTime: start, endTime: end });
  }
  const sep = '\\s*(?:às|as|a|até|ate|e|-|–|—)\\s*';
  const rxMarked = new RegExp(B0 + '(?:(?:das|de|entre)\\s+)?' + TM + sep + TM, 'giu');
  while ((m = rxMarked.exec(text))) push(m, hm(m[1], m[2], m[3]), hm(m[4], m[5], m[6]));

  const rxBareFirst = new RegExp(B0 + '(?:(?:das|de|entre)\\s+' + HOUR + '\\s*(?:às|as|a|até|ate|e)|' + HOUR + '\\s+(?:às|até|ate))\\s*' + TM, 'giu');
  while ((m = rxBareFirst.exec(text))) push(m, hm(m[1] || m[2], 0, 0), hm(m[3], m[4], m[5]));

  const rxSingle = new RegExp(B0 + '(?:(?:a partir das?|a partir de|às|as|à|das?|de)\\s+)?' + TM, 'giu');
  while ((m = rxSingle.exec(text))) push(m, hm(m[1], m[2], m[3]), '');

  const rxBare = new RegExp(B0 + '(?:às|a partir das)\\s+' + HOUR + '(?![\\p{L}\\d:/.,])', 'giu');
  while ((m = rxBare.exec(text))) push(m, hm(m[1], 0, 0), '');

  found.sort(function (a, b) { return a.start - b.start; });
  found.forEach(function (t) { t.endTime = safeEnd(t.startTime, t.endTime); });
  return found;
}

const LOCATION_RX = /(?:^|[\s,;(–—-])(local|onde|endere[çc]o)\s*:\s*([^|;\n–—]+)/iu;

export function extractLocation(line) {
  const m = line.match(LOCATION_RX);
  if (!m) return { location: '', span: null };
  const start = m.index + m[0].indexOf(m[1]);
  return {
    location: m[2].trim().replace(/[\s,.;:)]+$/u, ''),
    span: { start: start, end: m.index + m[0].length },
  };
}

const WEEKDAY_RX = new RegExp(
  B0 + '(?:(?:segunda|terça|terca|quarta|quinta|sexta)(?:-feira|\\s+feira)?|sábado|sabado|domingo)' + B1 +
  '|' + B0 + '(?:seg|ter|qua|qui|sex|sáb|sab|dom)\\.?(?=\\s*[)\\]])',
  'giu'
);
const STOP_BEFORE_GAP = new RegExp('(?:^|\\s)(?:' + STOP + ')\\s*(?=' + GAP + ')', 'giu');
const STOP_AFTER_GAP = new RegExp('(' + GAP + ')\\s*(?:' + STOP + ')(?=\\s|$|' + GAP + ')', 'giu');
const STOP_AT_END = new RegExp('\\s(?:' + STOP + ')$', 'iu');

// Monta o título: tira datas, horários, local e dias da semana, e limpa as
// conexões que ficaram soltas só nas bordas desses trechos ("Conselho de
// classe" mantém o "de").
export function cleanTitle(line, spans) {
  let t = line;
  spans.slice().sort(function (a, b) { return b.start - a.start; }).forEach(function (s) {
    t = t.slice(0, s.start) + ' ' + GAP + ' ' + t.slice(s.end);
  });
  t = t.replace(WEEKDAY_RX, ' ' + GAP + ' ');
  for (let i = 0; i < 4; i++) {
    t = t.replace(STOP_BEFORE_GAP, ' ').replace(STOP_AFTER_GAP, '$1 ');
    t = t.replace(new RegExp('\\s*,?\\s*' + GAP + '(?:[\\s,]*' + GAP + ')*', 'gu'), ' ' + GAP + ' ');
  }
  t = t.split(GAP).join(' ');
  t = t.replace(/[([{]\s*[)\]}]/gu, ' ');
  t = t.replace(/\s*([,;:–—-])(?:\s*[,;:–—-])+/gu, '$1');
  t = t.replace(/\s+([,;:.])/gu, '$1').replace(/\s+/gu, ' ').trim();
  let prev;
  do {
    prev = t;
    t = t.replace(/^[\s,;:.•·|–—-]+/u, '').replace(/[\s,;:•·|–—-]+$/u, '').replace(STOP_AT_END, '').trim();
  } while (t !== prev);
  return t;
}

function letters(s) {
  return (s.match(/\p{L}/gu) || []).length;
}

// Trechos para destacar no texto lido (datas e horários).
export function findHighlights(line, ref) {
  const dates = extractDateItems(line, ref);
  const times = extractTimes(line, dates);
  return dates.map(function (d) { return { start: d.start, end: d.end, kind: 'date' }; })
    .concat(times.map(function (t) { return { start: t.start, end: t.end, kind: 'time' }; }))
    .sort(function (a, b) { return a.start - b.start; });
}

let seq = 0;

// Lê o texto inteiro e devolve a lista de compromissos.
export function parseEvents(text, ref) {
  const lines = String(text || '').split(/\r?\n/).map(function (l) { return l.replace(/\s+/g, ' ').trim(); });
  const events = [];
  let lastPlain = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const loc = extractLocation(line);
    const masked = loc.span ? blank(line, [loc.span]) : line;
    const items = extractDateItems(masked, ref);
    if (!items.length) {
      if (!loc.span && letters(line) >= 3) lastPlain = line;
      continue;
    }
    const times = extractTimes(masked, items);
    let location = loc.location;
    if (!location && lines[i + 1]) {
      const next = extractLocation(lines[i + 1]);
      if (next.span && next.span.start <= 1) location = next.location;
    }
    const spans = items.concat(times).concat(loc.span ? [loc.span] : []);
    let title = cleanTitle(line, spans);
    if (letters(title) < 2) title = lastPlain ? cleanTitle(lastPlain, []) : 'Compromisso';
    const time = times[0];
    items.forEach(function (it) {
      it.dates.forEach(function (date) {
        seq += 1;
        events.push({
          id: 'ev-' + seq + '-' + Math.random().toString(36).slice(2, 7),
          selected: true,
          title: title,
          date: date,
          endDate: it.endDate,
          startTime: time ? time.startTime : '',
          endTime: time ? time.endTime : '',
          isAllDay: !time,
          location: location,
          originalLine: line,
          matchedDate: it.raw,
          matchedTime: time ? time.raw : '',
        });
      });
    });
  }
  return events;
}

export const SAMPLE_TEXT = [
  'CRONOGRAMA DE ATIVIDADES — 2º SEMESTRE (exemplo)',
  'Reunião pedagógica: 05/11/2026 às 14h – Local: Sala 12',
  'Entrega do projeto final 18 de novembro de 2026',
  'Prova prática de Power BI — 24/11 das 8h às 11h30',
  'Conselho de classe, quinta-feira, 3 de dezembro, 16:00 - 18:00',
  'Encerramento do semestre 2026-12-11',
].join('\n');
