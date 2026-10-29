import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { findHighlights } from '../core/parser.js';

interface Props {
  text: string;
  label: string;
}

// Texto lido do PDF, com datas e horários grifados.
export function SourceText({ text, label }: Props) {
  const [open, setOpen] = useState(true);
  const [onlyDates, setOnlyDates] = useState(false);

  const lines = useMemo(
    () =>
      text.split(/\r?\n/).map((line) => {
        const marks = findHighlights(line);
        return { line, marks };
      }),
    [text]
  );
  const withDates = lines.filter((l) => l.marks.some((m) => m.kind === 'date')).length;
  const shown = onlyDates ? lines.filter((l) => l.marks.length) : lines;

  return (
    <section aria-labelledby="titulo-texto" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <button
          type="button"
          id="titulo-texto"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-h-9 items-center gap-1.5 text-left text-[22px] font-bold tracking-tight"
        >
          <ChevronDown className={`h-5 w-5 transition-transform ${open ? '' : '-rotate-90'}`} aria-hidden="true" />
          {label}
        </button>
        {open && (
          <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm text-muted">
            <input id="so-linhas-com-data" type="checkbox" checked={onlyDates} onChange={(e) => setOnlyDates(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
            Só linhas com data ({withDates})
          </label>
        )}
      </div>
      {open && (
        <div className="max-h-64 overflow-auto rounded-[var(--radius-ui)] border border-line bg-sunk px-4 py-3 font-mono text-[13px] leading-[1.75]">
          {shown.map(({ line, marks }, i) => {
            if (!line) return <div key={i} className="h-3" aria-hidden="true" />;
            const out: React.ReactNode[] = [];
            let pos = 0;
            marks.forEach((m, j) => {
              if (m.start > pos) out.push(line.slice(pos, m.start));
              out.push(
                <mark key={j} className="marca">
                  {line.slice(m.start, m.end)}
                </mark>
              );
              pos = m.end;
            });
            out.push(line.slice(pos));
            return (
              <div key={i} className={`whitespace-pre-wrap break-words ${marks.length ? 'text-ink' : 'text-muted'}`}>
                {out}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
