import React from 'react';
import { Calendar, Code2, BookOpen, Sparkles, Moon, Sun, LogIn, LogOut, CheckCircle2 } from 'lucide-react';
import { User } from 'firebase/auth';

interface HeaderProps {
  currentTab: 'app' | 'code' | 'tutorial';
  setCurrentTab: (tab: 'app' | 'code' | 'tutorial') => void;
  currentStep: 1 | 2 | 3;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  onOpenStitchModal?: () => void;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  currentStep,
  isDarkMode,
  setIsDarkMode,
  onOpenStitchModal,
  user,
  onLogin,
  onLogout,
  isLoggingIn,
}) => {
  return (
    <header className="border-b border-stone-200 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        
        {/* Left: Google Calendar Brand Icon & Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#1a73e8] to-[#0f9d58] flex items-center justify-center text-white shadow-md shadow-blue-500/20 ring-2 ring-blue-500/10">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-stone-900 dark:text-white flex items-center gap-2">
                  <span>PDF para Google Agenda</span>
                </h1>
                {user ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Conectado</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    Google Calendar API
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Grave direto na sua agenda oficial do Google sem salvar um a um
              </p>
            </div>
          </div>

          {/* Mobile Theme Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="md:hidden p-2 rounded-xl text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            aria-label="Alternar tema"
          >
            {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-stone-600" />}
          </button>
        </div>

        {/* Right: Nav Tabs, Stitch Button, Sign In & User Pill */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5">
          {/* Main Navigation Tabs */}
          <nav className="flex items-center bg-stone-100 dark:bg-stone-800/80 p-1 rounded-2xl text-xs font-semibold">
            <button
              onClick={() => setCurrentTab('app')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                currentTab === 'app'
                  ? 'bg-white dark:bg-stone-700 text-blue-600 dark:text-blue-300 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Painel</span>
            </button>
            <button
              onClick={() => setCurrentTab('code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                currentTab === 'code'
                  ? 'bg-white dark:bg-stone-700 text-emerald-600 dark:text-emerald-300 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Código Apps Script</span>
            </button>
            <button
              onClick={() => setCurrentTab('tutorial')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                currentTab === 'tutorial'
                  ? 'bg-white dark:bg-stone-700 text-purple-600 dark:text-purple-300 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Tutorial</span>
            </button>
          </nav>

          {/* Stitch Import Button */}
          {onOpenStitchModal && (
            <button
              onClick={onOpenStitchModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-200/80 dark:border-blue-800 transition"
              title="Importar código do Google Stitch"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Layout Stitch</span>
            </button>
          )}

          {/* User Sign-In / Account Badge */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-stone-200 dark:border-stone-800 text-xs">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Usuário'}
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-emerald-500/20"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <span className="block font-bold text-stone-800 dark:text-stone-200 leading-tight truncate max-w-[120px]">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
                <span className="block text-[10px] text-stone-400 truncate max-w-[120px]">
                  {user.email}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                title="Desconectar conta Google"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onLogin}
              disabled={isLoggingIn}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-750 text-stone-800 dark:text-stone-200 text-xs font-semibold google-shadow-sm transition disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              </svg>
              <span>{isLoggingIn ? 'Conectando...' : 'Conectar Google Agenda'}</span>
            </button>
          )}

          {/* Desktop Theme Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="hidden md:flex p-2 rounded-xl text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            title="Alternar tema"
          >
            {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-stone-600" />}
          </button>
        </div>

      </div>

      {/* Steps Pill Bar */}
      {currentTab === 'app' && (
        <div className="bg-stone-50/70 dark:bg-stone-950/60 border-t border-stone-200/60 dark:border-stone-800/80 px-4 py-1.5">
          <div className="max-w-7xl mx-auto flex items-center justify-center sm:justify-start gap-2 text-xs font-semibold">
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition ${
                currentStep === 1
                  ? 'bg-blue-600 text-white shadow-xs'
                  : currentStep > 1
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                  : 'bg-stone-200 dark:bg-stone-800 text-stone-500'
              }`}
            >
              <span className="w-3.5 h-3.5 rounded-full bg-black/15 dark:bg-white/15 flex items-center justify-center text-[10px]">1</span>
              <span>1 Carregar</span>
            </div>
            <div className={`w-4 h-0.5 ${currentStep >= 2 ? 'bg-blue-500' : 'bg-stone-300 dark:bg-stone-700'}`}></div>
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition ${
                currentStep === 2
                  ? 'bg-blue-600 text-white shadow-xs'
                  : currentStep > 2
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                  : 'bg-stone-200 dark:bg-stone-800 text-stone-500'
              }`}
            >
              <span className="w-3.5 h-3.5 rounded-full bg-black/15 dark:bg-white/15 flex items-center justify-center text-[10px]">2</span>
              <span>2 Revisar</span>
            </div>
            <div className={`w-4 h-0.5 ${currentStep >= 3 ? 'bg-blue-500' : 'bg-stone-300 dark:bg-stone-700'}`}></div>
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition ${
                currentStep === 3
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-stone-200 dark:bg-stone-800 text-stone-500'
              }`}
            >
              <span className="w-3.5 h-3.5 rounded-full bg-black/15 dark:bg-white/15 flex items-center justify-center text-[10px]">3</span>
              <span>3 Enviar</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
