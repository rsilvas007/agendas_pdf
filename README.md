# PDF para Agenda

Envie um PDF (cronograma, edital, calendário escolar, convite), confira as datas encontradas e crie os compromissos direto no seu Google Agenda.

**App:** https://rsilvas007.github.io/agendas_pdf/

- O PDF é lido no navegador e não vai para nenhum servidor.
- Reconhece datas como `05/11/2026`, `24/11`, `18 de novembro`, `1º de março`, `2026-12-11`, listas (`20 e 21/11`) e períodos (`3 a 7 de novembro`).
- Reconhece horários como `14h`, `8h às 11h30`, `16:00 - 18:00` e `entre 18 e 20h`. Sem horário, o compromisso vira dia inteiro.
- Separa o local quando o texto traz `Local:`, `Onde:` ou `Endereço:`.
- Mostra a sua agenda dos próximos 30 dias, atualizada a cada minuto, e marca o que já está nela para não criar duplicados.
- Sem conexão com o Google, dá para baixar um arquivo `.ics` e importar.
- Tem também uma [versão Apps Script](https://rsilvas007.github.io/agendas_pdf/#apps-script), que roda inteira dentro da sua conta Google e lê PDF escaneado com OCR.

## Colocar no ar (uma vez só)

### 1. Ativar o GitHub Pages

No repositório: **Settings › Pages › Build and deployment › Source: GitHub Actions**.

A cada push na branch `main`, o workflow `Publicar no GitHub Pages` testa, compila e publica o app. Para publicar na hora, rode o workflow em **Actions › Publicar no GitHub Pages › Run workflow**.

### 2. Liberar o endereço no Google Cloud

O login do Google só funciona em endereços autorizados.

1. Abra o [Google Cloud Console](https://console.cloud.google.com/apis/credentials) no projeto do cliente OAuth. Hoje é o projeto `gen-lang-client-0950898619`, criado pelo AI Studio.
2. Em **APIs e serviços › Credenciais**, abra o cliente OAuth do tipo **Aplicativo da Web**. O ID dele termina em `...brvjc09j4vq4e9pgodr5uu6cc75dvqki.apps.googleusercontent.com`.
3. Em **Origens JavaScript autorizadas**, adicione:
   - `https://rsilvas007.github.io`
   - `http://localhost:3000` (para testar no seu computador)
4. Salve. A mudança pode levar alguns minutos para valer.
5. Em **APIs e serviços › Biblioteca**, confira se a **Google Calendar API** está ativada.

Se aparecer `Erro 400: origin_mismatch` na janela do Google, o passo 3 ainda não pegou.

### 3. Quem pode entrar

Em **APIs e serviços › Tela de permissão OAuth** (ou **Google Auth Platform › Público-alvo**):

- No modo **Teste**, só entram os e-mails da lista de **Usuários de teste** (até 100). Adicione o seu e os de quem for usar.
- Para qualquer pessoa entrar, clique em **Publicar app**. O acesso de escrita na agenda é uma permissão sensível, então o Google mostra o aviso "app não verificado" até você pedir a verificação. Para uso pessoal ou de uma turma, o modo Teste resolve.

### Usar outro cliente OAuth (opcional)

Crie a variável **Settings › Secrets and variables › Actions › Variables › `VITE_GOOGLE_CLIENT_ID`** com o ID do novo cliente e rode o workflow de novo. No computador, coloque o ID em um arquivo `.env` (veja `.env.example`).

## Como a conexão com o Google funciona

O app usa o [Google Identity Services](https://developers.google.com/identity/oauth2/web/guides/use-token-model), sem servidor:

- Na primeira vez, o Google pede permissão para ver e editar os eventos da agenda.
- O acesso vale por 1 hora e continua valendo se você recarregar a página.
- Depois disso, o botão vira **Reconectar** e a janela do Google abre e fecha sozinha, sem pedir permissão de novo. Se o acesso expirar no meio do uso, clicar em **Enviar** já reconecta antes de enviar.
- A agenda dos próximos 30 dias é atualizada a cada minuto, quando você volta para a aba e logo depois de cada envio.
- **Sair** revoga o acesso do app à sua conta.

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
src/services/google.ts    login do Google, Calendar API e arquivo .ics
src/hooks/useGoogle.ts    estado da conexão e agenda ao vivo
src/lib/pdf.ts            leitura do PDF (pdf.js)
src/components/           telas
src/gasTemplate.ts        arquivos da versão Apps Script
tests/                    testes do leitor (node --test)
```
