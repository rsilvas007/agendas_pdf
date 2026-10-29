# PDF para Agenda

Envie um PDF (cronograma, edital, calendário escolar, convite), confira as datas encontradas e crie os compromissos direto no seu Google Agenda.

**App:** https://rsilvas007.github.io/agendas_pdf/

- O PDF é lido no navegador e não vai para nenhum servidor.
- Reconhece datas como `05/11/2026`, `24/11`, `18 de novembro`, `1º de março`, `2026-12-11`, listas (`20 e 21/11`) e períodos (`3 a 7 de novembro`).
- Reconhece horários como `14h`, `8h às 11h30`, `16:00 - 18:00` e `entre 18 e 20h`. Sem horário, o compromisso vira dia inteiro.
- Separa o local quando o texto traz `Local:`, `Onde:` ou `Endereço:`.
- Marca feriados nacionais em vermelho, como na folhinha.
- Mostra a sua agenda dos próximos 30 dias, atualizada a cada minuto, e não cria de novo o que já está nela.
- Sem conexão com o Google, dá para baixar um arquivo `.ics` e importar.
- Tem também uma [versão Apps Script](https://rsilvas007.github.io/agendas_pdf/#apps-script), que roda inteira dentro da sua conta Google e lê PDF escaneado com OCR.

---

## Ter o seu próprio app (15 minutos, sem programar)

O mesmo guia, com links, está em https://rsilvas007.github.io/agendas_pdf/#instalar.

Onde aparecer `SEU-USUARIO`, use o seu nome de usuário do GitHub.

### 1. Copie o projeto para a sua conta do GitHub (2 min)

1. Entre na sua conta do GitHub (ou crie uma em https://github.com/signup).
2. Abra este repositório e clique em **Fork** › **Create fork**.

**Prefere baixar a pasta?** Clique em **Code › Download ZIP**, descompacte, crie um repositório **público** em https://github.com/new e use **uploading an existing file** para arrastar todos os arquivos. Confira se a pasta `.github` foi junto. No Mac ela fica oculta no Finder (Cmd+Shift+. mostra), e sem ela o site não publica.

### 2. Ligue o site no GitHub Pages (1 min)

1. No seu repositório: **Settings › Pages › Source: GitHub Actions**.
2. Abra a aba **Actions**. Se for um fork, clique em **I understand my workflows, go ahead and enable them**.

### 3. Crie o acesso ao Google Agenda no Google Cloud (8 min)

1. Abra https://console.cloud.google.com/projectcreate e crie um projeto chamado **PDF para Agenda**.
2. Em **APIs e serviços › Biblioteca**, procure **Google Calendar API** e clique em **Ativar**.
3. Em **Google Auth Platform › Branding**, clique em **Começar**: nome **PDF para Agenda**, seu e-mail, público **Externo**, e-mail de contato, concluir.
4. Em **Público-alvo › Usuários de teste › Add users**, coloque o seu e-mail e o de cada pessoa que vai usar (até 100).
5. Em **Clientes › Criar cliente › Aplicativo da Web**, adicione em **Origens JavaScript autorizadas**:
   - `https://SEU-USUARIO.github.io` (sem o nome do repositório no final)
   - `http://localhost:3000` (só se for testar no seu computador)

   Clique em **Criar** e copie o **ID do cliente**, que termina em `.apps.googleusercontent.com`.

### 4. Coloque o ID no GitHub e publique (2 min)

1. No repositório: **Settings › Secrets and variables › Actions › aba Variables › New repository variable**.
2. Nome: `VITE_GOOGLE_CLIENT_ID`. Valor: o ID do cliente. Salve.
3. **Actions › Publicar no GitHub Pages › Run workflow**. Em uns 2 minutos aparece um ✓ verde.

### 5. Abra e conecte (1 min)

1. Abra `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/` (por exemplo, `https://maria.github.io/agendas_pdf/`).
2. Clique em **Conectar Google Agenda** e escolha a conta. Na tela "O Google não verificou este app", clique em **Continuar**: o app é seu e está em modo de teste. Marque as permissões da agenda.
3. Salve nos favoritos ou use "Adicionar à tela inicial" no celular.

### Se algo der errado

| O que aparece | O que fazer |
|---|---|
| `Erro 400: origin_mismatch` | O endereço do passo 3.5 está diferente do site. Use só `https://SEU-USUARIO.github.io` e espere uns 5 minutos. |
| `Erro 403: access_denied` | A conta não está em **Usuários de teste** (passo 3.4). |
| O app diz que falta o ID do Google | A variável do passo 4 não existe ou o workflow não rodou depois dela. Rode de novo. |
| A página dá 404 | O Pages não foi ligado (passo 2) ou a publicação ainda está rodando (aba **Actions**). |
| Aviso de que a API do Google Agenda não está ativada | Falta o passo 3.2. |

**Para abrir para qualquer pessoa** (sem a lista de usuários de teste), clique em **Público-alvo › Publicar app**. Como o app pede acesso de escrita na agenda, o Google mostra o aviso "app não verificado" até você pedir a verificação. Para uso pessoal, de família ou de uma turma, o modo de teste resolve.

---

## Como a conexão com o Google funciona

O app usa o [Google Identity Services](https://developers.google.com/identity/oauth2/web/guides/use-token-model), sem servidor:

- Na primeira vez, o Google pede permissão para ver e editar os eventos da agenda.
- O acesso vale por 1 hora e continua valendo se você recarregar a página.
- Depois disso, o botão vira **Reconectar** e a janela do Google abre e fecha sozinha, sem pedir permissão de novo. Se o acesso expirar no meio do uso, clicar em **Enviar** já reconecta.
- A agenda dos próximos 30 dias é atualizada a cada minuto, quando você volta para a aba e logo depois de cada envio.
- **Sair** revoga o acesso do app à sua conta.

## Design

A interface usa a linguagem da folhinha de parede brasileira (o calendário de destacar de padaria e farmácia): impressão em preto e vermelho, domingos e feriados em vermelho e números grandes. As datas encontradas no PDF aparecem grifadas com marca-texto, e o que já está na agenda ganha um carimbo. A fonte é a [Gabarito](https://fonts.google.com/specimen/Gabarito), da Naipe Foundry (Rio de Janeiro), criada para uma plataforma brasileira de preparação para o vestibular.

## Rodar no computador

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # testes do leitor de datas
npm run build    # gera a pasta dist/
```

## Estrutura

```
src/core/parser.js        leitor de datas (usado pelo app e embutido na versão Apps Script)
src/lib/feriados.ts       feriados nacionais (calculados para qualquer ano)
src/services/google.ts    login do Google, Calendar API e arquivo .ics
src/hooks/useGoogle.ts    estado da conexão e agenda ao vivo
src/lib/pdf.ts            leitura do PDF (pdf.js)
src/components/           telas
src/gasTemplate.ts        arquivos da versão Apps Script
tests/                    testes do leitor (node --test)
```
