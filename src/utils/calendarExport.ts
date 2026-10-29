import { ParsedEvent } from '../types';

/**
 * Formats a Date and time for Google Calendar web URL and iCalendar format.
 */
function formatIcsDateTime(dateStr: string, timeStr: string, isAllDay: boolean): string {
  const [y, m, d] = dateStr.split('-').map((v) => parseInt(v, 10));
  if (isAllDay || !timeStr) {
    // All day format: YYYYMMDD
    return `${y}${m.toString().padStart(2, '0')}${d.toString().padStart(2, '0')}`;
  }

  const [h, min] = timeStr.split(':').map((v) => parseInt(v, 10));
  const pad = (n: number) => n.toString().padStart(2, '0');
  // Format: YYYYMMDDTHHmmss
  return `${y}${pad(m)}${pad(d)}T${pad(h)}${pad(min)}00`;
}

/**
 * Generates an .ics file string from an array of parsed events.
 */
export function generateIcsContent(events: ParsedEvent[]): string {
  const selected = events.filter((e) => e.selected);
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}T${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}Z`;

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PDF para Google Agenda//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-TIMEZONE:America/Sao_Paulo',
  ];

  selected.forEach((ev, idx) => {
    const isAllDay = ev.isAllDay || !ev.startTime;
    let dtStart = '';
    let dtEnd = '';

    if (isAllDay) {
      dtStart = `VALUE=DATE:${formatIcsDateTime(ev.date, '', true)}`;
      // For all-day events in ICS, DTEND is next day
      const [y, m, d] = ev.date.split('-').map((v) => parseInt(v, 10));
      const nextDay = new Date(y, m - 1, d + 1);
      const nextDayStr = `${nextDay.getFullYear()}-${pad(nextDay.getMonth() + 1)}-${pad(nextDay.getDate())}`;
      dtEnd = `VALUE=DATE:${formatIcsDateTime(nextDayStr, '', true)}`;
    } else {
      dtStart = formatIcsDateTime(ev.date, ev.startTime, false);
      const endTime = ev.endTime || ev.startTime;
      dtEnd = formatIcsDateTime(ev.date, endTime, false);
    }

    const desc = `Importado do PDF: ${ev.originalLine || ev.title}`.replace(/[\n\r]/g, ' ');
    const loc = (ev.location || '').replace(/[\n\r]/g, ' ');

    icsLines.push(
      'BEGIN:VEVENT',
      `UID:${stamp}-${idx}-${ev.id}@pdf-agenda`,
      `DTSTAMP:${stamp}`,
      `SUMMARY:${ev.title.replace(/[,;]/g, ' ')}`,
      `DESCRIPTION:${desc}`,
      loc ? `LOCATION:${loc}` : '',
      `DTSTART;${dtStart}`,
      `DTEND;${dtEnd}`,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  });

  icsLines.push('END:VCALENDAR');
  return icsLines.filter(Boolean).join('\r\n');
}

/**
 * Generates a direct Google Calendar Web Link for 1-click addition in browser
 */
export function getGoogleCalendarWebUrl(ev: ParsedEvent): string {
  const isAllDay = ev.isAllDay || !ev.startTime;
  const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';

  let datesParam = '';
  if (isAllDay) {
    const start = formatIcsDateTime(ev.date, '', true);
    // Next day for all day
    const [y, m, d] = ev.date.split('-').map((v) => parseInt(v, 10));
    const pad = (n: number) => n.toString().padStart(2, '0');
    const nextDay = new Date(y, m - 1, d + 1);
    const end = `${nextDay.getFullYear()}${pad(nextDay.getMonth() + 1)}${pad(nextDay.getDate())}`;
    datesParam = `${start}/${end}`;
  } else {
    const start = formatIcsDateTime(ev.date, ev.startTime, false);
    const end = formatIcsDateTime(ev.date, ev.endTime || ev.startTime, false);
    datesParam = `${start}/${end}`;
  }

  const params = new URLSearchParams({
    text: ev.title,
    dates: datesParam,
    details: `Importado do PDF: ${ev.originalLine || ev.title}`,
    location: ev.location || '',
  });

  return `${baseUrl}&${params.toString()}`;
}

/**
 * Downloads a text file (such as .ics or .gs or .html) in the browser
 */
export function downloadFile(filename: string, content: string, mimeType: string = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
