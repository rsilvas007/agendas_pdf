import { useRef, useState } from 'react';
import { FileText, Loader2, Upload } from 'lucide-react';
import { plural } from '../lib/format';

export interface Source {
  name: string;
  pages: number;
  sample: boolean;
  pasted: boolean;
}

interface Props {
  source: Source | null;
  found: number;
  onText: (text: string, source: Source) => void;
}

const SAMPLE_PDF = `${import.meta.env.BASE_URL}exemplo-cronograma.pdf`;

export function PdfInput({ source, found, onText }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasted, setPasted] = useState('');

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      setError(`"${file.name}" não é um PDF. Escolha um arquivo terminado em .pdf.`);
      return;
    }
    setError('');
    setBusy('Abrindo o arquivo…');
    try {
      const { readPdfText } = await import('../lib/pdf');
      const { text, pages } = await readPdfText(file, (n, total) => setBusy(`Lendo página ${n} de ${total}…`));
      if (text.replace(/\s/g, '').length < 10) {
        setError(
          'Este PDF não tem texto para ler: parece uma imagem escaneada. Copie as datas para o campo "Colar texto" ou use a versão Apps Script, que faz OCR.'
        );
        return;
      }
      onText(text, { name: file.name, pages, sample: false, pasted: false });
    } catch (err) {
      setError((err as any)?.name === 'PdfReadError' ? (err as Error).message : 'Não foi possível ler este PDF.');
    } finally {
      setBusy('');
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function usePasted() {
    if (!pasted.trim()) return;
    onText(pasted, { name: 'Texto colado', pages: 0, sample: false, pasted: true });
    setPasteOpen(false);
  }

  const showCompact = source && !source.sample && !dragging && !busy;

  return (
    <section aria-label="Arquivo PDF" className="flex flex-col gap-3">
      <input
        ref={inputRef}
        id="arquivo-pdf"
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {showCompact ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[var(--radius-ui)] border border-line px-4 py-3">
          <FileText className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{source.name}</p>
            <p className="text-sm text-muted">
              {source.pages ? `${plural(source.pages, 'página', 'páginas')}, ` : ''}
              {found ? plural(found, 'data encontrada', 'datas encontradas') : 'nenhuma data encontrada'}
            </p>
          </div>
          <label
            htmlFor="arquivo-pdf"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
            className="min-h-9 cursor-pointer rounded-[var(--radius-ui)] border border-line-strong px-3 py-1.5 text-sm font-semibold text-ink hover:bg-sunk"
          >
            Trocar arquivo
          </label>
        </div>
      ) : (
        <label
          htmlFor="arquivo-pdf"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className={`flex cursor-pointer flex-col items-start gap-1 rounded-[var(--radius-ui)] border-[1.5px] border-dashed px-5 py-6 transition-colors sm:flex-row sm:items-center sm:gap-4 ${
            dragging ? 'border-red bg-red-soft' : 'border-line-strong hover:border-ink hover:bg-sunk'
          }`}
        >
          {busy ? (
            <Loader2 className="h-6 w-6 shrink-0 animate-spin text-accent" aria-hidden="true" />
          ) : (
            <Upload className="h-6 w-6 shrink-0 text-red" aria-hidden="true" />
          )}
          <span className="flex flex-col">
            <span className="text-[17px] font-semibold">{busy || (dragging ? 'Pode soltar' : 'Solte o PDF aqui ou clique para escolher')}</span>
            <span className="text-sm text-muted">O arquivo é lido no seu navegador. Ele não é enviado para nenhum servidor.</span>
          </span>
        </label>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <button type="button" onClick={() => setPasteOpen((v) => !v)} className="min-h-8 text-muted underline-offset-4 hover:text-ink hover:underline">
          {pasteOpen ? 'Fechar texto colado' : 'Colar texto em vez de PDF'}
        </button>
        <a href={SAMPLE_PDF} download className="min-h-8 leading-8 text-muted underline-offset-4 hover:text-ink hover:underline">
          Baixar um PDF de exemplo
        </a>
      </div>

      {pasteOpen && (
        <div className="flex flex-col gap-2">
          <label htmlFor="texto-colado" className="text-sm font-medium">
            Texto com as datas
          </label>
          <textarea
            id="texto-colado"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && usePasted()}
            rows={5}
            placeholder="Ex.: Reunião de pais 12/11 às 19h…"
            className="rounded-[var(--radius-ui)] border border-line-strong bg-paper px-3 py-2 font-mono text-sm"
          />
          <div>
            <button
              type="button"
              onClick={usePasted}
              disabled={!pasted.trim()}
              className="min-h-9 rounded-[var(--radius-ui)] bg-ink px-3 text-sm font-medium text-paper disabled:opacity-40"
            >
              Ler este texto
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-[var(--radius-ui)] bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
