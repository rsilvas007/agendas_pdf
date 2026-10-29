import React, { useState } from 'react';
import { Sparkles, Code2, Check, X, ExternalLink, HelpCircle } from 'lucide-react';

interface StitchImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCustomHtml?: (html: string) => void;
}

export const StitchImportModal: React.FC<StitchImportModalProps> = ({
  isOpen,
  onClose,
  onApplyCustomHtml,
}) => {
  const [code, setCode] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const handleApply = () => {
    if (onApplyCustomHtml && code.trim()) {
      onApplyCustomHtml(code.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 google-shadow-lg p-6 space-y-5 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-900 dark:text-white">
                Importar Layout do Google Stitch
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Copie o código do Stitch (stitch.withgoogle.com) e cole aqui
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info box explaining how Stitch works */}
        <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold">
            <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Como obter o código no Stitch:</span>
          </div>
          <p className="leading-relaxed">
            Como os links de prévia do Stitch (<code className="font-mono text-[11px] bg-blue-100 dark:bg-blue-900/60 px-1 py-0.5 rounded">stitch.withgoogle.com</code>) ficam restritos à sua conta Google autenticada:
          </p>
          <ol className="list-decimal list-inside space-y-1 pt-1 text-[11px] text-blue-800 dark:text-blue-300">
            <li>No Stitch, abra o node desejado e clique no botão <strong>&ldquo;Export&rdquo;</strong> ou <strong>&ldquo;Copy code&rdquo;</strong> (canto superior direito).</li>
            <li>Cole o código HTML/Tailwind/JSX aqui embaixo e clique em <strong>&ldquo;Aplicar Layout&rdquo;</strong>.</li>
          </ol>
        </div>

        {/* Textarea */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block">
            Código HTML ou Componente do Stitch:
          </label>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={8}
            placeholder="Cole aqui o código copiado do Google Stitch..."
            className="w-full text-xs font-mono p-3 rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800">
          <a
            href="https://stitch.withgoogle.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>Ir para o Stitch</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleApply}
              disabled={!code.trim()}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white transition google-shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Aplicar Layout</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
