import { GOOGLE_CLIENT_ID, SCOPES } from '../config';
import { eventEnd, nextDay } from '../core/parser.js';
import type { AgendaEvent, CalendarItem, ParsedEvent, SendResult } from '../types';

/* ------------------------------------------------------------------ */
/* Login com Google Identity Services (só no navegador, sem servidor)  */
/* ------------------------------------------------------------------ */

declare global {
  interface Window {
    google?: any;
  }
}

export interface Session {
  token: string;
  expiresAt: number;
}

export class AuthError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message || code);
    this.code = code;
  }
}

const SESSION_KEY = 'pdfagenda.session';
const HINT_KEY = 'pdfagenda.conta';
const APP_TAG = 'pdf-para-agenda';

let gisLoading: Promise<void> | null = null;

// Carrega o script de login do Google. Chamado assim que o app abre, para que
// o clique em "Conectar" já encontre tudo pronto (o navegador só deixa abrir a
// janela de login se ela for aberta direto no clique).
export function loadGoogleLogin(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (!gisLoading) {
    gisLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        gisLoading = null;
        reject(new AuthError('gis_load', 'Não foi possível carregar o login do Google. Verifique a internet e tente de novo.'));
      };
      document.head.appendChild(s);
    });
  }
  return gisLoading;
}

function store(kind: 'session' | 'local') {
  try {
    return kind === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

export function readSession(): Session | null {
  try {
    const raw = store('session')?.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    return s.token && s.expiresAt > Date.now() + 60_000 ? s : null;
  } catch {
    return null;
  }
}

export function readAccountHint(): string {
  return store('local')?.getItem(HINT_KEY) || '';
}

export function saveAccountHint(email: string) {
  try {
    store('local')?.setItem(HINT_KEY, email);
  } catch {
    /* sem armazenamento: só não lembra a conta */
  }
}

function saveSession(s: Session) {
  try {
    store('session')?.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    /* sem armazenamento: a sessão dura até fechar a aba */
  }
}

export function forgetSession(alsoAccount = false) {
  try {
    store('session')?.removeItem(SESSION_KEY);
    if (alsoAccount) store('local')?.removeItem(HINT_KEY);
  } catch {
    /* nada a limpar */
  }
}

// Pede um token de acesso. Precisa ser chamado diretamente dentro de um clique.
// Depois da primeira autorização, o Google não mostra a tela de permissão de
// novo: a janela abre e fecha sozinha.
export function requestAccess(hint?: string): Promise<Session> {
  if (!GOOGLE_CLIENT_ID) {
    return Promise.reject(
      new AuthError(
        'no_client',
        'Esta cópia do app ainda não tem um ID do Google. Siga a parte 3 e a parte 4 do guia "Ter o meu próprio app", no rodapé da página.'
      )
    );
  }
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) {
    loadGoogleLogin().catch(() => undefined);
    return Promise.reject(new AuthError('gis_not_ready', 'O login do Google ainda está carregando. Tente de novo em alguns segundos.'));
  }
  return new Promise((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES.join(' '),
      include_granted_scopes: true,
      login_hint: hint || undefined,
      callback: (r: any) => {
        if (r.error) {
          reject(new AuthError(r.error, r.error_description));
          return;
        }
        if (!oauth2.hasGrantedAllScopes(r, ...SCOPES)) {
          reject(
            new AuthError(
              'missing_scope',
              'O acesso à agenda não foi liberado. Conecte de novo e marque as caixas de permissão do Google Agenda.'
            )
          );
          return;
        }
        const session = { token: r.access_token, expiresAt: Date.now() + Number(r.expires_in || 3600) * 1000 };
        saveSession(session);
        resolve(session);
      },
      error_callback: (e: any) => {
        const messages: Record<string, string> = {
          popup_closed: 'A janela do Google foi fechada antes de terminar. Clique em conectar de novo.',
          popup_failed_to_open: 'O navegador bloqueou a janela do Google. Libere pop-ups para este site e tente de novo.',
        };
        reject(new AuthError(e?.type || 'unknown', messages[e?.type] || 'Não foi possível conectar à conta Google.'));
      },
    });
    client.requestAccessToken({ prompt: '' });
  });
}

export function revokeAccess(token: string) {
  try {
    window.google?.accounts?.oauth2?.revoke(token, () => undefined);
  } catch {
    /* já estava desconectado */
  }
}

/* ------------------------------------------------------------------ */
/* Google Agenda (Calendar API v3)                                     */
/* ------------------------------------------------------------------ */

const API = 'https://www.googleapis.com/calendar/v3';

async function api<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API + path, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (res.status === 401) {
    forgetSession();
    throw new AuthError('expired', 'A conexão com o Google expirou. Clique em reconectar.');
  }
  if (!res.ok) {
    let message = `O Google respondeu com erro ${res.status}.`;
    try {
      const body = await res.json();
      if (body?.error?.message) message = body.error.message;
    } catch {
      /* resposta sem JSON */
    }
    if (res.status === 403 && /has not been used|is disabled/i.test(message)) {
      message = 'A API do Google Agenda não está ativada no projeto do Google Cloud. Veja o passo a passo no README.';
    }
    throw new Error(message);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export async function listCalendars(token: string): Promise<CalendarItem[]> {
  const data = await api<any>(token, '/users/me/calendarList?minAccessRole=writer');
  return (data.items || [])
    .map((c: any) => ({
      id: c.id,
      summary: c.summaryOverride || c.summary || 'Agenda',
      primary: !!c.primary,
      color: c.backgroundColor,
    }))
    .sort((a: CalendarItem, b: CalendarItem) => Number(b.primary) - Number(a.primary));
}

function addDays(date: string, days: number) {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

function toAgendaEvent(e: any): AgendaEvent {
  const allDay = !!e.start?.date;
  const startDate = allDay ? e.start.date : String(e.start?.dateTime || '').slice(0, 10);
  const endDate = allDay ? addDays(e.end.date, -1) : String(e.end?.dateTime || '').slice(0, 10);
  return {
    id: e.id,
    title: e.summary || '(sem título)',
    date: startDate,
    endDate: endDate || startDate,
    startTime: allDay ? '' : String(e.start.dateTime).slice(11, 16),
    endTime: allDay ? '' : String(e.end?.dateTime || '').slice(11, 16),
    link: e.htmlLink || 'https://calendar.google.com/calendar/r',
    fromPdf: e.extendedProperties?.private?.origem === APP_TAG,
  };
}

// Eventos entre duas datas (AAAA-MM-DD, inclusivas), com horários no fuso escolhido.
export async function listEvents(token: string, calendarId: string, from: string, to: string, timeZone: string) {
  const params = new URLSearchParams({
    timeMin: `${addDays(from, -1)}T00:00:00Z`,
    timeMax: `${addDays(to, 2)}T00:00:00Z`,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
    timeZone,
  });
  const data = await api<any>(token, `/calendars/${encodeURIComponent(calendarId)}/events?${params}`);
  return (data.items || []).filter((e: any) => e.status !== 'cancelled').map(toAgendaEvent) as AgendaEvent[];
}

function normalize(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function eventKey(e: { title: string; date: string; startTime: string }) {
  return `${normalize(e.title)}|${e.date}|${e.startTime || 'dia-inteiro'}`;
}

function buildBody(ev: ParsedEvent, timeZone: string) {
  const body: any = {
    summary: ev.title.trim() || 'Compromisso',
    description: `Importado de PDF pelo app PDF para Agenda.\nTrecho original: ${ev.originalLine || ev.title}`,
    extendedProperties: { private: { origem: APP_TAG } },
  };
  if (ev.location) body.location = ev.location;
  if (ev.isAllDay || !ev.startTime) {
    body.start = { date: ev.date };
    body.end = { date: nextDay(ev.endDate || ev.date) };
  } else {
    const end = eventEnd(ev.date, ev.endDate, ev.startTime, ev.endTime);
    body.start = { dateTime: `${ev.date}T${ev.startTime}:00`, timeZone };
    body.end = { dateTime: `${end.date}T${end.time}:00`, timeZone };
  }
  return body;
}

// Cria os compromissos marcados. Os que já existem na agenda (mesmo título,
// dia e horário) são pulados.
export async function sendEvents(
  token: string,
  calendarId: string,
  timeZone: string,
  events: ParsedEvent[],
  existingKeys: Set<string>,
  onProgress?: (done: number, total: number) => void
): Promise<SendResult> {
  const result: SendResult = { created: [], skipped: [], failed: [] };
  const keys = new Set(existingKeys);
  const todo = events.filter((e) => e.selected);
  for (let i = 0; i < todo.length; i++) {
    const ev = todo[i];
    onProgress?.(i, todo.length);
    const key = eventKey(ev);
    if (keys.has(key)) {
      result.skipped.push({ id: ev.id, title: ev.title, date: ev.date });
      continue;
    }
    try {
      const created = await api<any>(token, `/calendars/${encodeURIComponent(calendarId)}/events`, {
        method: 'POST',
        body: JSON.stringify(buildBody(ev, timeZone)),
      });
      keys.add(key);
      result.created.push({ id: ev.id, eventId: created.id, title: ev.title, date: ev.date, link: created.htmlLink });
    } catch (err: any) {
      if (err instanceof AuthError) throw err;
      result.failed.push({ id: ev.id, title: ev.title, message: err?.message || 'Erro desconhecido' });
    }
  }
  onProgress?.(todo.length, todo.length);
  return result;
}

// Exclui eventos da agenda. Evento que já não existe conta como excluído.
export async function deleteEvents(token: string, calendarId: string, eventIds: string[]) {
  const deleted: string[] = [];
  const failed: Array<{ id: string; message: string }> = [];
  for (const id of eventIds) {
    const res = await fetch(`${API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      forgetSession();
      throw new AuthError('expired', 'A conexão com o Google expirou. Clique em reconectar.');
    }
    if (res.ok || res.status === 404 || res.status === 410) deleted.push(id);
    else failed.push({ id, message: `O Google respondeu com erro ${res.status}.` });
  }
  return { deleted, failed };
}

/* ------------------------------------------------------------------ */
/* Sem conexão: arquivo .ics                                           */
/* ------------------------------------------------------------------ */

export function buildIcs(events: ParsedEvent[], timeZone: string) {
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const compact = (d: string, t?: string) => d.replace(/-/g, '') + (t ? `T${t.replace(':', '')}00` : '');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PDF para Agenda//PT-BR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  events
    .filter((e) => e.selected)
    .forEach((ev) => {
      lines.push('BEGIN:VEVENT', `UID:${ev.id}@pdf-para-agenda`, `DTSTAMP:${stamp}`, `SUMMARY:${esc(ev.title)}`);
      if (ev.isAllDay || !ev.startTime) {
        lines.push(`DTSTART;VALUE=DATE:${compact(ev.date)}`, `DTEND;VALUE=DATE:${compact(nextDay(ev.endDate || ev.date))}`);
      } else {
        const end = eventEnd(ev.date, ev.endDate, ev.startTime, ev.endTime);
        lines.push(`DTSTART;TZID=${timeZone}:${compact(ev.date, ev.startTime)}`, `DTEND;TZID=${timeZone}:${compact(end.date, end.time)}`);
      }
      if (ev.location) lines.push(`LOCATION:${esc(ev.location)}`);
      lines.push(`DESCRIPTION:${esc('Trecho original: ' + (ev.originalLine || ev.title))}`, 'END:VEVENT');
    });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadText(filename: string, content: string, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
