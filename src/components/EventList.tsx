import { useState } from 'react';
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { safeEnd } from '../core/parser.js';
import { dayMonth, plural, timeRange, todayIso, weekday, yearOf } from '../lib/format';
import type { ParsedEvent } from '../types';

export interface RowStatus {
  kind: 'created' | 'exists' | 'failed';
  link?: string;
  message?: string;
}

interface Props {
  events: ParsedEvent[];
  setEvents: (fn: (prev: ParsedEvent[]) => ParsedEvent[]) => void;
  statusOf: (ev: ParsedEvent) => RowStatus | null;
}

let manualSeq = 0;

export function EventList({ events, setEvents, statusOf }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const selected = events.filter((e) => e.selected).length;
  const allOn = events.length > 0 && selected === events.length;
  const thisYear = new Date().getFullYear();

  function update(id: string, patch: Partial<ParsedEvent>) {
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const next = { ...e, ...patch };
        if ('isAllDay' in patch) {
          if (patch.isAllDay) {
            next.startTime = '';
            next.endTime = '';
          } else if (!next.startTime) {
            next.startTime = '09:00';
            next.endTime = '10:00';
          }
        }
        if ('startTime' in patch && next.startTime) {
          next.isAllDay = false;
          next.endTime = safeEnd(next.startTime, next.endTime);
        }
        if (next.endDate && next.endDate <= next.date) next.endDate = '';
        return next;
      })
    );
  }

  function addManual() {
    manualSeq += 1;
    const ev: ParsedEvent = {
      id: `manual-${manualSeq}-${Date.now()}`,
      selected: true,
      title: '',
      date: todayIso(),
      endDate: '',
      startTime: '09:00',
      endTime: '10:00',
      isAllDay: false,
      location: '',
      originalLine: '',
    };
    setEvents((prev) => [...prev, ev]);
    setEditing(ev.id);
  }

  return (
    <section aria-labelledby="titulo-compromissos" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="titulo-compromissos" className="text-lg font-semibold tracking-tight">
          Compromissos encontrados
        </h2>
        {events.length > 0 && (
          <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm text-muted">
            <input
              id="selecionar-todos"
              type="checkbox"
              checked={allOn}
              onChange={() => setEvents((prev) => prev.map((e) => ({ ...e, selected: !allOn })))}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            {selected} de {events.length} marcados
          </label>
        )}
      </div>

      {events.length === 0 ? (
        <div className="rounded-[var(--radius-ui)] border border-dashed border-line-strong px-4 py-6 text-sm text-muted">
          Nenhuma data foi encontrada neste texto. Confira o texto lido acima ou adicione o compromisso à mão.
        </div>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {events.map((ev) => {
            const status = statusOf(ev);
            const isEditing = editing === ev.id;
            const year = yearOf(ev.date);
            return (
              <li key={ev.id} className={ev.selected ? '' : 'opacity-55'}>
                <div className="flex items-start gap-3 py-3">
                  <input
                    id={`marcar-${ev.id}`}
                    type="checkbox"
                    checked={ev.selected}
                    onChange={(e) => update(ev.id, { selected: e.target.checked })}
                    aria-label={`Incluir ${ev.title || 'compromisso'}`}
                    className="mt-1.5 h-[18px] w-[18px] shrink-0 accent-[var(--accent)]"
                  />
                  <button
                    type="button"
                    onClick={() => setEditing(isEditing ? null : ev.id)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left sm:gap-4"
                    aria-expanded={isEditing}
                  >
                    <span className="w-[4.5rem] shrink-0 font-mono text-sm leading-6 tnum">
                      <span className="block font-medium text-ink">{dayMonth(ev.date)}</span>
                      <span className="block text-xs text-muted">
                        {weekday(ev.date)}
                        {year && year !== thisYear ? ` ${year}` : ''}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block font-medium leading-6 ${ev.title ? '' : 'text-muted'}`}>{ev.title || 'Sem título'}</span>
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                        <span className="font-mono text-[13px] tnum sm:hidden">{timeRange(ev.startTime, ev.endTime)}</span>
                        {ev.endDate && <span>até {dayMonth(ev.endDate)}</span>}
                        {ev.location && <span className="truncate">{ev.location}</span>}
                        {status?.kind === 'exists' && (
                          <span className="rounded bg-warn-soft px-1.5 py-px text-xs font-medium text-warn">Já está na agenda</span>
                        )}
                        {status?.kind === 'created' && (
                          <span className="rounded bg-accent-soft px-1.5 py-px text-xs font-medium text-accent">Criado</span>
                        )}
                        {status?.kind === 'failed' && (
                          <span className="rounded bg-danger-soft px-1.5 py-px text-xs font-medium text-danger" title={status.message}>
                            Não foi criado
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="hidden shrink-0 font-mono text-sm leading-6 text-ink tnum sm:block">
                      {timeRange(ev.startTime, ev.endTime)}
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center">
                    {status?.kind === 'created' && status.link && (
                      <a
                        href={status.link}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Abrir no Google Agenda"
                        className="grid h-9 w-9 place-items-center rounded-[var(--radius-ui)] text-accent hover:bg-accent-soft"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditing(isEditing ? null : ev.id)}
                      aria-label={isEditing ? 'Fechar edição' : `Editar ${ev.title || 'compromisso'}`}
                      className={`grid h-9 w-9 place-items-center rounded-[var(--radius-ui)] hover:bg-sunk ${isEditing ? 'text-ink' : 'text-muted'}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {isEditing && (
                  <div className="mb-3 ml-[30px] grid grid-cols-2 gap-3 rounded-[var(--radius-ui)] bg-sunk p-3 sm:grid-cols-4">
                    <Field label="Título" className="col-span-2 sm:col-span-4">
                      <input
                        id={`titulo-${ev.id}`}
                        value={ev.title}
                        autoFocus={!ev.title}
                        onChange={(e) => update(ev.id, { title: e.target.value })}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Data">
                      <input id={`data-${ev.id}`} type="date" value={ev.date} onChange={(e) => e.target.value && update(ev.id, { date: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Até (opcional)">
                      <input
                        id={`ate-${ev.id}`}
                        type="date"
                        value={ev.endDate}
                        min={ev.date}
                        onChange={(e) => update(ev.id, { endDate: e.target.value })}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Início">
                      <input
                        id={`inicio-${ev.id}`}
                        type="time"
                        value={ev.startTime}
                        disabled={ev.isAllDay}
                        onChange={(e) => update(ev.id, { startTime: e.target.value })}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Fim">
                      <input
                        id={`fim-${ev.id}`}
                        type="time"
                        value={ev.endTime}
                        disabled={ev.isAllDay}
                        onChange={(e) => update(ev.id, { endTime: e.target.value })}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Local" className="col-span-2 sm:col-span-3">
                      <input id={`local-${ev.id}`} value={ev.location} onChange={(e) => update(ev.id, { location: e.target.value })} className={inputCls} />
                    </Field>
                    <label className="col-span-2 flex min-h-10 cursor-pointer items-center gap-2 self-end text-sm sm:col-span-1">
                      <input
                        id={`dia-inteiro-${ev.id}`}
                        type="checkbox"
                        checked={ev.isAllDay}
                        onChange={(e) => update(ev.id, { isAllDay: e.target.checked })}
                        className="h-4 w-4 accent-[var(--accent)]"
                      />
                      Dia inteiro
                    </label>
                    {ev.originalLine && (
                      <p className="col-span-2 font-mono text-xs text-muted sm:col-span-4">Trecho do PDF: {ev.originalLine}</p>
                    )}
                    <div className="col-span-2 flex justify-between gap-2 sm:col-span-4">
                      <button
                        type="button"
                        onClick={() => setEvents((prev) => prev.filter((e) => e.id !== ev.id))}
                        className="flex min-h-9 items-center gap-1.5 rounded-[var(--radius-ui)] px-2 text-sm text-danger hover:bg-danger-soft"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Remover
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="min-h-9 rounded-[var(--radius-ui)] bg-ink px-3 text-sm font-medium text-paper"
                      >
                        Concluir
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div>
        <button type="button" onClick={addManual} className="flex min-h-9 items-center gap-1.5 rounded-[var(--radius-ui)] px-2 text-sm font-medium text-accent hover:bg-accent-soft">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Adicionar compromisso
        </button>
      </div>
      {events.some((e) => statusOf(e)?.kind === 'exists' && e.selected) && (
        <p className="text-sm text-muted">
          {plural(events.filter((e) => statusOf(e)?.kind === 'exists' && e.selected).length, 'compromisso já está', 'compromissos já estão')} na
          agenda com o mesmo nome e horário e não {events.filter((e) => statusOf(e)?.kind === 'exists' && e.selected).length === 1 ? 'será criado' : 'serão criados'} de novo.
        </p>
      )}
    </section>
  );
}

const inputCls =
  'w-full min-h-10 rounded-[var(--radius-ui)] border border-line-strong bg-paper px-2.5 py-1.5 text-[15px] text-ink disabled:opacity-50';

function Field({ label, className = '', children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 text-sm text-muted ${className}`}>
      {label}
      {children}
    </label>
  );
}

