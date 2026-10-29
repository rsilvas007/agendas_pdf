import React, { useState } from 'react';
import { Copy, Check, Download, FileCode, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { CODE_GS, INDEX_HTML_GAS, APPS_SCRIPT_JSON } from '../gasTemplate';
import { downloadFile } from '../utils/calendarExport';

export const GasFilesView: React.FC = () => {
  const [activeFile, setActiveFile] = useState<'code' | 'index' | 'manifest'>('code');
  const [copied, setCopied] = useState(false);

  const getFileContent = () => {
    switch (activeFile) {
      case 'code':
        return { name: 'Code.gs', content: CODE_GS, language: 'javascript' };
      case 'index':
        return { name: 'Index.html', content: INDEX_HTML_GAS, language: 'html' };
      case 'manifest':
        return { name: 'appsscript.json', content: APPS_SCRIPT_JSON, language: 'json' };
    }
  };

  const current = getFileContent();

  const handleCopy = () => {
    navigator.clipboard.writeText(current.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCurrent = () => {
    downloadFile(current.name, current.content, 'text/plain;charset=utf-8');
  };

  const handleDownloadAll = () => {
    downloadFile('Code.gs', CODE_GS, 'text/plain;charset=utf-8');
    setTimeout(() => {
      downloadFile('Index.html', INDEX_HTML_GAS, 'text/html;charset=utf-8');
    }, 200);
    setTimeout(() => {
      downloadFile('appsscript.json', APPS_SCRIPT_JSON, 'application/json;charset=utf-8');
    }, 400);
  };

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-md space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-200" />
          <span className="text-xs uppercase tracking-wider font-bold text-emerald-200">
            Arquivos Prontos para Google Apps Script
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
          Sua aplicação 100% gratuita na nuvem do Google
        </h2>
        <p className="text-xs sm:text-sm text-emerald-100 max-w-3xl leading-relaxed">
          Sem servidores externos, sem mensalidades e sem chaves de API pagas. Todo o processamento roda
          direto na sua própria conta Google com segurança e privacidade total.
        </p>

        <div className="pt-2 flex flex-wrap gap-2">
          <button
            onClick={handleDownloadAll}
            className="px-4 py-2.5 rounded-xl bg-white text-emerald-800 text-xs font-bold hover:bg-emerald-50 transition shadow-sm flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            <span>Baixar os 3 Arquivos</span>
          </button>
        </div>
      </div>

      {/* Code Viewer Box */}
      <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden transition">
        {/* Top File Switcher */}
        <div className="flex flex-wrap items-center justify-between border-b border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/60 p-3 sm:px-5 gap-3">
          {/* File Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => {
                setActiveFile('code');
                setCopied(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeFile === 'code'
                  ? 'bg-white dark:bg-stone-800 text-emerald-600 dark:text-emerald-400 shadow-xs border border-stone-200 dark:border-stone-700'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>1. Code.gs</span>
            </button>

            <button
              onClick={() => {
                setActiveFile('index');
                setCopied(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeFile === 'index'
                  ? 'bg-white dark:bg-stone-800 text-emerald-600 dark:text-emerald-400 shadow-xs border border-stone-200 dark:border-stone-700'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>2. Index.html</span>
            </button>

            <button
              onClick={() => {
                setActiveFile('manifest');
                setCopied(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeFile === 'manifest'
                  ? 'bg-white dark:bg-stone-800 text-emerald-600 dark:text-emerald-400 shadow-xs border border-stone-200 dark:border-stone-700'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>3. appsscript.json</span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar {current.name}</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadCurrent}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-semibold transition"
              title={`Baixar ${current.name}`}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Baixar</span>
            </button>
          </div>
        </div>

        {/* File description tag */}
        <div className="bg-stone-100/60 dark:bg-stone-900/30 px-5 py-2.5 text-xs text-stone-500 dark:text-stone-400 border-b border-stone-100 dark:border-stone-700/60 flex items-center justify-between">
          <span>
            {activeFile === 'code' &&
              'Servidor Apps Script: manipulador doGet, integração com CalendarApp, verificação anti-duplicados e OCR via Drive.'}
            {activeFile === 'index' &&
              'Interface Web: tela em 2 colunas, leitor PDF.js v3.11.174 agrupado por Y, fichas editáveis e comunicação client-server.'}
            {activeFile === 'manifest' &&
              'Manifesto de configuração: Fuso America/Sao_Paulo e ativação do serviço avançado do Google Drive (v2).'}
          </span>
          <span className="font-mono text-[11px] text-stone-400">{current.name}</span>
        </div>

        {/* Code Block */}
        <div className="relative">
          <pre className="p-4 sm:p-6 text-xs font-mono leading-relaxed overflow-x-auto max-h-[580px] bg-stone-900 text-stone-100 dark:bg-stone-950">
            <code>{current.content}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
