import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Sparkles, Edit3, AlertTriangle, Loader2 } from 'lucide-react';
import { SAMPLE_TEST_TEXT } from '../parser';

interface FileUploadProps {
  onTextLoaded: (text: string, filename?: string) => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
}

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onTextLoaded,
  isLoading,
  setIsLoading,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualText, setManualText] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processPdfFile = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Por favor, envie um arquivo com extensão .pdf válido.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    setStatusMessage('Lendo páginas do arquivo PDF...');

    try {
      if (!window.pdfjsLib) {
        throw new Error('A biblioteca PDF.js ainda está carregando. Tente novamente em alguns segundos.');
      }

      const arrayBuffer = await file.arrayBuffer();
      
      let pdfDoc;
      try {
        pdfDoc = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      } catch (err: any) {
        if (err.name === 'PasswordException') {
          throw new Error('PDF protegido por senha. Remova a senha antes de enviar.');
        }
        throw err;
      }

      const fullLines: string[] = [];

      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        setStatusMessage(`Processando página ${pageNum} de ${pdfDoc.numPages}...`);
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Group text tokens by vertical position (Y coordinate)
        // Rounded to 2pt threshold to group items on same line
        const lineMap: Record<number, any[]> = {};

        textContent.items.forEach((item: any) => {
          if (!item.str || item.str.trim() === '') return;
          // transform[5] is the Y coordinate
          const y = Math.round(item.transform[5] / 3) * 3;
          if (!lineMap[y]) {
            lineMap[y] = [];
          }
          lineMap[y].push(item);
        });

        // Sort descending by Y (top of the page down)
        const yKeys = Object.keys(lineMap)
          .map(Number)
          .sort((a, b) => b - a);

        yKeys.forEach((y) => {
          // Sort items horizontally by X (transform[4])
          lineMap[y].sort((a, b) => a.transform[4] - b.transform[4]);
          const lineText = lineMap[y].map((item) => item.str).join(' ').trim();
          if (lineText) {
            fullLines.push(lineText);
          }
        });
      }

      const extractedText = fullLines.join('\n').trim();

      if (!extractedText || extractedText.length < 10) {
        setErrorMessage(
          'PDF escaneado detectado (sem texto vetorial selecionável). Na versão do Google Apps Script instalada, este arquivo passará pelo OCR automático da Drive API. No navegador, você pode usar o campo "Colar Texto Manualmente" abaixo para testar.'
        );
        setIsLoading(false);
        setStatusMessage(null);
        return;
      }

      setStatusMessage(null);
      setIsLoading(false);
      onTextLoaded(extractedText, file.name);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Erro ao processar o arquivo PDF.');
      setIsLoading(false);
      setStatusMessage(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processPdfFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processPdfFile(e.target.files[0]);
    }
  };

  const loadSample = () => {
    setErrorMessage(null);
    onTextLoaded(SAMPLE_TEST_TEXT, 'exemplo_5_eventos.pdf');
  };

  const handleManualSubmit = () => {
    if (!manualText.trim()) {
      setErrorMessage('Digite ou cole algum texto com datas para processar.');
      return;
    }
    setErrorMessage(null);
    onTextLoaded(manualText.trim(), 'texto_colado.txt');
  };

  return (
    <div className="bg-white dark:bg-stone-800 rounded-2xl p-5 border border-stone-200 dark:border-stone-700 shadow-sm space-y-4 transition">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-emerald-600" />
          <span>1. Carregar Documento</span>
        </h2>
        <span className="text-[11px] text-stone-400">PDF ou Texto</span>
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
          isDragging
            ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 ring-4 ring-emerald-500/10'
            : 'border-stone-300 dark:border-stone-700 hover:border-emerald-500 bg-stone-50/50 dark:bg-stone-900/40'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="application/pdf"
          className="hidden"
        />

        <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
          <UploadCloud className="w-6 h-6" />
        </div>

        <div>
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">
            Arraste seu PDF aqui ou <span className="text-emerald-600 dark:text-emerald-400 underline underline-offset-2">escolha no computador</span>
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Extrai automaticamente agrupando por linhas de texto (coordenada Y)
          </p>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          <span>{statusMessage || 'Processando arquivo...'}</span>
        </div>
      )}

      {/* Error alert */}
      {errorMessage && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMessage}</div>
        </div>
      )}

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={loadSample}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-100/80 hover:bg-emerald-200/80 dark:bg-emerald-900/40 dark:hover:bg-emerald-800/60 text-emerald-800 dark:text-emerald-200 text-xs font-semibold transition shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Carregar Exemplo (5 eventos de teste)</span>
        </button>

        <button
          type="button"
          onClick={() => setManualOpen(!manualOpen)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-700/80 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-300 text-xs font-semibold transition"
        >
          <Edit3 className="w-3.5 h-3.5 text-stone-500" />
          <span>{manualOpen ? 'Ocultar Campo de Texto' : 'Colar Texto Manualmente'}</span>
        </button>
      </div>

      {/* Manual Input Collapsible */}
      {manualOpen && (
        <div className="space-y-2.5 pt-2 border-t border-stone-100 dark:border-stone-700">
          <label className="block text-xs font-medium text-stone-600 dark:text-stone-300">
            Cole abaixo qualquer trecho ou circular com datas e horários:
          </label>
          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            rows={4}
            placeholder="Exemplo: Prova de Matemática 14/11 das 8h às 10h na Sala 04..."
            className="w-full text-xs font-mono p-3 rounded-xl border border-stone-300 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
          />
          <button
            type="button"
            onClick={handleManualSubmit}
            className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
          >
            Processar Texto
          </button>
        </div>
      )}
    </div>
  );
};
