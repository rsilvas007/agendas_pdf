/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { TextVisualizer } from './components/TextVisualizer';
import { EventCards } from './components/EventCards';
import { GasFilesView } from './components/GasFilesView';
import { TutorialView } from './components/TutorialView';
import { StitchImportModal } from './components/StitchImportModal';
import { ParsedEvent } from './types';
import { parseEventsFromText, SAMPLE_TEST_TEXT } from './parser';
import { initAuth, googleSignIn, logout } from './services/googleAuth';
import { User } from 'firebase/auth';
import { Sparkles, Calendar, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'app' | 'code' | 'tutorial'>('app');
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [rawText, setRawText] = useState<string>('');
  const [filename, setFilename] = useState<string>('');
  const [events, setEvents] = useState<ParsedEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isStitchModalOpen, setIsStitchModalOpen] = useState<boolean>(false);
  const [customStitchSnippet, setCustomStitchSnippet] = useState<string | null>(null);

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Initialize auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
      }
    } catch (err: any) {
      console.error('Falha ao autenticar:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
  };

  // Sync dark mode class on <html>
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Handle new text parsed
  const handleTextLoaded = (text: string, name?: string) => {
    setRawText(text);
    if (name) setFilename(name);
    const parsed = parseEventsFromText(text);
    setEvents(parsed);
    setCurrentStep(2);
  };

  // Pre-populate with sample events on initial mount
  useEffect(() => {
    if (!rawText) {
      handleTextLoaded(SAMPLE_TEST_TEXT, 'exemplo_5_eventos.pdf');
    }
  }, []);

  const handleApplyStitchHtml = (html: string) => {
    setCustomStitchSnippet(html);
    const parsed = parseEventsFromText(html);
    if (parsed.length > 0) {
      setEvents(parsed);
      setRawText(html);
      setFilename('layout_stitch_importado.html');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors flex flex-col font-sans">
      {/* Header and Step Indicator */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentStep={currentStep}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        onOpenStitchModal={() => setIsStitchModalOpen(true)}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        isLoggingIn={isLoggingIn}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {currentTab === 'app' && (
          <div className="space-y-6">
            {/* Direct Google Calendar Connection Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 google-shadow-sm text-xs">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold ${
                    user
                      ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                      : 'bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400'
                  }`}
                >
                  {user ? <CheckCircle2 className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                </div>
                <div>
                  <span className="font-bold text-stone-900 dark:text-white flex items-center gap-2">
                    {user
                      ? `Conectado ao Google Agenda de ${user.displayName || user.email}`
                      : 'Conecte seu Google Agenda para gravação automática direta'}
                  </span>
                  <span className="text-stone-500 dark:text-stone-400 text-[11px]">
                    {user
                      ? 'Os eventos são gravados diretamente no seu Google Calendar via API oficial, com checagem anti-duplicados.'
                      : 'Clique em "Conectar Google Agenda" no topo ou no botão de gravação para autorizar o acesso.'}
                  </span>
                </div>
              </div>

              {!user && (
                <button
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="px-4 py-2 rounded-2xl bg-[#1a73e8] hover:bg-blue-700 text-white font-bold text-xs google-shadow-sm transition flex items-center gap-2 self-start sm:self-auto cursor-pointer"
                >
                  <span>{isLoggingIn ? 'Conectando...' : 'Conectar Agora'}</span>
                </button>
              )}
            </div>

            {/* If user imported raw Stitch HTML snippet */}
            {customStitchSnippet && (
              <div className="p-4 rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                <span>Layout personalizado importado do Google Stitch com sucesso!</span>
                <button
                  onClick={() => setCustomStitchSnippet(null)}
                  className="text-emerald-700 dark:text-emerald-300 font-bold hover:underline"
                >
                  Restaurar padrão
                </button>
              </div>
            )}

            {/* Two-column layout on Desktop, Single column on Mobile */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Upload + Highlighted Text */}
              <div className="lg:col-span-5 space-y-4">
                <FileUpload
                  onTextLoaded={handleTextLoaded}
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                />

                <TextVisualizer
                  rawText={rawText}
                  filename={filename}
                  events={events}
                />
              </div>

              {/* Right Column: Editable Event Cards + Direct Calendar API Integration */}
              <div className="lg:col-span-7">
                <EventCards
                  events={events}
                  setEvents={setEvents}
                  onAdvanceToStep3={() => setCurrentStep(3)}
                  user={user}
                  accessToken={accessToken}
                  onRequireLogin={handleLogin}
                />
              </div>
            </div>
          </div>
        )}

        {currentTab === 'code' && <GasFilesView />}

        {currentTab === 'tutorial' && <TutorialView />}
      </main>

      {/* Stitch Import Modal */}
      <StitchImportModal
        isOpen={isStitchModalOpen}
        onClose={() => setIsStitchModalOpen(false)}
        onApplyCustomHtml={handleApplyStitchHtml}
      />

      {/* Footer */}
      <footer className="border-t border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-900/60 py-4 px-6 text-center text-xs text-stone-500 dark:text-stone-400">
        <p>
          PDF para Google Agenda • Conexão direta com Google Calendar API v3 • Também disponível para Google Apps Script
        </p>
      </footer>
    </div>
  );
}
