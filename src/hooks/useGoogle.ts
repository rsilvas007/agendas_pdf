import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AuthError,
  type Session,
  eventKey,
  forgetSession,
  listCalendars,
  listEvents,
  loadGoogleLogin,
  readAccountHint,
  readSession,
  requestAccess,
  revokeAccess,
  saveAccountHint,
} from '../services/google';
import type { AgendaEvent, CalendarItem, ParsedEvent } from '../types';

export type ConnectionStatus = 'off' | 'connecting' | 'on' | 'expired';

const CAL_KEY = 'pdfagenda.agenda';
const REFRESH_MS = 60_000;
const UPCOMING_DAYS = 30;

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function plusDays(date: string, n: number) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function readCalendarChoice() {
  try {
    return localStorage.getItem(CAL_KEY) || '';
  } catch {
    return '';
  }
}

// Conexão com o Google + agenda ao vivo (atualiza a cada minuto, ao voltar
// para a aba e logo depois de cada envio).
export function useGoogle(parsed: ParsedEvent[], timeZone: string) {
  const initial = readSession();
  const [session, setSession] = useState<Session | null>(initial);
  const [status, setStatus] = useState<ConnectionStatus>(initial ? 'on' : readAccountHint() ? 'expired' : 'off');
  const [account, setAccount] = useState(readAccountHint());
  const [calendars, setCalendars] = useState<CalendarItem[]>([]);
  const [calendarId, setCalendarIdState] = useState(readCalendarChoice());
  const [agenda, setAgenda] = useState<AgendaEvent[]>([]);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [loadingAgenda, setLoadingAgenda] = useState(false);
  const [error, setError] = useState('');
  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    loadGoogleLogin().catch((e) => setError(e.message));
  }, []);

  const handleError = useCallback((e: any) => {
    if (e instanceof AuthError && e.code === 'expired') {
      setSession(null);
      setStatus('expired');
    }
    setError(e?.message || 'Algo deu errado ao falar com o Google.');
  }, []);

  // Marca a sessão como expirada no horário certo.
  useEffect(() => {
    if (!session) return;
    const ms = session.expiresAt - Date.now() - 30_000;
    const t = window.setTimeout(() => {
      forgetSession();
      setSession(null);
      setStatus('expired');
    }, Math.max(ms, 0));
    return () => window.clearTimeout(t);
  }, [session]);

  const loadCalendars = useCallback(
    async (s: Session) => {
      const list = await listCalendars(s.token);
      setCalendars(list);
      const primary = list.find((c) => c.primary);
      if (primary) {
        setAccount(primary.id);
        saveAccountHint(primary.id);
      }
      setCalendarIdState((current) => (list.some((c) => c.id === current) ? current : primary?.id || list[0]?.id || ''));
    },
    []
  );

  useEffect(() => {
    if (session && !calendars.length) loadCalendars(session).catch(handleError);
  }, [session, calendars.length, loadCalendars, handleError]);

  // Intervalo de datas a buscar: próximos 30 dias + datas encontradas no PDF.
  const range = useMemo(() => {
    const start = today();
    let from = start;
    let to = plusDays(start, UPCOMING_DAYS);
    parsed.forEach((e) => {
      if (e.date < from) from = e.date;
      const last = e.endDate || e.date;
      if (last > to) to = last;
    });
    return { from, to };
  }, [parsed]);

  const refresh = useCallback(async () => {
    const s = sessionRef.current;
    if (!s || !calendarId) return;
    setLoadingAgenda(true);
    try {
      const items = await listEvents(s.token, calendarId, range.from, range.to, timeZone);
      setAgenda(items);
      setUpdatedAt(Date.now());
    } catch (e) {
      handleError(e);
    } finally {
      setLoadingAgenda(false);
    }
  }, [calendarId, range.from, range.to, timeZone, handleError]);

  useEffect(() => {
    if (status !== 'on' || !calendarId) return;
    refresh();
    const tick = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const id = window.setInterval(tick, REFRESH_MS);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [status, calendarId, refresh]);

  // Chame direto no clique. Devolve uma sessão válida, reconectando se preciso.
  const ensureSession = useCallback((): Promise<Session> => {
    const s = sessionRef.current;
    if (s && s.expiresAt - Date.now() > 5 * 60_000) return Promise.resolve(s);
    setStatus('connecting');
    setError('');
    return requestAccess(account).then(
      (fresh) => {
        setSession(fresh);
        setStatus('on');
        return fresh;
      },
      (e) => {
        setStatus(sessionRef.current ? 'on' : account ? 'expired' : 'off');
        throw e;
      }
    );
  }, [account]);

  const connect = useCallback(() => {
    ensureSession().catch((e) => setError(e.message));
  }, [ensureSession]);

  const disconnect = useCallback(() => {
    if (sessionRef.current) revokeAccess(sessionRef.current.token);
    forgetSession(true);
    setSession(null);
    setStatus('off');
    setAccount('');
    setCalendars([]);
    setAgenda([]);
    setUpdatedAt(null);
  }, []);

  const setCalendarId = useCallback((id: string) => {
    setCalendarIdState(id);
    try {
      localStorage.setItem(CAL_KEY, id);
    } catch {
      /* só não lembra a escolha */
    }
  }, []);

  // Evento da agenda com o mesmo título, dia e horário de cada compromisso.
  const byKey = useMemo(() => {
    const map = new Map<string, AgendaEvent>();
    agenda.forEach((e) => {
      const k = eventKey(e);
      if (!map.has(k)) map.set(k, e);
    });
    return map;
  }, [agenda]);
  const existingKeys = useMemo(() => new Set(byKey.keys()), [byKey]);
  const agendaIds = useMemo(() => new Set(agenda.map((e) => e.id)), [agenda]);

  // Tira da lista na hora, sem esperar a próxima atualização.
  const forget = useCallback((ids: string[]) => {
    setAgenda((prev) => prev.filter((e) => !ids.includes(e.id)));
  }, []);

  const upcoming = useMemo(() => {
    const start = today();
    const end = plusDays(start, UPCOMING_DAYS);
    return agenda.filter((e) => e.endDate >= start && e.date <= end);
  }, [agenda]);

  return {
    status,
    account,
    calendars,
    calendarId,
    setCalendarId,
    upcoming,
    existingKeys,
    byKey,
    agendaIds,
    forget,
    updatedAt,
    loadingAgenda,
    error,
    setError,
    connect,
    disconnect,
    ensureSession,
    refresh,
    handleError,
  };
}
