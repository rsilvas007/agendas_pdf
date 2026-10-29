import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { ActionBar } from './components/ActionBar';
import { EventList, type RowStatus } from './components/EventList';
import { LiveAgenda } from './components/LiveAgenda';
import { PdfInput, type Source } from './components/PdfInput';
import { SourceText } from './components/SourceText';
import { TopBar } from './components/TopBar';
import { REPO_URL } from './config';
import { SAMPLE_TEXT, parseEvents } from './core/parser.js';
import { useGoogle } from './hooks/useGoogle';
import { defaultTimeZone, plural } from './lib/format';
import { buildIcs, downloadText, eventKey, listCalendars, listEvents, sendEvents } from './services/google';
import type { ParsedEvent } from './types';

const AppsScriptView = lazy(() => import('./components/AppsScriptView').then((m) => ({ default: m.AppsScriptView })));

type Theme = 'light' | 'dark';
type Notice = { kind: 'ok' | 'error'; text: string; link?: string } | null;

const TZ_KEY = 'pdfagenda.fuso';
const THEME_KEY = 'pdfagenda.tema';

function readLocal(key: string) {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

function writeLocal(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* sem armazenamento */
  }
}

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const on = () => {
      setHash(window.location.hash);
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}

export default function App() {
  const route = useHashRoute();
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.getAttribute('data-theme') as Theme) || 'light');
  const [text, setText] = useState(SAMPLE_TEXT);
  const [source, setSource] = useState<Source | null>({ name: 'Exemplo', pages: 1, sample: true, pasted: false });
  const [events, setEvents] = useState<ParsedEvent[]>(() => parseEvents(SAMPLE_TEXT));
  const [timeZone, setTimeZone] = useState(() => readLocal(TZ_KEY) || defaultTimeZone());
  const [results, setResults] = useState<Map<string, RowStatus>>(new Map());
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const google = useGoogle(events, timeZone);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (google.error) {
      setNotice({ kind: 'error', text: google.error });
      google.setError('');
    }
  }, [google.error, google.setError]);

  const statusOf = useCallback(
    (ev: ParsedEvent): RowStatus | null => results.get(ev.id) || (google.existingKeys.has(eventKey(ev)) ? { kind: 'exists' } : null),
    [results, google.existingKeys]
  );

  const pending = useMemo(
    () => events.filter((e) => e.selected && e.date && !['created', 'exists'].includes(statusOf(e)?.kind || '')),
    [events, statusOf]
  );
  const selectedCount = events.filter((e) => e.selected).length;

  function loadText(newText: string, src: Source) {
    setText(newText);
    setSource(src);
    setEvents(parseEvents(newText));
    setResults(new Map());
    setNotice(null);
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    writeLocal(THEME_KEY, next);
  }

  function changeTimeZone(tz: string) {
    setTimeZone(tz);
    writeLocal(TZ_KEY, tz);
  }

  // Precisa começar direto no clique: se a conexão tiver expirado, a janela do
  // Google abre na hora (o navegador bloqueia janelas abertas depois).
  function handleSend() {
    if (!pending.length) return;
    setNotice(null);
    google
      .ensureSession()
      .then(async (session) => {
        const calendarId =
          google.calendarId || (await listCalendars(session.token)).find((c) => c.primary)?.id || 'primary';
        const dates = pending.map((e) => e.date).sort();
        const lastDates = pending.map((e) => e.endDate || e.date).sort();
        const existing = await listEvents(session.token, calendarId, dates[0], lastDates[lastDates.length - 1], timeZone);
        setProgress({ done: 0, total: pending.length });
        const res = await sendEvents(
          session.token,
          calendarId,
          timeZone,
          pending,
          new Set(existing.map((e) => eventKey(e))),
          (done, total) => setProgress({ done, total })
        );
        setResults((prev) => {
          const next = new Map(prev);
          res.created.forEach((c) => next.set(c.id, { kind: 'created', link: c.link }));
          res.skipped.forEach((c) => next.set(c.id, { kind: 'exists' }));
          res.failed.forEach((c) => next.set(c.id, { kind: 'failed', message: c.message }));
          return next;
        });
        const parts: string[] = [];
        if (res.created.length) parts.push(`${plural(res.created.length, 'compromisso criado', 'compromissos criados')} no Google Agenda.`);
        if (res.skipped.length) parts.push(`${plural(res.skipped.length, 'já estava', 'já estavam')} na agenda e ${res.skipped.length === 1 ? 'foi pulado' : 'foram pulados'}.`);
        if (res.failed.length) parts.push(`${plural(res.failed.length, 'não pôde ser criado', 'não puderam ser criados')}: ${res.failed[0].message}`);
        const first = res.created[0]?.date;
        setNotice({
          kind: res.failed.length && !res.created.length ? 'error' : 'ok',
          text: parts.join(' ') || 'Nada para enviar.',
          link: first ? `https://calendar.google.com/calendar/r/week/${first.replace(/-/g, '/')}` : undefined,
        });
        google.refresh();
      })
      .catch((err) => {
        google.handleError(err);
      })
      .finally(() => setProgress(null));
  }

  function handleIcs() {
    downloadText('compromissos.ics', buildIcs(events, timeZone), 'text/calendar;charset=utf-8');
  }

  if (route === '#apps-script') {
    return (
      <div className="min-h-screen bg-paper">
        <TopBar
          status={google.status}
          account={google.account}
          theme={theme}
          onToggleTheme={toggleTheme}
          onConnect={google.connect}
          onDisconnect={google.disconnect}
        />
        <Suspense fallback={<p className="mx-auto max-w-[780px] px-4 py-8 text-muted">Carregando…</p>}>
          <AppsScriptView />
        </Suspense>
      </div>
    );
  }

  const calendarName =
    google.calendars.find((c) => c.id === google.calendarId)?.primary ? 'Principal' : google.calendars.find((c) => c.id === google.calendarId)?.summary || '';

  return (
    <div className="min-h-screen bg-paper">
      <TopBar
        status={google.status}
        account={google.account}
        theme={theme}
        onToggleTheme={toggleTheme}
        onConnect={google.connect}
        onDisconnect={google.disconnect}
      />

      <main className="mx-auto flex max-w-[780px] flex-col gap-9 px-4 pb-44 pt-8 sm:pt-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[34px]">Do PDF para a sua agenda</h1>
          <p className="max-w-[60ch] text-[17px] text-muted">
            Envie um cronograma, edital ou calendário em PDF. O app encontra as datas e os horários, você confere e cria tudo no Google
            Agenda de uma vez.
          </p>
        </div>

        <PdfInput source={source} found={events.length} onText={loadText} />

        {notice && (
          <div
            role={notice.kind === 'error' ? 'alert' : 'status'}
            className={`flex items-start gap-3 rounded-[var(--radius-ui)] px-4 py-3 text-[15px] ${
              notice.kind === 'error' ? 'bg-danger-soft text-danger' : 'bg-accent-soft text-ink'
            }`}
          >
            <p className="flex-1">
              {notice.text}{' '}
              {notice.link && (
                <a href={notice.link} target="_blank" rel="noreferrer" className="font-medium text-accent underline underline-offset-4">
                  Abrir Google Agenda
                </a>
              )}
            </p>
            <button type="button" onClick={() => setNotice(null)} aria-label="Fechar aviso" className="-mr-1 grid h-8 w-8 place-items-center rounded-[var(--radius-ui)] hover:bg-paper/60">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {source?.sample && (
          <p className="-mb-4 text-sm text-muted">
            <mark className="marca">Exemplo</mark> Isto é um cronograma de exemplo. Envie o seu PDF para ver as suas datas.
          </p>
        )}

        <SourceText text={text} label={source?.pasted ? 'Texto colado' : 'Texto lido do PDF'} />

        <EventList events={events} setEvents={setEvents} statusOf={statusOf} />

        <LiveAgenda
          status={google.status}
          calendarName={calendarName}
          events={google.upcoming}
          updatedAt={google.updatedAt}
          loading={google.loadingAgenda}
          onRefresh={google.refresh}
          onConnect={google.connect}
        />

        <footer className="flex flex-col gap-2 border-t border-line pt-5 text-sm text-muted">
          <p className="max-w-[64ch]">
            O PDF é lido no seu navegador. Só os compromissos que você enviar vão para a sua conta Google, e o app não guarda nada em
            servidor.
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <a href="#apps-script" className="underline-offset-4 hover:text-ink hover:underline">
              Versão Apps Script
            </a>
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="underline-offset-4 hover:text-ink hover:underline">
              Código no GitHub
            </a>
          </p>
        </footer>
      </main>

      <ActionBar
        status={google.status}
        toSend={pending.length}
        selected={selectedCount}
        calendars={google.calendars}
        calendarId={google.calendarId}
        onCalendar={google.setCalendarId}
        timeZone={timeZone}
        onTimeZone={changeTimeZone}
        progress={progress}
        sample={!!source?.sample}
        onSend={handleSend}
        onDownloadIcs={handleIcs}
      />
    </div>
  );
}
