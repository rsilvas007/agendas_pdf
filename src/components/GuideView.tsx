import { ArrowLeft } from 'lucide-react';
import { REPO_URL } from '../config';

const Link = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer" className="font-semibold text-ink underline underline-offset-4">
    {children}
  </a>
);
const Code = ({ children }: { children: React.ReactNode }) => (
  <code className="rounded-[4px] bg-sunk px-1.5 py-0.5 font-mono text-[13.5px] text-ink">{children}</code>
);
const Seu = ({ children }: { children: React.ReactNode }) => <mark className="marca">{children}</mark>;

interface Parte {
  titulo: string;
  tempo: string;
  passos: React.ReactNode[];
  nota?: React.ReactNode;
}

const PARTES: Parte[] = [
  {
    titulo: 'Copie o projeto para a sua conta do GitHub',
    tempo: '2 min',
    passos: [
      <>
        Entre na sua conta do GitHub (ou crie uma em <Link href="https://github.com/signup">github.com/signup</Link>, é grátis).
      </>,
      <>
        Abra <Link href={REPO_URL}>{REPO_URL.replace('https://', '')}</Link> e clique em <b>Fork</b>, no canto de cima, e depois em{' '}
        <b>Create fork</b>. Pronto: a cópia agora é sua.
      </>,
    ],
    nota: (
      <>
        Prefere baixar a pasta? Clique em <b>Code › Download ZIP</b>, descompacte, crie um repositório público em{' '}
        <Link href="https://github.com/new">github.com/new</Link> e use <b>uploading an existing file</b> para arrastar todos os arquivos.
        Confira se a pasta <Code>.github</Code> foi junto: no Mac ela fica oculta no Finder (Cmd+Shift+. mostra) e sem ela o site não
        publica.
      </>
    ),
  },
  {
    titulo: 'Ligue o site no GitHub Pages',
    tempo: '1 min',
    passos: [
      <>
        No seu repositório, vá em <b>Settings › Pages</b> e, em <b>Source</b>, escolha <b>GitHub Actions</b>.
      </>,
      <>
        Abra a aba <b>Actions</b>. Se for um fork, clique em <b>I understand my workflows, go ahead and enable them</b>.
      </>,
    ],
  },
  {
    titulo: 'Crie o acesso ao Google Agenda no Google Cloud',
    tempo: '8 min',
    passos: [
      <>
        Abra <Link href="https://console.cloud.google.com/projectcreate">console.cloud.google.com</Link> com a sua conta Google e crie um
        projeto chamado <b>PDF para Agenda</b>.
      </>,
      <>
        Em <b>APIs e serviços › Biblioteca</b>, procure <b>Google Calendar API</b> e clique em <b>Ativar</b>.
      </>,
      <>
        Em <b>Google Auth Platform › Branding</b>, clique em <b>Começar</b>: dê o nome <b>PDF para Agenda</b>, escolha seu e-mail, marque o
        público <b>Externo</b>, informe seu e-mail de contato e conclua.
      </>,
      <>
        Em <b>Público-alvo › Usuários de teste</b>, clique em <b>Add users</b> e coloque o seu e-mail e o de cada pessoa que vai usar o app
        (até 100).
      </>,
      <>
        Em <b>Clientes › Criar cliente</b>, escolha <b>Aplicativo da Web</b>. Em <b>Origens JavaScript autorizadas</b>, adicione{' '}
        <Code>
          https://<Seu>seu-usuario</Seu>.github.io
        </Code>{' '}
        (só isso, sem o nome do repositório no final). Clique em <b>Criar</b> e copie o <b>ID do cliente</b>, que termina em{' '}
        <Code>.apps.googleusercontent.com</Code>.
      </>,
    ],
  },
  {
    titulo: 'Coloque o ID no GitHub e publique',
    tempo: '2 min',
    passos: [
      <>
        No repositório, vá em <b>Settings › Secrets and variables › Actions</b>, abra a aba <b>Variables</b> e clique em{' '}
        <b>New repository variable</b>.
      </>,
      <>
        Nome: <Code>VITE_GOOGLE_CLIENT_ID</Code>. Valor: o ID do cliente que você copiou. Salve.
      </>,
      <>
        Em <b>Actions › Publicar no GitHub Pages</b>, clique em <b>Run workflow</b>. Em uns 2 minutos aparece um ✓ verde.
      </>,
    ],
  },
  {
    titulo: 'Abra e conecte',
    tempo: '1 min',
    passos: [
      <>
        Abra{' '}
        <Code>
          https://<Seu>seu-usuario</Seu>.github.io/<Seu>agendas_pdf</Seu>/
        </Code>{' '}
        (o final é o nome do repositório).
      </>,
      <>
        Clique em <b>Conectar Google Agenda</b> e escolha sua conta. Na tela "O Google não verificou este app", clique em <b>Continuar</b>:
        o app é seu e está em modo de teste. Marque as permissões da agenda e confirme.
      </>,
      <>Salve o endereço nos favoritos ou use "Adicionar à tela inicial" no celular.</>,
    ],
  },
];

const PROBLEMAS: Array<[string, React.ReactNode]> = [
  ['Erro 400: origin_mismatch', <>O endereço da parte 3 está diferente do site. Confira se é só https://seu-usuario.github.io e espere uns 5 minutos.</>],
  ['Erro 403: access_denied', <>A conta não está em Usuários de teste (parte 3). Adicione o e-mail e tente de novo.</>],
  ['O app diz que falta o ID do Google', <>A variável da parte 4 não foi criada ou o workflow não rodou depois dela. Rode o workflow de novo.</>],
  ['A página dá 404', <>O Pages não foi ligado (parte 2) ou a publicação ainda está rodando. Veja a aba Actions.</>],
  ['Aviso de que a API do Google Agenda não está ativada', <>Falta o passo 2 da parte 3.</>],
];

export function GuideView() {
  return (
    <main className="mx-auto flex max-w-[780px] flex-col gap-9 px-4 py-8 sm:py-10">
      <a href="#" className="flex w-fit items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar para o app
      </a>
      <div className="flex flex-col gap-3">
        <h1 className="text-[30px] font-extrabold leading-[1.05] tracking-[-0.02em] sm:text-[40px]">Ter o meu próprio app</h1>
        <p className="max-w-[60ch] text-[17px] leading-relaxed text-muted">
          Em uns 15 minutos você tem uma cópia do PDF para Agenda no seu GitHub, ligada à sua conta Google. Não precisa programar nem pagar
          nada. Onde aparecer <Seu>seu-usuario</Seu>, use o seu nome de usuário do GitHub.
        </p>
      </div>

      <ol className="flex flex-col gap-8">
        {PARTES.map((p, i) => (
          <li key={p.titulo} className="grid grid-cols-[2.5rem_1fr] gap-x-4 gap-y-3">
            <span className="grid h-10 w-10 place-items-center rounded-[6px] bg-red text-[18px] font-extrabold text-red-ink tnum">{i + 1}</span>
            <div className="flex min-w-0 flex-col gap-3">
              <h2 className="pt-1.5 text-[21px] font-bold leading-tight tracking-tight">
                {p.titulo} <span className="whitespace-nowrap text-[15px] font-medium text-muted">· {p.tempo}</span>
              </h2>
              <ol className="flex flex-col gap-2.5 text-[16px] leading-relaxed">
                {p.passos.map((passo, j) => (
                  <li key={j} className="grid grid-cols-[1.25rem_1fr] gap-2">
                    <span className="text-muted tnum">{String.fromCharCode(97 + j)}.</span>
                    <span className="min-w-0 break-words">{passo}</span>
                  </li>
                ))}
              </ol>
              {p.nota && <p className="rounded-[6px] bg-sunk px-4 py-3 text-[15px] leading-relaxed text-muted">{p.nota}</p>}
            </div>
          </li>
        ))}
      </ol>

      <section aria-labelledby="titulo-problemas" className="flex flex-col gap-3 border-t border-line pt-6">
        <h2 id="titulo-problemas" className="text-[22px] font-bold tracking-tight">
          Se algo der errado
        </h2>
        <dl className="divide-y divide-line border-y border-line">
          {PROBLEMAS.map(([t, d]) => (
            <div key={t} className="grid gap-1 py-3 sm:grid-cols-[15rem_1fr] sm:gap-4">
              <dt className="font-semibold">{t}</dt>
              <dd className="text-muted">{d}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
