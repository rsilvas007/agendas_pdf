import { useState } from 'react';
import { ArrowLeft, Check, Copy, Download } from 'lucide-react';
import { APPS_SCRIPT_JSON, CODE_GS, INDEX_HTML_GAS } from '../gasTemplate';
import { downloadText } from '../services/google';

const FILES = [
  { name: 'Code.gs', content: CODE_GS },
  { name: 'Index.html', content: INDEX_HTML_GAS },
  { name: 'appsscript.json', content: APPS_SCRIPT_JSON },
];

const STEPS: Array<{ title: string; body: React.ReactNode }> = [
  {
    title: 'Crie o projeto',
    body: (
      <>
        Abra{' '}
        <a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-accent underline underline-offset-4">
          script.google.com
        </a>{' '}
        com a conta do seu Google Agenda, clique em <b>Novo projeto</b> e dê o nome <b>PDF para Agenda</b>.
      </>
    ),
  },
  {
    title: 'Cole o Code.gs',
    body: <>Apague o código que vem pronto no arquivo Code.gs e cole o conteúdo da aba Code.gs abaixo. Salve com Ctrl+S.</>,
  },
  {
    title: 'Crie o Index.html',
    body: <>Clique no + ao lado de Arquivos, escolha HTML e digite o nome Index. Apague o conteúdo padrão e cole a aba Index.html.</>,
  },
  {
    title: 'Ative a Drive API (para PDF escaneado)',
    body: <>Clique no + ao lado de Serviços, escolha Drive API, versão v2, com o identificador Drive, e clique em Adicionar.</>,
  },
  {
    title: 'Publique como app da Web',
    body: (
      <>
        Clique em <b>Implantar › Nova implantação</b>, escolha <b>App da Web</b>, deixe "Executar como: Eu" e "Quem tem acesso: Apenas eu"
        e clique em Implantar. Na tela "O Google não verificou este app", clique em Avançado e depois em Ir para PDF para Agenda. Isso
        aparece porque o script é seu e acabou de ser criado.
      </>
    ),
  },
  {
    title: 'Salve o link no celular',
    body: <>Abra o link que termina em /exec no celular e use "Adicionar à tela inicial".</>,
  },
];

export function AppsScriptView() {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const file = FILES[active];

  async function copy() {
    try {
      await navigator.clipboard.writeText(file.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-[780px] flex-col gap-8 px-4 py-8">
      <a href="#" className="flex w-fit items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar para o app
      </a>
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">Versão Apps Script</h1>
        <p className="max-w-[62ch] text-muted">
          Uma cópia do app que roda dentro da sua conta Google, no Google Apps Script. Ela também lê PDF escaneado (com o OCR do Google
          Drive) e não precisa de nenhuma configuração no Google Cloud. Leva uns 5 minutos.
        </p>
      </div>

      <ol className="flex flex-col gap-5">
        {STEPS.map((s, i) => (
          <li key={s.title} className="grid grid-cols-[2rem_1fr] gap-3">
            <span className="grid h-7 w-7 place-items-center rounded-full border border-line-strong font-mono text-sm tnum">{i + 1}</span>
            <div className="flex flex-col gap-0.5">
              <h2 className="font-semibold">{s.title}</h2>
              <p className="max-w-[64ch] text-[15px] text-muted">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <section aria-label="Arquivos" className="flex flex-col gap-0 overflow-hidden rounded-[var(--radius-ui)] border border-line">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-sunk px-2 py-1.5">
          <div role="tablist" className="flex flex-wrap gap-1">
            {FILES.map((f, i) => (
              <button
                key={f.name}
                role="tab"
                aria-selected={i === active}
                onClick={() => setActive(i)}
                className={`min-h-9 rounded-[var(--radius-ui)] px-3 font-mono text-sm ${i === active ? 'bg-paper text-ink' : 'text-muted hover:text-ink'}`}
              >
                {f.name}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <button type="button" onClick={copy} className="flex min-h-9 items-center gap-1.5 rounded-[var(--radius-ui)] px-3 text-sm font-medium hover:bg-paper">
              {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
            <button
              type="button"
              onClick={() => downloadText(file.name, file.content)}
              className="flex min-h-9 items-center gap-1.5 rounded-[var(--radius-ui)] px-3 text-sm font-medium hover:bg-paper"
            >
              <Download className="h-4 w-4" />
              Baixar
            </button>
          </div>
        </div>
        <pre className="max-h-[420px] overflow-auto bg-paper p-4 font-mono text-[12.5px] leading-relaxed text-ink">
          <code>{file.content}</code>
        </pre>
      </section>
    </main>
  );
}
