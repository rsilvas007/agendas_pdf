import React, { useState } from 'react';
import {
  CheckCircle,
  ExternalLink,
  Smartphone,
  ShieldAlert,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';

export const TutorialView: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title Header */}
      <div className="text-center space-y-2 pb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
          Guia Passo a Passo para Iniciantes
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-white">
          Como Publicar seu Próprio App no Google Apps Script
        </h2>
        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 max-w-2xl mx-auto">
          Leva apenas 3 minutos. Não precisa saber programar: basta copiar e colar os arquivos na sua conta Google!
        </p>
      </div>

      {/* Steps List */}
      <div className="space-y-4">
        
        {/* Step 1 */}
        <div className="bg-white dark:bg-stone-800 rounded-2xl p-5 sm:p-6 border border-stone-200 dark:border-stone-700 shadow-sm space-y-3">
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow-sm">
              1
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="text-base font-bold text-stone-900 dark:text-white">
                Abrir o Google Apps Script e Criar Novo Projeto
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                Acesse o painel oficial de scripts da Google com sua conta logada:
              </p>
              <div className="flex items-center gap-2 pt-1">
                <a
                  href="https://script.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
                >
                  <span>Acessar script.google.com</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <ul className="text-xs text-stone-500 dark:text-stone-400 list-disc list-inside space-y-1 pt-1">
                <li>Clique no botão azul <strong>&ldquo;Novo projeto&rdquo;</strong> no canto superior esquerdo.</li>
                <li>Clique no título que diz <em>&ldquo;Projeto sem título&rdquo;</em> e mude para <strong>PDF para Google Agenda</strong>.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-white dark:bg-stone-800 rounded-2xl p-5 sm:p-6 border border-stone-200 dark:border-stone-700 shadow-sm space-y-3">
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow-sm">
              2
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="text-base font-bold text-stone-900 dark:text-white">
                Colar o código no arquivo <code className="text-emerald-600 font-mono">Code.gs</code>
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                No editor do Google Apps Script, já existe um arquivo chamado <code className="font-mono text-emerald-600">Code.gs</code>.
              </p>
              <ul className="text-xs text-stone-500 dark:text-stone-400 list-disc list-inside space-y-1">
                <li>Apague qualquer conteúdo padrão que estiver lá (como <code className="font-mono">function myFunction()</code>).</li>
                <li>Vá até a aba <strong>&ldquo;Arquivos Apps Script&rdquo;</strong> desta nossa aplicação, copie todo o conteúdo de <strong>Code.gs</strong> e cole no editor da Google.</li>
                <li>Pressione <strong>Ctrl + S</strong> (ou Command + S no Mac) para salvar.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-white dark:bg-stone-800 rounded-2xl p-5 sm:p-6 border border-stone-200 dark:border-stone-700 shadow-sm space-y-3">
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow-sm">
              3
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="text-base font-bold text-stone-900 dark:text-white">
                Criar o arquivo HTML chamado <code className="text-emerald-600 font-mono">Index.html</code>
              </h3>
              <ul className="text-xs text-stone-500 dark:text-stone-400 list-disc list-inside space-y-1">
                <li>No menu lateral esquerdo do Apps Script, clique no botão <strong>+</strong> ao lado de <em>Arquivos</em>.</li>
                <li>Selecione a opção <strong>HTML</strong>.</li>
                <li>Digite exatamente o nome <strong>Index</strong> e dê Enter (o sistema adiciona .html automaticamente).</li>
                <li>Apague o código padrão, cole o conteúdo da aba <strong>Index.html</strong> desta aplicação e salve (<strong>Ctrl + S</strong>).</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="bg-white dark:bg-stone-800 rounded-2xl p-5 sm:p-6 border border-stone-200 dark:border-stone-700 shadow-sm space-y-3">
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow-sm">
              4
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="text-base font-bold text-stone-900 dark:text-white">
                Ativar o Serviço Avançado Drive API (para OCR gratuito de PDFs escaneados)
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                Isso permite ao seu script ler até mesmo documentos escaneados ou fotos de folhas sem custos:
              </p>
              <ul className="text-xs text-stone-500 dark:text-stone-400 list-disc list-inside space-y-1">
                <li>No menu lateral esquerdo, clique no botão <strong>+</strong> ao lado de <strong>Serviços</strong>.</li>
                <li>Procure por <strong>Drive API</strong> na lista.</li>
                <li>Selecione a versão <strong>v2</strong> e certifique-se de que o Identificador é <strong>Drive</strong>.</li>
                <li>Clique em <strong>Adicionar</strong>.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Step 5 */}
        <div className="bg-white dark:bg-stone-800 rounded-2xl p-5 sm:p-6 border border-stone-200 dark:border-stone-700 shadow-sm space-y-3">
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow-sm">
              5
            </div>
            <div className="flex-1 space-y-3">
              <h3 className="text-base font-bold text-stone-900 dark:text-white">
                Implantar como &ldquo;App da Web&rdquo; e Autorizar Permissões
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                No topo direito do Apps Script, clique em <strong>Implantar</strong> &rarr; <strong>Nova implantação</strong>:
              </p>
              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-700 text-xs space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-stone-700 dark:text-stone-300">Tipo de implantação:</span>
                  <span className="font-mono bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded">App da Web</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-stone-700 dark:text-stone-300">Executar como:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">Eu (seu email Google)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-stone-700 dark:text-stone-300">Quem tem acesso:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">Somente eu</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Aviso de Permissões da Google (Totalmente Normal):</span>
                </div>
                <p>
                  Como o script foi criado por você, a Google exibirá uma tela de segurança dizendo <em>&ldquo;O Google não verificou este app&rdquo;</em>.
                  Basta clicar em <strong>&ldquo;Avançado&rdquo;</strong> (canto inferior esquerdo) e depois em <strong>&ldquo;Ir para PDF para Google Agenda (não seguro)&rdquo;</strong> e clicar em <strong>&ldquo;Permitir&rdquo;</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Step 6 */}
        <div className="bg-white dark:bg-stone-800 rounded-2xl p-5 sm:p-6 border border-stone-200 dark:border-stone-700 shadow-sm space-y-3">
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow-sm">
              6
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <span>Salvar o Link e Adicionar na Tela Inicial do Celular</span>
                <Smartphone className="w-4 h-4 text-emerald-600" />
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                Ao concluir a implantação, a Google exibirá o link do seu App da Web (termina em <code className="font-mono text-emerald-600">/exec</code>).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div className="p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/40 space-y-1">
                  <span className="font-bold text-stone-800 dark:text-stone-200 block">No Android (Google Chrome):</span>
                  <p className="text-stone-500 dark:text-stone-400">
                    Abra o link, toque no menu de 3 pontinhos e escolha <strong>&ldquo;Adicionar à tela inicial&rdquo;</strong> ou <strong>&ldquo;Instalar aplicativo&rdquo;</strong>.
                  </p>
                </div>
                <div className="p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/40 space-y-1">
                  <span className="font-bold text-stone-800 dark:text-stone-200 block">No iPhone / iPad (Safari):</span>
                  <p className="text-stone-500 dark:text-stone-400">
                    Abra o link, toque no botão de <strong>Compartilhar</strong> (quadradinho com seta) e escolha <strong>&ldquo;Adicionar à Tela de Início&rdquo;</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* FAQ / Troubleshooting Section */}
      <div className="bg-white dark:bg-stone-800 rounded-2xl p-6 border border-stone-200 dark:border-stone-700 shadow-sm space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-emerald-600" />
          <span>Perguntas Frequentes & Resolução de Dúvidas</span>
        </h3>

        <div className="space-y-2 text-xs">
          {[
            {
              q: 'O aplicativo tem algum custo escondido ou limite?',
              a: 'Não. Ele utiliza 100% dos recursos gratuitos já inclusos em qualquer conta Google (CalendarApp, Drive API v2 e HtmlService). Você não precisa cadastrar cartão de crédito nem pagar nada.',
            },
            {
              q: 'Outras pessoas terão acesso à minha agenda ou aos meus PDFs?',
              a: 'Não! Na configuração de implantação, você define "Quem tem acesso: Somente eu". Dessa forma, apenas você autenticado no seu navegador consegue acessar o link e criar compromissos.',
            },
            {
              q: 'E se o PDF for uma foto ou folha escaneada?',
              a: 'O script detecta que o PDF não possui texto selecionável e automaticamente envia para o OCR nativo do Google Drive (serviço avançado Drive API). Ele converte a imagem em texto e extrai as datas.',
            },
            {
              q: 'Como o script lida com datas sem o ano especificado (ex: "24/11" ou "3 de dezembro")?',
              a: 'Ele utiliza a regra inteligente: se a data estiver dentro do ano atual ou nos últimos 60 dias, assume o ano atual. Se for uma data que já passou há mais de 60 dias, assume automaticamente o próximo ano.',
            },
            {
              q: 'O que acontece se eu enviar o mesmo PDF duas vezes?',
              a: 'O script conta com proteção inteligente anti-duplicados (getEventsForDay). Antes de gravar, ele verifica se já existe um evento com o mesmo título e horário naquele dia e pula para não poluir sua agenda.',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden transition"
            >
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full p-3.5 text-left font-bold text-stone-800 dark:text-stone-200 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-700/50 transition"
              >
                <span>{item.q}</span>
                {openFaq === idx ? (
                  <ChevronUp className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-stone-400 shrink-0" />
                )}
              </button>
              {openFaq === idx && (
                <div className="px-3.5 pb-3.5 text-stone-600 dark:text-stone-400 leading-relaxed border-t border-stone-100 dark:border-stone-700/60 pt-2 bg-stone-50/50 dark:bg-stone-900/30">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
