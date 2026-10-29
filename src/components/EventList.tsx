import { useState } from 'react';
import { ExternalLink, Loader2, Pencil, Plus, Trash2, Undo2, X } from 'lucide-react';
import { safeEnd } from '../core/parser.js';
import { dayMonth, plural, timeRange, todayIso, yearOf } from '../lib/format';
import { feriado } from '../lib/feriados';
import { Folhinha } from './Folhinha';
import type { ParsedEvent } from '../types';

export interface RowStatus {
  kind: 'created' | 'exists' | 'failed';
  link?: string;
  message?: string;
  eventId?: string;
  at?: number;
}

interface Props {
  events: ParsedEvent[];
  setEvents: (fn: (prev: ParsedEvent[]) => ParsedEvent[]) => void;
  statusOf: (ev: ParsedEvent) => RowStatus | null;
  onDelete: (eventIds: string[]) => void;
  deleting: boolean;
}

let manualSeq = 0;

export function EventList({ events, setEvents, statusOf, onDelete, deleting }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const createdIds = events.map((e) => statusOf(e)).filter((st) => st?.kind === 'created' && st.eventId).map((st) => st!.eventId!);

  function confirmDelete(ids: string[]) {
    onDelete(ids);
    setConfirming(null);
  }
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
        <h2 id="titulo-compromissos" className="text-[22px] font-bold tracking-tight">
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

      {createdIds.length > 0 && confirming !== 'todos' && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
          <span>{plural(createdIds.length, 'compromisso criado', 'compromissos criados')} agora por este app.</span>
          <button
            type="button"
            onClick={() => setConfirming('todos')}
            className="flex min-h-9 items-center gap-1.5 rounded-[var(--radius-ui)] px-2 font-semibold text-red hover:bg-red-soft"
          >
            <Undo2 className="h-4 w-4" aria-hidden="true" />
            Desfazer envio
          </button>
        </div>
      )}
      {confirming === 'todos' && (
        <ConfirmBar
          text={`Excluir do seu Google Agenda ${plural(createdIds.length, 'o compromisso criado', 'os compromissos criados')} agora?`}
          action={`Excluir ${createdIds.length} da agenda`}
          busy={deleting}
          onConfirm={() => confirmDelete(createdIds)}
          onCancel={() => setConfirming(null)}
        />
      )}

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
                <div className="flex items-start gap-3 py-3.5">
                  <input
                    id={`marcar-${ev.id}`}
                    type="checkbox"
                    checked={ev.selected}
                    onChange={(e) => update(ev.id, { selected: e.target.checked })}
                    aria-label={`Incluir ${ev.title || 'compromisso'}`}
                    className="mt-[22px] h-[18px] w-[18px] shrink-0 accent-[var(--accent)]"
                  />
                  <button
                    type="button"
                    onClick={() => setEditing(isEditing ? null : ev.id)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left sm:gap-4"
                    aria-expanded={isEditing}
                  >
                    <Folhinha data={ev.date} mostrarAno={!!year && year !== thisYear} />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[17px] font-semibold leading-6 ${ev.title ? '' : 'text-muted'}`}>{ev.title || 'Sem título'}</span>
                      <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-0.5 text-sm text-muted">
                        <span className="font-medium text-ink tnum sm:hidden">{timeRange(ev.startTime, ev.endTime)}</span>
                        {feriado(ev.date) && (
                          <span className="text-red">
                            {feriado(ev.date)!.facultativo ? 'Ponto facultativo' : 'Feriado'}: {feriado(ev.date)!.nome}
                          </span>
                        )}
                        {ev.endDate && <span>até {dayMonth(ev.endDate)}</span>}
                        {ev.location && <span className="truncate">{ev.location}</span>}
                        {status?.kind === 'exists' && (
                          <span className="carimbo text-ok">já na agenda</span>
                        )}
                        {status?.kind === 'created' && (
                          <span className="carimbo text-ok">criado ✓</span>
                        )}
                        {status?.kind === 'failed' && (
                          <span className="rounded bg-danger-soft px-1.5 py-px text-xs font-medium text-danger" title={status.message}>
                            Não foi criado
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="hidden shrink-0 pt-px text-[15px] font-medium leading-6 text-ink tnum sm:block">
                      {timeRange(ev.startTime, ev.endTime)}
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center">
                    {status?.link && (
                      <a
                        href={status.link}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Abrir no Google Agenda"
                        className="grid h-9 w-9 place-items-center rounded-[var(--radius-ui)] text-ok hover:bg-ok-soft"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    {status?.eventId && (
                      <button
                        type="button"
                        onClick={() => setConfirming(confirming === ev.id ? null : ev.id)}
                        aria-label={`Excluir ${ev.title || 'compromisso'} do Google Agenda`}
                        title="Excluir do Google Agenda"
                        className="grid h-9 w-9 place-items-center rounded-[var(--radius-ui)] text-red hover:bg-red-soft"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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

                {confirming === ev.id && status?.eventId && (
                  <div className="mb-3 ml-[30px]">
                    <ConfirmBar
                      text={`Excluir "${ev.title || 'compromisso'}" de ${dayMonth(ev.date)} do seu Google Agenda?`}
                      action="Excluir da agenda"
                      busy={deleting}
                      onConfirm={() => confirmDelete([status.eventId!])}
                      onCancel={() => setConfirming(null)}
                    />
                  </div>
                )}

                {isEditing && (
                  <div className="mb-4 ml-[30px] grid grid-cols-2 gap-3 rounded-[var(--radius-ui)] bg-sunk p-3 sm:grid-cols-4">
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
                        <X className="h-4 w-4" aria-hidden="true" />
                        Tirar da lista
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
        <button type="button" onClick={addManual} className="flex min-h-9 items-center gap-1.5 rounded-[var(--radius-ui)] px-2 text-[15px] font-semibold text-ink hover:bg-sunk">
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


export function ConfirmBar({
  text,
  action,
  busy,
  onConfirm,
  onCancel,
}: {
  text: string;
  action: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div role="alertdialog" aria-label={text} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[var(--radius-ui)] border border-red/40 bg-red-soft px-3 py-2.5">
      <p className="min-w-0 flex-1 text-[15px] text-ink">{text}</p>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="min-h-9 rounded-[var(--radius-ui)] px-3 text-sm font-medium text-ink hover:bg-paper/70">
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          autoFocus
          className="flex min-h-9 items-center gap-1.5 rounded-[var(--radius-ui)] bg-red px-3 text-sm font-bold text-red-ink disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {busy ? 'Excluindo…' : action}
        </button>
      </div>
    </div>
  );
}
