import { ParsedEvent } from './types';

// Portuguese months mapping
export const MONTHS_PT: Record<string, number> = {
  janeiro: 1,
  jan: 1,
  fevereiro: 2,
  fev: 2,
  março: 3,
  marco: 3,
  mar: 3,
  abril: 4,
  abr: 4,
  maio: 5,
  mai: 5,
  junho: 6,
  jun: 6,
  julho: 7,
  jul: 7,
  agosto: 8,
  ago: 8,
  setembro: 9,
  set: 9,
  outubro: 10,
  out: 10,
  novembro: 11,
  nov: 11,
  dezembro: 12,
  dez: 12,
};

export const WEEKDAYS_PT = [
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
  'domingo',
  'segunda',
  'terca',
  'terça',
  'quarta',
  'quinta',
  'sexta',
  'sabado',
  'domingo',
  'seg',
  'ter',
  'qua',
  'qui',
  'sex',
  'sab',
  'sáb',
  'dom',
];

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(month: number, year: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  if ([4, 6, 9, 11].includes(month)) {
    return 30;
  }
  return 31;
}

export function isValidDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > daysInMonth(month, year)) return false;
  return true;
}

export function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/**
 * Determine the appropriate year when only day and month are provided.
 * Rule: sem ano = ano atual; se já passou há mais de 60 dias, usar o próximo ano.
 */
export function resolveYear(
  month: number,
  day: number,
  refDate: Date = new Date()
): number {
  const currentYear = refDate.getFullYear();
  const testDate = new Date(currentYear, month - 1, day);
  const diffDays =
    (refDate.getTime() - testDate.getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays > 60) {
    return currentYear + 1;
  }
  return currentYear;
}

interface RawDateMatch {
  raw: string;
  year: number;
  month: number;
  day: number;
  index: number;
  length: number;
}

interface RawTimeMatch {
  raw: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  index: number;
  length: number;
}

/**
 * Find all dates in a line of text.
 */
export function extractDates(line: string, refDate: Date = new Date()): RawDateMatch[] {
  const matches: RawDateMatch[] = [];

  // 1. ISO format: 2026-11-05
  const isoRegex = /\b(\d{4})-(0[1-9]|1[0-2])-([0-2][0-9]|3[0-1])\b/g;
  let match: RegExpExecArray | null;
  while ((match = isoRegex.exec(line)) !== null) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    if (isValidDate(year, month, day)) {
      matches.push({
        raw: match[0],
        year,
        month,
        day,
        index: match.index,
        length: match[0].length,
      });
    }
  }

  // 2. Format: DD/MM/YYYY or DD.MM.YYYY, DD/MM/YY or DD.MM.YY, DD/MM or D/M
  // e.g. 05/11/2026, 05/11/26, 24/11, 5/11, 05.11.2026
  const numRegex = /\b([0-3]?\d)[\/\.]([0-1]?\d)(?:[\/\.](\d{2,4}))?\b/g;
  while ((match = numRegex.exec(line)) !== null) {
    // Avoid double counting if already inside an ISO match
    const idx = match.index;
    if (matches.some((m) => idx >= m.index && idx < m.index + m.length)) {
      continue;
    }

    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    let year = match[3] ? parseInt(match[3], 10) : null;

    if (year !== null) {
      if (year < 100) {
        year += 2000;
      }
    } else {
      year = resolveYear(month, day, refDate);
    }

    if (isValidDate(year, month, day)) {
      matches.push({
        raw: match[0],
        year,
        month,
        day,
        index: match.index,
        length: match[0].length,
      });
    }
  }

  // 3. Written dates in Portuguese:
  // e.g., "18 de novembro de 2026", "3 de dezembro", "5 nov", "1º de março", "1° de maio"
  const monthNames = Object.keys(MONTHS_PT).join('|');
  const writtenRegex = new RegExp(
    `\\b([0-3]?\\d)(?:[º°o])?\\s+(?:de\\s+)?(${monthNames})(?:\\s+(?:de\\s+)?(\\d{2,4}))?\\b`,
    'gi'
  );

  while ((match = writtenRegex.exec(line)) !== null) {
    const idx = match.index;
    if (matches.some((m) => idx >= m.index && idx < m.index + m.length)) {
      continue;
    }

    const day = parseInt(match[1], 10);
    const monthKey = match[2].toLowerCase();
    const month = MONTHS_PT[monthKey];
    let year = match[3] ? parseInt(match[3], 10) : null;

    if (year !== null) {
      if (year < 100) year += 2000;
    } else {
      year = resolveYear(month, day, refDate);
    }

    if (month && isValidDate(year, month, day)) {
      matches.push({
        raw: match[0],
        year,
        month,
        day,
        index: match.index,
        length: match[0].length,
      });
    }
  }

  // Sort by index in string
  return matches.sort((a, b) => a.index - b.index);
}

/**
 * Normalizes a time string like "14h", "14h30", "14:00", "8h" into "HH:mm".
 */
export function formatTime(hStr: string, mStr?: string): string {
  const h = parseInt(hStr, 10);
  const m = mStr !== undefined && mStr !== '' ? parseInt(mStr, 10) : 0;
  return `${pad2(h)}:${pad2(m)}`;
}

/**
 * Add 1 hour to a "HH:mm" time string.
 */
export function addOneHour(timeStr: string): string {
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
  const newH = (h + 1) % 24;
  return `${pad2(newH)}:${pad2(m)}`;
}

/**
 * Extract time intervals or single times:
 * e.g., "das 8h às 11h30", "16:00 - 18:00", "às 14h", "14h30", "14:00"
 */
export function extractTimes(line: string): RawTimeMatch[] {
  const matches: RawTimeMatch[] = [];

  // Pattern A: Interval with "das ... às ..." or "de ... até ..." or "... - ..."
  // Examples: "das 8h às 11h30", "16:00 - 18:00", "8h a 11h", "10:00 as 12:00"
  const intervalRegex =
    /(?:(?:das|de)\s+)?([0-2]?\d)(?:(?:h|:)([0-5]\d)?(?:h)?)?\s*(?:às|as|a|até|ate|-|—|–)\s*([0-2]?\d)(?:(?:h|:)([0-5]\d)?(?:h)?)?/gi;

  let match: RegExpExecArray | null;
  while ((match = intervalRegex.exec(line)) !== null) {
    const raw = match[0];
    const h1 = match[1];
    const m1 = match[2];
    const h2 = match[3];
    const m2 = match[4];

    // Must look like valid hours (0-23)
    const numH1 = parseInt(h1, 10);
    const numH2 = parseInt(h2, 10);
    if (numH1 >= 0 && numH1 <= 23 && numH2 >= 0 && numH2 <= 23) {
      // Double check this isn't a date like "24/11" or "16-18"
      if (!raw.includes('/') && !raw.includes('.')) {
        const startTime = formatTime(h1, m1);
        const endTime = formatTime(h2, m2);
        matches.push({
          raw,
          startTime,
          endTime,
          index: match.index,
          length: raw.length,
        });
      }
    }
  }

  // If no interval matched, check for single times:
  // e.g. "às 14h", "14h30", "14:00", "8h"
  if (matches.length === 0) {
    const singleRegex =
      /(?:(?:às|as|à|a)\s+)?\b([0-2]?\d)(?:h([0-5]\d)?|:([0-5]\d))\b|(?:(?:às|as)\s+)([0-2]?\d)h?\b/gi;
    while ((match = singleRegex.exec(line)) !== null) {
      const raw = match[0];
      const h = match[1] || match[5];
      const m = match[2] || match[3] || '00';
      if (h) {
        const numH = parseInt(h, 10);
        if (numH >= 0 && numH <= 23) {
          const startTime = formatTime(h, m);
          const endTime = addOneHour(startTime);
          matches.push({
            raw,
            startTime,
            endTime,
            index: match.index,
            length: raw.length,
          });
        }
      }
    }
  }

  return matches;
}

/**
 * Extract location from text:
 * Looks for "Local:", "Onde:", "Endereço:", "Endereco:"
 */
export function extractLocation(
  line: string,
  nextLine?: string
): { location: string; cleanedLine: string } {
  let location = '';
  let cleanedLine = line;

  const locRegex = /(?:Local|Onde|Endere[çc]o)\s*:\s*([^–—\n]+)/i;
  const match = line.match(locRegex);

  if (match) {
    location = match[1].trim();
    cleanedLine = line.replace(match[0], ' ');
  } else if (nextLine) {
    const nextMatch = nextLine.match(/^\s*(?:Local|Onde|Endere[çc]o)\s*:\s*(.+)$/i);
    if (nextMatch) {
      location = nextMatch[1].trim();
    }
  }

  return { location, cleanedLine };
}

/**
 * Clean a line to derive a pristine event title.
 * Removes dates, times, days of week, and orphan prepositions/punctuation.
 */
export function cleanTitle(
  line: string,
  dateRaws: string[],
  timeRaws: string[]
): string {
  let text = line;

  // Remove extracted dates
  dateRaws.forEach((d) => {
    text = text.split(d).join(' ');
  });

  // Remove extracted times
  timeRaws.forEach((t) => {
    text = text.split(t).join(' ');
  });

  // Remove weekday names
  WEEKDAYS_PT.forEach((w) => {
    const wRegex = new RegExp(`\\b${w}\\b`, 'gi');
    text = text.replace(wRegex, ' ');
  });

  // Remove common separators and noise words
  // e.g. "às", "das", "até", "de", "dia", "a", "em", "para"
  const preps = ['às', 'as', 'das', 'da', 'de', 'do', 'dos', 'até', 'ate', 'dia', 'no', 'na', 'em', 'onde', 'local'];
  preps.forEach((p) => {
    const pRegex = new RegExp(`\\b${p}\\b`, 'gi');
    text = text.replace(pRegex, ' ');
  });

  // Remove lingering punctuation: —, –, -, :, ,, ;, etc.
  text = text.replace(/[-—–:,;•·|]/g, ' ');

  // Collapse multiple spaces
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Main parser function:
 * Receives text (from PDF or input) and extracts all events.
 */
export function parseEventsFromText(text: string): ParsedEvent[] {
  const rawLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const events: ParsedEvent[] = [];
  let previousNonDateLine = '';

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const nextLine = i + 1 < rawLines.length ? rawLines[i + 1] : undefined;

    // 1. Check for location
    const { location, cleanedLine } = extractLocation(line, nextLine);

    // 2. Extract all dates
    const dates = extractDates(cleanedLine);

    if (dates.length === 0) {
      // Keep track of non-date line as title fallback
      previousNonDateLine = line;
      continue;
    }

    // 3. Extract times
    const times = extractTimes(cleanedLine);
    const timeMatch = times.length > 0 ? times[0] : null;

    // Collect all raw matched strings to strip them from title
    const dateRaws = dates.map((d) => d.raw);
    const timeRaws = times.map((t) => t.raw);

    // Clean title
    let title = cleanTitle(cleanedLine, dateRaws, timeRaws);
    if (!title || title.length < 2) {
      title = previousNonDateLine || 'Compromisso';
    }

    // Generate an event for each date in this line
    dates.forEach((d, idx) => {
      const formattedDate = `${d.year}-${pad2(d.month)}-${pad2(d.day)}`;
      const startTime = timeMatch ? timeMatch.startTime : '';
      const endTime = timeMatch ? timeMatch.endTime : '';
      const isAllDay = !startTime;

      events.push({
        id: `ev-${Date.now()}-${i}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
        selected: true,
        title,
        date: formattedDate,
        startTime,
        endTime,
        isAllDay,
        location,
        originalLine: line,
        matchedDateString: d.raw,
        matchedTimeString: timeMatch ? timeMatch.raw : undefined,
      });
    });

    // Reset fallback
    previousNonDateLine = '';
  }

  return events;
}

/**
 * Generates test text required by the prompt
 */
export const SAMPLE_TEST_TEXT = `Reunião pedagógica: 05/11/2026 às 14h – Local: Sala 12
Entrega do projeto final 18 de novembro de 2026
Prova prática de Power BI — 24/11 das 8h às 11h30
Conselho de classe, quinta-feira, 3 de dezembro, 16:00 - 18:00
Encerramento do semestre 2026-12-11`;
