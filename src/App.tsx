import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { ActionBar } from './components/ActionBar';
import { EventList, type RowStatus } from './components/EventList';
import { LiveAgenda } from './components/LiveAgenda';
import { PdfInput, type Source } from './components/PdfInput';
import { SourceText } from './components/SourceText';
import { TopBar } from './components/TopBar';
import { Folhinha } from './components/Folhinha';
import { feriado, proximoFeriado } from './lib/feriados';
import { REPO_URL } from './config';
import { SAMPLE_TEXT, parseEvents } from './core/parser.js';
import { useGoogle } from './hooks/useGoogle';
import { dayMonth, defaultTimeZone, plural, todayIso } from './lib/format';
import { buildIcs, deleteEvents, downloadText, eventKey, listCalendars, listEvents, sendEvents } from './services/google';
import type { ParsedEvent } from './types';

const GuideView = lazy(() => import('./components/GuideView').then((m) => ({ default: m.GuideView })));
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
  const [deleting, setDeleting] = useState(false);
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

  // Situação de cada compromisso, sempre conferida com a agenda ao vivo: se
  // ele foi apagado direto no Google Agenda, deixa de aparecer como criado.
  const statusOf = useCallback(
    (ev: ParsedEvent): RowStatus | null => {
      const r = results.get(ev.id);
      if (r?.kind === 'failed') return r;
      if (r?.kind === 'created') {
        const sumiu = google.updatedAt && r.at && google.updatedAt > r.at && r.eventId && !google.agendaIds.has(r.eventId);
        if (!sumiu) return r;
      }
      const match = google.byKey.get(eventKey(ev));
      return match ? { kind: 'exists', eventId: match.id, link: match.link } : null;
    },
    [results, google.byKey, google.agendaIds, google.updatedAt]
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
          const at = Date.now();
          res.created.forEach((c) => next.set(c.id, { kind: 'created', link: c.link, eventId: c.eventId, at }));
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

  // Exclui da agenda do Google. Também começa direto no clique.
  function handleDelete(eventIds: string[]) {
    const ids = [...new Set(eventIds.filter(Boolean))];
    if (!ids.length) return;
    setNotice(null);
    setDeleting(true);
    google
      .ensureSession()
      .then(async (session) => {
        const calendarId = google.calendarId || 'primary';
        const res = await deleteEvents(session.token, calendarId, ids);
        google.forget(res.deleted);
        setResults((prev) => {
          const next = new Map(prev);
          next.forEach((v, k) => {
            if (v.eventId && res.deleted.includes(v.eventId)) next.delete(k);
          });
          return next;
        });
        setNotice({
          kind: res.failed.length ? 'error' : 'ok',
          text: res.failed.length
            ? `${plural(res.deleted.length, 'excluído', 'excluídos')}; ${plural(res.failed.length, 'não pôde', 'não puderam')} ser excluído: ${res.failed[0].message}`
            : `${plural(res.deleted.length, 'compromisso excluído', 'compromissos excluídos')} do Google Agenda.`,
        });
        google.refresh();
      })
      .catch((err) => google.handleError(err))
      .finally(() => setDeleting(false));
  }

  function handleIcs() {
    downloadText('compromissos.ics', buildIcs(events, timeZone), 'text/calendar;charset=utf-8');
  }

  if (route === '#apps-script' || route === '#instalar') {
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
          {route === '#instalar' ? <GuideView /> : <AppsScriptView />}
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
        <div className="flex items-start justify-between gap-5 sm:gap-8">
          <div className="flex min-w-0 flex-col gap-3 pt-1">
            <h1 className="text-[30px] font-extrabold leading-[1.05] tracking-[-0.02em] sm:text-[44px]">
              Do PDF para a agenda, sem copiar data por data.
            </h1>
            <p className="max-w-[54ch] text-[17px] leading-relaxed text-muted">
              Envie um cronograma, edital ou calendário escolar. O app lê datas como 05/11, 18 de novembro e 3 a 7 de dezembro, você
              confere e cria tudo no Google Agenda de uma vez.
            </p>
          </div>
          <Hoje />
        </div>

        <PdfInput source={source} found={events.length} onText={loadText} />

        {notice && (
          <div
            role={notice.kind === 'error' ? 'alert' : 'status'}
            className={`flex items-start gap-3 rounded-[var(--radius-ui)] px-4 py-3 text-[15px] ${
              notice.kind === 'error' ? 'bg-danger-soft text-danger' : 'bg-ok-soft text-ink'
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

        <EventList events={events} setEvents={setEvents} statusOf={statusOf} onDelete={handleDelete} deleting={deleting} />

        <LiveAgenda
          status={google.status}
          calendarName={calendarName}
          events={google.upcoming}
          updatedAt={google.updatedAt}
          loading={google.loadingAgenda}
          onRefresh={google.refresh}
          onDelete={handleDelete}
          deleting={deleting}
          onConnect={google.connect}
        />

        <footer className="flex flex-col gap-2 border-t border-line pt-5 text-sm text-muted">
          <p className="max-w-[64ch]">
            O PDF é lido no seu navegador. Só os compromissos que você enviar vão para a sua conta Google, e o app não guarda nada em
            servidor.
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <a href="#instalar" className="font-semibold text-ink underline-offset-4 hover:underline">
              Ter o meu próprio app
            </a>
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

// Folhinha de hoje, com o feriado do dia ou o próximo feriado nacional.
function Hoje() {
  const hoje = todayIso();
  const deHoje = feriado(hoje);
  const proximo = proximoFeriado(hoje);
  return (
    <figure className="hidden shrink-0 flex-col items-center gap-2 pt-1 min-[520px]:flex">
      <Folhinha data={hoje} tamanho="g" />
      <figcaption className="max-w-[168px] text-center text-[13px] leading-snug text-muted">
        {deHoje ? (
          <span className="text-red">Hoje é {deHoje.nome}</span>
        ) : proximo ? (
          <>
            Próximo feriado: <span className="text-ink">{dayMonth(proximo.data)}</span>, {proximo.feriado.nome}
          </>
        ) : null}
      </figcaption>
    </figure>
  );
}
