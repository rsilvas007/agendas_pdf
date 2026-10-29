import React from 'react';
import { Calendar, AlertCircle, X, Check, Clock, MapPin } from 'lucide-react';
import { ParsedEvent } from '../types';

interface ConfirmationModalProps {
  isOpen: boolean;
  events: ParsedEvent[];
  calendarName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  events,
  calendarName,
  onConfirm,
  onCancel,
  isLoading,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 google-shadow-lg p-6 space-y-5 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-900 dark:text-white">
                Confirmar gravação no Google Agenda
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Os compromissos serão gravados diretamente na sua conta Google.
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="p-1 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Destination Info */}
        <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs flex items-center justify-between">
          <span className="text-stone-600 dark:text-stone-400">Agenda selecionada:</span>
          <span className="font-bold text-stone-900 dark:text-white">{calendarName}</span>
        </div>

        {/* Affected Events List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-stone-700 dark:text-stone-300">
              {events.length} evento(s) a serem criados:
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-2 pr-1 rounded-2xl border border-stone-200 dark:border-stone-800 p-2.5 bg-stone-50/50 dark:bg-stone-950/50">
            {events.map((ev, idx) => (
              <div
                key={ev.id || idx}
                className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 text-xs space-y-1"
              >
                <div className="font-bold text-stone-900 dark:text-white truncate">
                  {ev.title}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-500 dark:text-stone-400">
                  <span className="flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400">
                    <Calendar className="w-3 h-3" />
                    {ev.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-stone-400" />
                    {ev.isAllDay || !ev.startTime ? 'Dia inteiro' : `${ev.startTime} - ${ev.endTime}`}
                  </span>
                  {ev.location && (
                    <span className="flex items-center gap-1 truncate max-w-[140px]">
                      <MapPin className="w-3 h-3 text-stone-400" />
                      {ev.location}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notice */}
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Antes de gravar, verificaremos automaticamente se já existe algum evento com mesmo nome e horário na sua agenda para evitar duplicatas.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-100 dark:border-stone-800">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#1a73e8] hover:bg-blue-700 disabled:opacity-50 text-white transition google-shadow-sm flex items-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Gravando na Agenda...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Confirmar e Criar Eventos</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
