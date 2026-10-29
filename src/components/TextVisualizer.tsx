import React from 'react';
import { FileText, Copy, Check, Eye } from 'lucide-react';
import { ParsedEvent } from '../types';

interface TextVisualizerProps {
  rawText: string;
  filename?: string;
  events: ParsedEvent[];
}

export const TextVisualizer: React.FC<TextVisualizerProps> = ({
  rawText,
  filename,
  events,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (!rawText) return;
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = rawText ? rawText.split(/\r?\n/) : [];

  // Function to render a line with matched date and time highlights in yellow
  const renderHighlightedLine = (line: string, index: number) => {
    if (!line.trim()) {
      return <div key={index} className="h-4" />;
    }

    // Find matched events associated with this line
    const relatedEvents = events.filter((e) => e.originalLine === line);

    if (relatedEvents.length === 0) {
      return (
        <div
          key={index}
          className="text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 py-0.5 px-1.5 rounded transition"
        >
          {line}
        </div>
      );
    }

    // We have matches in this line
    // Collect strings to highlight
    const substringsToHighlight: { str: string; type: 'date' | 'time' }[] = [];
    relatedEvents.forEach((ev) => {
      if (ev.matchedDateString && !substringsToHighlight.some((s) => s.str === ev.matchedDateString)) {
        substringsToHighlight.push({ str: ev.matchedDateString, type: 'date' });
      }
      if (ev.matchedTimeString && !substringsToHighlight.some((s) => s.str === ev.matchedTimeString)) {
        substringsToHighlight.push({ str: ev.matchedTimeString, type: 'time' });
      }
    });

    // Create segments by splitting
    let segments: { text: string; isHighlighted: boolean; type?: 'date' | 'time' }[] = [
      { text: line, isHighlighted: false },
    ];

    substringsToHighlight.forEach(({ str, type }) => {
      const newSegments: typeof segments = [];
      segments.forEach((seg) => {
        if (seg.isHighlighted) {
          newSegments.push(seg);
          return;
        }

        const parts = seg.text.split(str);
        parts.forEach((p, pIdx) => {
          if (p) newSegments.push({ text: p, isHighlighted: false });
          if (pIdx < parts.length - 1) {
            newSegments.push({ text: str, isHighlighted: true, type });
          }
        });
      });
      segments = newSegments;
    });

    return (
      <div
        key={index}
        className="py-1 px-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800/60 transition group flex items-start gap-2"
      >
        <span className="select-none text-[10px] text-stone-400 w-5 text-right shrink-0 pt-0.5">
          {index + 1}
        </span>
        <div className="flex-1">
          {segments.map((seg, sIdx) => {
            if (seg.isHighlighted) {
              return (
                <mark
                  key={sIdx}
                  className="bg-amber-200 dark:bg-amber-900/70 text-amber-950 dark:text-amber-100 font-semibold px-1 py-0.2 rounded inline-block shadow-xs border border-amber-300 dark:border-amber-700 mx-0.5"
                  title={seg.type === 'date' ? 'Data identificada' : 'Horário identificado'}
                >
                  {seg.text}
                </mark>
              );
            }
            return <span key={sIdx}>{seg.text}</span>;
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-stone-800 rounded-2xl p-5 border border-stone-200 dark:border-stone-700 shadow-sm space-y-3 transition">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-emerald-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Texto Extraído do Documento
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {rawText && (
            <button
              onClick={handleCopy}
              className="text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-stone-100 dark:hover:bg-stone-700 transition"
              title="Copiar texto lido"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar</span>
                </>
              )}
            </button>
          )}

          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
            {lines.length} {lines.length === 1 ? 'linha' : 'linhas'}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-900/50 p-2.5 rounded-xl border border-stone-200/60 dark:border-stone-700/60">
        <div className="flex items-center gap-2 truncate">
          <FileText className="w-4 h-4 text-stone-400 shrink-0" />
          <span className="truncate font-medium">{filename || 'Nenhum documento carregado'}</span>
        </div>
        <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium shrink-0 ml-2">
          🟡 Amarelo = datas/horários detectados
        </div>
      </div>

      {/* Lines View */}
      <div className="max-h-[380px] overflow-y-auto rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-900/50 p-3 font-mono text-xs leading-relaxed space-y-1">
        {rawText ? (
          lines.map((line, idx) => renderHighlightedLine(line, idx))
        ) : (
          <div className="text-center py-16 text-stone-400 text-xs italic">
            Nenhum documento carregado ainda.
            <br />
            Arraste um PDF ou clique em &ldquo;Carregar Exemplo&rdquo; acima.
          </div>
        )}
      </div>
    </div>
  );
};
