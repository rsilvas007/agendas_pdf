import { Moon, Sun } from 'lucide-react';
import type { ConnectionStatus } from '../hooks/useGoogle';

interface Props {
  status: ConnectionStatus;
  account: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
}

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="h-6 w-6 shrink-0" aria-hidden="true">
      <rect x="3" y="5" width="26" height="24" rx="4" fill="var(--accent)" />
      <rect x="3" y="5" width="26" height="7" rx="3" fill="var(--accent-hover)" />
      <rect x="8" y="17" width="16" height="6" rx="1.5" fill="var(--mark)" />
    </svg>
  );
}

export function TopBar({ status, account, theme, onToggleTheme, onConnect, onDisconnect }: Props) {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-[780px] items-center justify-between gap-3 px-4 py-3">
        <a href="#" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight text-ink no-underline">
          <Logo />
          <span>PDF para Agenda</span>
        </a>
        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          {status === 'on' && (
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
              <span className="hidden truncate text-muted sm:inline" title={account}>
                {account || 'Conectado'}
              </span>
              <button
                type="button"
                onClick={onDisconnect}
                className="min-h-9 rounded-[var(--radius-ui)] px-2 text-muted hover:bg-sunk hover:text-ink"
              >
                Sair
              </button>
            </div>
          )}
          {status !== 'on' && (
            <button
              type="button"
              onClick={onConnect}
              disabled={status === 'connecting'}
              className="min-h-9 rounded-[var(--radius-ui)] border border-line-strong px-3 text-sm font-medium text-ink hover:bg-sunk disabled:opacity-60"
            >
              {status === 'connecting' ? (
                'Conectando…'
              ) : (
                <>
                  {status === 'expired' ? 'Reconectar' : 'Conectar'}
                  <span className="hidden sm:inline"> Google Agenda</span>
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
            className="grid h-9 w-9 place-items-center rounded-[var(--radius-ui)] text-muted hover:bg-sunk hover:text-ink"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
