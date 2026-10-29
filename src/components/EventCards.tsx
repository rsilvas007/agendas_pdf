import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Trash2,
  Plus,
  ExternalLink,
  Download,
  CheckCircle2,
  CalendarCheck,
  Check,
  LayoutList,
  CalendarDays,
  Sparkles,
  RefreshCw,
  Send,
  AlertTriangle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ParsedEvent } from '../types';
import { generateIcsContent, getGoogleCalendarWebUrl, downloadFile } from '../utils/calendarExport';
import {
  fetchUserCalendars,
  batchCreateEventsInGoogleCalendar,
  GoogleCalendarItem,
  DirectSyncResult,
} from '../services/googleCalendar';
import { ConfirmationModal } from './ConfirmationModal';
import { User } from 'firebase/auth';

interface EventCardsProps {
  events: ParsedEvent[];
  setEvents: React.Dispatch<React.SetStateAction<ParsedEvent[]>>;
  onAdvanceToStep3?: () => void;
  user: User | null;
  accessToken: string | null;
  onRequireLogin: () => void;
}

const GOOGLE_CAL_COLORS = [
  { name: 'Azul Google', bg: 'bg-[#1a73e8]', text: 'text-[#1a73e8]', border: 'border-[#1a73e8]' },
  { name: 'Verde Sálvia', bg: 'bg-[#0f9d58]', text: 'text-[#0f9d58]', border: 'border-[#0f9d58]' },
  { name: 'Uva Roxo', bg: 'bg-[#8430ce]', text: 'text-[#8430ce]', border: 'border-[#8430ce]' },
  { name: 'Flamingo Vermelho', bg: 'bg-[#d93025]', text: 'text-[#d93025]', border: 'border-[#d93025]' },
  { name: 'Banana Amarelo', bg: 'bg-[#f9ab00]', text: 'text-[#f9ab00]', border: 'border-[#f9ab00]' },
];

export const EventCards: React.FC<EventCardsProps> = ({
  events,
  setEvents,
  onAdvanceToStep3,
  user,
  accessToken,
  onRequireLogin,
}) => {
  const [selectedCalendar, setSelectedCalendar] = useState('primary');
  const [selectedTimezone, setSelectedTimezone] = useState('America/Sao_Paulo');
  const [viewMode, setViewMode] = useState<'cards' | 'schedule'>('cards');
  const [userCalendars, setUserCalendars] = useState<GoogleCalendarItem[]>([]);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSyncingDirect, setIsSyncingDirect] = useState(false);
  const [directSyncResult, setDirectSyncResult] = useState<DirectSyncResult | null>(null);

  const selectedCount = events.filter((e) => e.selected).length;
  const allSelected = events.length > 0 && selectedCount === events.length;

  // Load user's real Google Calendars whenever access token is present
  useEffect(() => {
    if (accessToken) {
      setIsLoadingCalendars(true);
      fetchUserCalendars(accessToken)
        .then((cals) => {
          setUserCalendars(cals);
          const primary = cals.find((c) => c.primary);
          if (primary) {
            setSelectedCalendar(primary.id);
          } else if (cals.length > 0) {
            setSelectedCalendar(cals[0].id);
          }
        })
        .catch((err) => {
          console.warn('Erro ao carregar agendas do usuário:', err);
        })
        .finally(() => {
          setIsLoadingCalendars(false);
        });
    } else {
      setUserCalendars([]);
      setSelectedCalendar('primary');
    }
  }, [accessToken]);

  const toggleSelectAll = () => {
    const nextVal = !allSelected;
    setEvents((prev) => prev.map((e) => ({ ...e, selected: nextVal })));
  };

  const updateEvent = (id: string, updates: Partial<ParsedEvent>) => {
    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== id) return ev;
        const updated = { ...ev, ...updates };

        if ('isAllDay' in updates) {
          if (updates.isAllDay) {
            updated.startTime = '';
            updated.endTime = '';
          } else {
            updated.startTime = '09:00';
            updated.endTime = '10:00';
          }
        }
        return updated;
      })
    );
  };

  const removeEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const addManualEvent = () => {
    const today = new Date().toISOString().split('T')[0];
    const newEv: ParsedEvent = {
      id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      selected: true,
      title: 'Novo Compromisso',
      date: today,
      startTime: '14:00',
      endTime: '15:00',
      isAllDay: false,
      location: '',
      originalLine: 'Adicionado manualmente',
    };
    setEvents((prev) => [newEv, ...prev]);
  };

  // Triggered by button "Gravar Direto no Google Agenda"
  const handleInitiateDirectSync = () => {
    if (!accessToken) {
      onRequireLogin();
      return;
    }
    const selectedEvents = events.filter((e) => e.selected);
    if (selectedEvents.length === 0) return;

    // Open confirmation modal as required by Workspace integration guidelines
    setIsConfirmModalOpen(true);
  };

  // Confirmed in modal
  const handleConfirmDirectSync = async () => {
    if (!accessToken) return;
    const selectedEvents = events.filter((e) => e.selected);
    if (selectedEvents.length === 0) return;

    setIsSyncingDirect(true);
    try {
      const result = await batchCreateEventsInGoogleCalendar(
        accessToken,
        selectedCalendar,
        selectedEvents,
        selectedTimezone
      );

      setDirectSyncResult(result);
      setIsConfirmModalOpen(false);

      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }

      if (onAdvanceToStep3) {
        onAdvanceToStep3();
      }
    } catch (err: any) {
      alert(`Erro ao sincronizar com Google Agenda: ${err.message || err}`);
    } finally {
      setIsSyncingDirect(false);
    }
  };

  // Fallback .ICS download
  const handleDownloadIcs = () => {
    const selectedEvents = events.filter((e) => e.selected);
    if (selectedEvents.length === 0) return;
    const icsContent = generateIcsContent(selectedEvents);
    downloadFile(
      `compromissos_google_agenda_${new Date().toISOString().split('T')[0]}.ics`,
      icsContent,
      'text/calendar;charset=utf-8'
    );
  };

  // Group events by date for Schedule / Timeline view
  const eventsByDate = events.reduce((acc, ev) => {
    const d = ev.date || 'Sem Data';
    if (!acc[d]) acc[d] = [];
    acc[d].push(ev);
    return acc;
  }, {} as Record<string, ParsedEvent[]>);

  const sortedDates = Object.keys(eventsByDate).sort();

  const selectedCalendarName =
    userCalendars.find((c) => c.id === selectedCalendar)?.summary ||
    (selectedCalendar === 'primary' ? 'Agenda Principal' : selectedCalendar);

  return (
    <div className="space-y-4">
      {/* Top Google Settings Card */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-6 border border-stone-200/90 dark:border-stone-800 google-shadow-sm space-y-4 transition">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <span>Destino no Google Agenda</span>
                {accessToken && (
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Sincronização Direta Ativa
                  </span>
                )}
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {accessToken
                  ? 'Selecione a agenda da sua conta Google onde os eventos serão criados'
                  : 'Conecte sua conta Google no topo para carregar suas agendas reais'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-stone-700 text-blue-600 dark:text-blue-300 shadow-xs'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
                title="Modo Fichas"
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Fichas</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('schedule')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${
                  viewMode === 'schedule'
                    ? 'bg-white dark:bg-stone-700 text-blue-600 dark:text-blue-300 shadow-xs'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
                title="Modo Linha do Tempo"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Agenda</span>
              </button>
            </div>

            <button
              type="button"
              onClick={addManualEvent}
              className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 py-1.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-300 mb-1">
              Selecionar Agenda:
            </label>
            {userCalendars.length > 0 ? (
              <select
                value={selectedCalendar}
                onChange={(e) => setSelectedCalendar(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-medium focus:ring-2 focus:ring-blue-500 transition"
              >
                {userCalendars.map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    📅 {cal.summary} {cal.primary ? '(Principal)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={selectedCalendar}
                onChange={(e) => setSelectedCalendar(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-medium focus:ring-2 focus:ring-blue-500 transition"
              >
                <option value="primary">📅 Agenda Principal (Padrão)</option>
              </select>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-300 mb-1">
              Fuso Horário Padrão:
            </label>
            <select
              value={selectedTimezone}
              onChange={(e) => setSelectedTimezone(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-medium focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="America/Sao_Paulo">Horário de Brasília (America/Sao_Paulo)</option>
              <option value="America/Manaus">Manaus (America/Manaus)</option>
              <option value="America/Belem">Belém (America/Belem)</option>
              <option value="America/Fortaleza">Fortaleza (America/Fortaleza)</option>
              <option value="America/Recife">Recife (America/Recife)</option>
              <option value="America/Cuiaba">Cuiabá (America/Cuiaba)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Events Container */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-6 border border-stone-200/90 dark:border-stone-800 google-shadow-sm space-y-4 transition">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-stone-700 dark:text-stone-300 select-none">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              disabled={events.length === 0}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-40"
            />
            <span>
              Selecionar Todos ({selectedCount}/{events.length})
            </span>
          </label>

          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            {events.length} {events.length === 1 ? 'compromisso' : 'compromissos'}
          </span>
        </div>

        {/* View Mode: CARDS */}
        {viewMode === 'cards' && (
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {events.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 text-stone-400 text-xs italic space-y-2">
                <CalendarIcon className="w-8 h-8 mx-auto text-stone-300 dark:text-stone-600 stroke-1" />
                <p>Nenhum compromisso detectado ainda.</p>
                <p className="not-italic text-[11px] text-stone-500">
                  Carregue um arquivo PDF ou clique em &ldquo;Carregar Exemplo&rdquo; para ver as fichas.
                </p>
              </div>
            ) : (
              events.map((ev, index) => {
                const colorPill = GOOGLE_CAL_COLORS[index % GOOGLE_CAL_COLORS.length];
                return (
                  <div
                    key={ev.id}
                    className={`p-4 rounded-2xl border transition space-y-3 relative overflow-hidden ${
                      ev.selected
                        ? 'border-blue-500/40 bg-blue-50/15 dark:bg-blue-950/20 shadow-xs'
                        : 'border-stone-200 dark:border-stone-800 bg-stone-50/40 dark:bg-stone-900/40 opacity-70'
                    }`}
                  >
                    {/* Google Color Left Bar Indicator */}
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                        ev.selected ? colorPill.bg : 'bg-stone-300 dark:bg-stone-700'
                      }`}
                    />

                    {/* Card Content */}
                    <div className="flex items-start gap-3 pl-1">
                      <input
                        type="checkbox"
                        checked={ev.selected}
                        onChange={(e) => updateEvent(ev.id, { selected: e.target.checked })}
                        className="mt-1.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />

                      <div className="flex-1 space-y-2.5">
                        {/* Title input */}
                        <div>
                          <input
                            type="text"
                            value={ev.title}
                            onChange={(e) => updateEvent(ev.id, { title: e.target.value })}
                            className="w-full text-xs font-bold p-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            placeholder="Título do compromisso"
                          />
                        </div>

                        {/* Date and Time Fields Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                          {/* Date */}
                          <div className="sm:col-span-5">
                            <label className="text-[10px] font-semibold text-stone-500 dark:text-stone-400 block mb-0.5">
                              Data
                            </label>
                            <input
                              type="date"
                              value={ev.date}
                              onChange={(e) => updateEvent(ev.id, { date: e.target.value })}
                              className="w-full p-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          {/* Time (Start & End) */}
                          <div className="sm:col-span-7 flex items-center gap-2">
                            <div className="flex-1">
                              <label className="text-[10px] font-semibold text-stone-500 dark:text-stone-400 block mb-0.5">
                                Início
                              </label>
                              <input
                                type="time"
                                value={ev.startTime}
                                disabled={ev.isAllDay}
                                onChange={(e) => updateEvent(ev.id, { startTime: e.target.value })}
                                className="w-full p-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium disabled:opacity-40 disabled:bg-stone-100 dark:disabled:bg-stone-900 focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            <div className="flex-1">
                              <label className="text-[10px] font-semibold text-stone-500 dark:text-stone-400 block mb-0.5">
                                Fim
                              </label>
                              <input
                                type="time"
                                value={ev.endTime}
                                disabled={ev.isAllDay}
                                onChange={(e) => updateEvent(ev.id, { endTime: e.target.value })}
                                className="w-full p-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium disabled:opacity-40 disabled:bg-stone-100 dark:disabled:bg-stone-900 focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Location */}
                        <div>
                          <label className="text-[10px] font-semibold text-stone-500 dark:text-stone-400 block mb-0.5">
                            Local / Endereço / Sala
                          </label>
                          <div className="relative">
                            <MapPin className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                            <input
                              type="text"
                              value={ev.location}
                              onChange={(e) => updateEvent(ev.id, { location: e.target.value })}
                              placeholder="Opcional (ex: Sala 12, Google Meet...)"
                              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => removeEvent(ev.id)}
                        className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition"
                        title="Remover evento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Footer of Card */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 dark:border-stone-800/80 text-[11px] text-stone-500 dark:text-stone-400 pl-1">
                      <label className="flex items-center gap-1.5 cursor-pointer font-medium select-none">
                        <input
                          type="checkbox"
                          checked={ev.isAllDay}
                          onChange={(e) => updateEvent(ev.id, { isAllDay: e.target.checked })}
                          className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span>Dia inteiro</span>
                      </label>

                      <div className="flex items-center gap-2">
                        <a
                          href={getGoogleCalendarWebUrl(ev)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                          title="Abrir diretamente na Agenda Google"
                        >
                          <span>Abrir na Agenda</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    {ev.originalLine && (
                      <div className="text-[10px] text-stone-400 truncate bg-stone-50 dark:bg-stone-950/60 p-1.5 rounded-lg font-mono">
                        <span className="font-semibold text-stone-500">Linha original:</span> {ev.originalLine}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* View Mode: SCHEDULE TIMELINE */}
        {viewMode === 'schedule' && (
          <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
            {sortedDates.length === 0 ? (
              <div className="text-center py-12 text-stone-400 text-xs italic">
                Nenhum evento na linha do tempo.
              </div>
            ) : (
              sortedDates.map((dateKey) => (
                <div key={dateKey} className="space-y-2">
                  <div className="sticky top-0 z-10 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xs py-1 flex items-center gap-2 border-b border-stone-100 dark:border-stone-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      📅 {dateKey}
                    </span>
                    <span className="text-[10px] text-stone-400">
                      ({eventsByDate[dateKey].length} evento(s))
                    </span>
                  </div>

                  <div className="space-y-2 pl-2">
                    {eventsByDate[dateKey].map((ev) => (
                      <div
                        key={ev.id}
                        className="p-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/40 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0"></div>
                          <div>
                            <p className="font-bold text-stone-900 dark:text-white">{ev.title}</p>
                            <p className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-2">
                              <span>{ev.isAllDay ? 'Dia inteiro' : `${ev.startTime} - ${ev.endTime}`}</span>
                              {ev.location && (
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="w-3 h-3 text-stone-400" />
                                  {ev.location}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <a
                          href={getGoogleCalendarWebUrl(ev)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-bold text-[11px] hover:underline flex items-center gap-1 shrink-0"
                        >
                          <span>Agenda ↗</span>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Action Bottom Bar */}
        <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Anti-duplicatas ativado: checagem em tempo real na sua agenda</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Fallback .ics */}
            <button
              type="button"
              onClick={handleDownloadIcs}
              disabled={selectedCount === 0}
              className="px-3.5 py-2.5 rounded-2xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold transition"
              title="Baixar arquivo de calendário .ics"
            >
              Baixar .ics
            </button>

            {/* Direct Connect & Sync Button */}
            <button
              type="button"
              onClick={handleInitiateDirectSync}
              disabled={selectedCount === 0}
              className="flex-1 sm:flex-initial px-6 py-3 rounded-2xl bg-[#1a73e8] hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs google-shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>
                {accessToken
                  ? `Gravar Direto na Agenda (${selectedCount})`
                  : 'Conectar & Gravar Direto'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        events={events.filter((e) => e.selected)}
        calendarName={selectedCalendarName}
        onConfirm={handleConfirmDirectSync}
        onCancel={() => setIsConfirmModalOpen(false)}
        isLoading={isSyncingDirect}
      />

      {/* Direct Sync Success Summary */}
      {directSyncResult && (
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-6 border-2 border-emerald-500 google-shadow-md space-y-4 transition">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-stone-900 dark:text-white">
                {directSyncResult.createdCount} evento(s) gravado(s) direto na sua conta Google!
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Os eventos já estão disponíveis no seu aplicativo e no Google Agenda online.
                {directSyncResult.skippedCount > 0 &&
                  ` (${directSyncResult.skippedCount} evento(s) duplicado(s) foram pulados).`}
              </p>
            </div>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto text-xs border-t border-stone-100 dark:border-stone-800 pt-3">
            {directSyncResult.created.map((it) => (
              <div
                key={it.id}
                className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200"
              >
                <div className="flex items-center gap-2 truncate">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-bold truncate">{it.title}</span>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">
                    ({it.date} {it.startTime ? `às ${it.startTime}` : '• Dia inteiro'})
                  </span>
                </div>
                {it.htmlLink && (
                  <a
                    href={it.htmlLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold shrink-0 ml-2"
                  >
                    Abrir Evento ↗
                  </a>
                )}
              </div>
            ))}

            {directSyncResult.skipped.map((sk, sIdx) => (
              <div
                key={sIdx}
                className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 text-xs"
              >
                <span className="truncate">⚠ {sk.title} ({sk.date}) - {sk.reason}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href="https://calendar.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-[#1a73e8] hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 google-shadow-sm"
            >
              <span>Abrir Google Agenda</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={() => setDirectSyncResult(null)}
              className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold transition"
            >
              Fechar Resumo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
