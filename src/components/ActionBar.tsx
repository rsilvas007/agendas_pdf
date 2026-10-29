import { Loader2 } from 'lucide-react';
import type { ConnectionStatus } from '../hooks/useGoogle';
import { TIME_ZONES } from '../lib/format';
import type { CalendarItem } from '../types';

interface Props {
  status: ConnectionStatus;
  toSend: number;
  selected: number;
  calendars: CalendarItem[];
  calendarId: string;
  onCalendar: (id: string) => void;
  timeZone: string;
  onTimeZone: (tz: string) => void;
  progress: { done: number; total: number } | null;
  sample: boolean;
  onSend: () => void;
  onDownloadIcs: () => void;
}

const selectCls =
  'min-h-9 max-w-[11rem] truncate rounded-[var(--radius-ui)] border border-line-strong bg-paper px-2 text-sm text-ink';

export function ActionBar(p: Props) {
  const zones = TIME_ZONES.includes(p.timeZone) ? TIME_ZONES : [p.timeZone, ...TIME_ZONES];
  let label = '';
  if (p.progress) label = `Enviando ${Math.min(p.progress.done + 1, p.progress.total)} de ${p.progress.total}…`;
  else if (p.selected === 0) label = 'Marque um compromisso';
  else if (p.toSend === 0) label = 'Tudo já está na agenda';
  else if (p.sample) label = `Enviar o exemplo (${p.toSend}) para a agenda`;
  else if (p.status === 'on') label = `Enviar ${p.toSend} para o Google Agenda`;
  else if (p.status === 'expired') label = `Reconectar e enviar ${p.toSend}`;
  else label = `Conectar e enviar ${p.toSend}`;
  const disabled = !!p.progress || p.toSend === 0 || p.status === 'connecting';

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 backdrop-blur-sm [padding-bottom:env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-[780px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm text-muted">
          {p.status === 'on' && p.calendars.length > 0 && (
            <label className="flex items-center gap-1.5">
              <span className="sr-only sm:not-sr-only">Agenda</span>
              <select id="agenda-destino" value={p.calendarId} onChange={(e) => p.onCalendar(e.target.value)} className={selectCls}>
                {p.calendars.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.primary ? 'Principal' : c.summary}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex items-center gap-1.5">
            <span className="sr-only sm:not-sr-only">Fuso</span>
            <select id="fuso-horario" value={p.timeZone} onChange={(e) => p.onTimeZone(e.target.value)} className={selectCls}>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z.replace('America/', '').replace('Europe/', '').replace('_', ' ')}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={p.onDownloadIcs}
            disabled={p.selected === 0}
            className="min-h-9 rounded-[var(--radius-ui)] px-2 text-muted underline-offset-4 hover:text-ink hover:underline disabled:opacity-40"
          >
            Baixar .ics
          </button>
        </div>
        <button
          type="button"
          id="enviar"
          onClick={p.onSend}
          disabled={disabled}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-ui)] bg-accent px-5 text-[16px] font-bold text-accent-ink hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {p.progress && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {label}
        </button>
      </div>
    </div>
  );
}
