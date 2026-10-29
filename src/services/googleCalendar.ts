import { ParsedEvent } from '../types';
import { addOneHour } from '../parser';

export interface GoogleCalendarItem {
  id: string;
  summary: string;
  primary?: boolean;
  backgroundColor?: string;
}

export interface DirectSyncResult {
  success: boolean;
  createdCount: number;
  skippedCount: number;
  errorsCount: number;
  created: Array<{
    id: string;
    title: string;
    date: string;
    startTime?: string;
    htmlLink?: string;
  }>;
  skipped: Array<{
    title: string;
    date: string;
    reason: string;
  }>;
  errors: Array<{
    title: string;
    error: string;
  }>;
}

/**
 * Fetch list of user's Google Calendars from Google Calendar API v3
 */
export async function fetchUserCalendars(accessToken: string): Promise<GoogleCalendarItem[]> {
  const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erro ao listar agendas do Google: ${errText}`);
  }

  const data = await response.json();
  const items = data.items || [];

  return items.map((item: any) => ({
    id: item.id,
    summary: item.summaryOverride || item.summary || 'Agenda',
    primary: !!item.primary,
    backgroundColor: item.backgroundColor,
  }));
}

/**
 * Helper to get the next day in YYYY-MM-DD format for all-day events
 */
function getNextDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map((v) => parseInt(v, 10));
  const next = new Date(y, m - 1, d + 1);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
}

/**
 * Batch create events directly in the user's Google Calendar with anti-duplicate verification
 */
export async function batchCreateEventsInGoogleCalendar(
  accessToken: string,
  calendarId: string,
  events: ParsedEvent[],
  timeZone: string = 'America/Sao_Paulo'
): Promise<DirectSyncResult> {
  const selected = events.filter((e) => e.selected);
  const created: DirectSyncResult['created'] = [];
  const skipped: DirectSyncResult['skipped'] = [];
  const errors: DirectSyncResult['errors'] = [];

  // Group events by date to minimize duplicate queries
  const eventsByDate = new Map<string, ParsedEvent[]>();
  selected.forEach((ev) => {
    if (!eventsByDate.has(ev.date)) {
      eventsByDate.set(ev.date, []);
    }
    eventsByDate.get(ev.date)!.push(ev);
  });

  for (const [dateStr, dayEvents] of eventsByDate.entries()) {
    let existingOnDay: any[] = [];
    try {
      // Query events on that day for duplicate prevention
      const [y, m, d] = dateStr.split('-').map((v) => parseInt(v, 10));
      const timeMin = new Date(y, m - 1, d, 0, 0, 0).toISOString();
      const timeMax = new Date(y, m - 1, d, 23, 59, 59).toISOString();

      const checkUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        calendarId
      )}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(
        timeMax
      )}&singleEvents=true`;

      const checkRes = await fetch(checkUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (checkRes.ok) {
        const checkData = await checkRes.json();
        existingOnDay = checkData.items || [];
      }
    } catch (e) {
      console.warn('Não foi possível verificar duplicatas antecipadamente:', e);
    }

    for (const ev of dayEvents) {
      try {
        const cleanTitle = (ev.title || '').trim().toLowerCase();
        const isDuplicate = existingOnDay.some((exist) => {
          const existTitle = (exist.summary || '').trim().toLowerCase();
          if (existTitle !== cleanTitle) return false;

          // Check if time matches
          if (ev.isAllDay || !ev.startTime) {
            return !!exist.start?.date;
          } else {
            const existDateTime = exist.start?.dateTime;
            if (existDateTime) {
              const existTimeStr = existDateTime.substring(11, 16);
              return existTimeStr === ev.startTime;
            }
          }
          return false;
        });

        if (isDuplicate) {
          skipped.push({
            title: ev.title,
            date: ev.date,
            reason: 'Já existe um evento com o mesmo nome e horário neste dia',
          });
          continue;
        }

        // Construct event payload
        const isAllDay = ev.isAllDay || !ev.startTime;
        const eventBody: any = {
          summary: ev.title,
          description: `Importado do PDF: ${ev.originalLine || ev.title}`,
          location: ev.location || undefined,
        };

        if (isAllDay) {
          eventBody.start = { date: ev.date };
          eventBody.end = { date: getNextDay(ev.date) };
        } else {
          const startTime = ev.startTime;
          const endTime = ev.endTime || addOneHour(startTime);

          eventBody.start = {
            dateTime: `${ev.date}T${startTime}:00`,
            timeZone,
          };
          eventBody.end = {
            dateTime: `${ev.date}T${endTime}:00`,
            timeZone,
          };
        }

        // Create the event
        const createUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
          calendarId
        )}/events`;

        const createRes = await fetch(createUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventBody),
        });

        if (!createRes.ok) {
          const errData = await createRes.text();
          throw new Error(errData);
        }

        const createdData = await createRes.json();
        created.push({
          id: createdData.id,
          title: ev.title,
          date: ev.date,
          startTime: ev.startTime,
          htmlLink: createdData.htmlLink || `https://calendar.google.com/calendar/event?eid=${createdData.id}`,
        });

        // Add to existingOnDay to prevent duplicate inside the same batch
        existingOnDay.push(createdData);
      } catch (err: any) {
        errors.push({
          title: ev.title,
          error: err.message || String(err),
        });
      }
    }
  }

  return {
    success: errors.length === 0,
    createdCount: created.length,
    skippedCount: skipped.length,
    errorsCount: errors.length,
    created,
    skipped,
    errors,
  };
}
