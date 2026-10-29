import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';
import { ConfirmBar } from './EventList';
import type { ConnectionStatus } from '../hooks/useGoogle';
import { agoText, longDay, todayIso } from '../lib/format';
import { feriado } from '../lib/feriados';
import { diaVermelho } from './Folhinha';
import type { AgendaEvent } from '../types';

interface Props {
  status: ConnectionStatus;
  calendarName: string;
  events: AgendaEvent[];
  updatedAt: number | null;
  loading: boolean;
  onRefresh: () => void;
  onConnect: () => void;
  onDelete: (eventIds: string[]) => void;
  deleting: boolean;
}

// A agenda do Google, ao vivo: próximos 30 dias, atualizada a cada minuto.
export function LiveAgenda({ status, calendarName, events, updatedAt, loading, onRefresh, onConnect, onDelete, deleting }: Props) {
  const [now, setNow] = useState(Date.now());
  const [confirming, setConfirming] = useState<string | null>(null);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => window.clearInterval(t);
  }, []);

  const days = useMemo(() => {
    const today = todayIso();
    const map = new Map<string, AgendaEvent[]>();
    events.forEach((e) => {
      const day = e.date < today ? today : e.date;
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(e);
    });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(0, 12);
  }, [events]);

  return (
    <section aria-labelledby="titulo-agenda" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="titulo-agenda" className="text-[22px] font-bold tracking-tight">
          Sua agenda nos próximos 30 dias
        </h2>
        {status === 'on' && (
          <div className="flex items-center gap-2 text-sm text-muted" aria-live="polite">
            <span>{calendarName ? `${calendarName}, ` : ''}{agoText(updatedAt, now) || 'carregando…'}</span>
            <button
              type="button"
              onClick={onRefresh}
              aria-label="Atualizar agenda agora"
              className="grid h-9 w-9 place-items-center rounded-[var(--radius-ui)] hover:bg-sunk hover:text-ink"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {status !== 'on' ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-ui)] border border-line px-4 py-4">
          <p className="max-w-[46ch] text-sm text-muted">
            {status === 'expired'
              ? 'A conexão com o Google expirou. Reconecte com um clique: o Google não pede a permissão de novo.'
              : 'Conecte sua conta Google para ver sua agenda aqui e criar os compromissos direto nela, sem salvar um por um.'}
          </p>
          <button
            type="button"
            onClick={onConnect}
            disabled={status === 'connecting'}
            className="min-h-10 rounded-[var(--radius-ui)] border border-line-strong px-3 text-sm font-medium hover:bg-sunk disabled:opacity-60"
          >
            {status === 'connecting' ? 'Conectando…' : status === 'expired' ? 'Reconectar' : 'Conectar Google Agenda'}
          </button>
        </div>
      ) : days.length === 0 ? (
        <p className="rounded-[var(--radius-ui)] border border-line px-4 py-4 text-sm text-muted">
          {updatedAt ? 'Nenhum compromisso nos próximos 30 dias.' : 'Carregando sua agenda…'}
        </p>
      ) : (
        <ol className="divide-y divide-line border-y border-line">
          {days.map(([day, list]) => (
            <li key={day} className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-[8.5rem_1fr] sm:gap-4">
              <span className={`text-[15px] font-semibold ${diaVermelho(day) ? 'text-red' : 'text-ink'}`}>
                {longDay(day)}
                {feriado(day) && <span className="block text-xs font-normal">{feriado(day)!.nome}</span>}
              </span>
              <ul className="flex min-w-0 flex-col gap-0.5">
                {list.map((e) => (
                  <li key={e.id} className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex min-w-0 items-baseline gap-3 text-[15px]">
                      <span className="w-[6.5rem] shrink-0 text-muted tnum">{e.startTime ? `${e.startTime}–${e.endTime}` : 'dia inteiro'}</span>
                      <a href={e.link} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-ink hover:underline">
                        {e.fromPdf ? <mark className="marca">{e.title}</mark> : e.title}
                      </a>
                      {e.fromPdf && (
                        <button
                          type="button"
                          onClick={() => setConfirming(confirming === e.id ? null : e.id)}
                          aria-label={`Excluir ${e.title} do Google Agenda`}
                          title="Excluir do Google Agenda"
                          className="-my-2 grid h-8 w-8 shrink-0 place-items-center self-center rounded-[var(--radius-ui)] text-muted hover:bg-red-soft hover:text-red"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {confirming === e.id && (
                      <ConfirmBar
                        text={`Excluir "${e.title}" do seu Google Agenda?`}
                        action="Excluir da agenda"
                        busy={deleting}
                        onConfirm={() => {
                          onDelete([e.id]);
                          setConfirming(null);
                        }}
                        onCancel={() => setConfirming(null)}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
      {status === 'on' && events.some((e) => e.fromPdf) && (
        <p className="text-sm text-muted">
          <mark className="marca">Grifados</mark> são os compromissos criados por este app. Eles podem ser excluídos daqui.
        </p>
      )}
    </section>
  );
}
