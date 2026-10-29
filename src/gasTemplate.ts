/**
 * Template code and configuration files for Google Apps Script deployment.
 * Completely free, runs inside the user's personal Google Account without external servers or paid APIs.
 */

import PARSER_SOURCE from './core/parser.js?raw';

// O leitor de datas do app web, sem os "export", para rodar dentro do Index.html.
const GAS_PARSER = PARSER_SOURCE.replace(/^export /gm, '');

export const CODE_GS = `/**
 * PDF para Google Agenda - Google Apps Script
 * Executado como: Eu (sua conta Google)
 * Acesso: Apenas Eu
 * Custo: Zero (100% gratuito)
 */

function doGet(e) {
  var template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate()
    .setTitle('PDF para Google Agenda')
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

/**
 * Retorna todas as agendas próprias do usuário
 */
function getUserCalendars() {
  try {
    var calendars = CalendarApp.getAllOwnedCalendars();
    var defaultCal = CalendarApp.getDefaultCalendar();
    var defaultId = defaultCal ? defaultCal.getId() : '';

    var result = calendars.map(function(cal) {
      return {
        id: cal.getId(),
        name: cal.getName(),
        isDefault: cal.getId() === defaultId,
        color: cal.getColor()
      };
    });

    if (result.length === 0 && defaultCal) {
      result.push({
        id: defaultCal.getId(),
        name: defaultCal.getName(),
        isDefault: true,
        color: defaultCal.getColor()
      });
    }

    return { success: true, calendars: result };
  } catch (err) {
    return { success: false, error: err.toString(), calendars: [] };
  }
}

/**
 * OCR para PDF escaneado (sem texto vetorial):
 * Utiliza o serviço avançado Drive API para converter temporariamente em Google Docs com OCR,
 * extrair o texto e remover o arquivo temporário.
 */
function extractTextWithOCR(base64Data, fileName) {
  try {
    var decoded = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decoded, 'application/pdf', fileName || 'temp_ocr.pdf');

    // Cria arquivo temporário no Google Drive com conversão OCR
    var fileMetadata = {
      title: 'TEMP_OCR_' + new Date().getTime(),
      mimeType: 'application/vnd.google-apps.document'
    };

    var tempFile = Drive.Files.insert(fileMetadata, blob, {
      ocr: true,
      ocrLanguage: 'pt'
    });

    // Abre o documento gerado e lê o texto
    var doc = DocumentApp.openById(tempFile.id);
    var text = doc.getBody().getText();

    // Apaga o arquivo temporário do Drive
    Drive.Files.remove(tempFile.id);

    return { success: true, text: text };
  } catch (err) {
    return {
      success: false,
      error: 'Erro no OCR via Drive API: ' + err.toString() + '. Verifique se o serviço avançado do Drive está ativado em Serviços (+).'
    };
  }
}

/**
 * Cria os eventos selecionados no Google Agenda
 * Verifica duplicados antes de criar (mesmo título e horário no mesmo dia).
 */
function createCalendarEvents(events, calendarId, timeZone) {
  try {
    timeZone = timeZone || 'America/Sao_Paulo';
    var calendar = calendarId ? CalendarApp.getCalendarById(calendarId) : CalendarApp.getDefaultCalendar();
    
    if (!calendar) {
      calendar = CalendarApp.getDefaultCalendar();
    }

    var created = [];
    var skipped = [];
    var errors = [];

    events.forEach(function(ev) {
      try {
        if (!ev.selected) return;

        // Parse date YYYY-MM-DD
        var parts = ev.date.split('-');
        var year = parseInt(parts[0], 10);
        var month = parseInt(parts[1], 10) - 1; // 0-indexed in JS
        var day = parseInt(parts[2], 10);

        var eventDate = new Date(year, month, day);

        // Busca eventos existentes no mesmo dia para evitar duplicatas
        var existingEvents = calendar.getEventsForDay(eventDate);
        var isDuplicate = false;

        var cleanTargetTitle = (ev.title || '').trim().toLowerCase();

        for (var i = 0; i < existingEvents.length; i++) {
          var exist = existingEvents[i];
          var existTitle = exist.getTitle().trim().toLowerCase();

          if (existTitle === cleanTargetTitle) {
            if (ev.isAllDay && exist.isAllDayEvent()) {
              isDuplicate = true;
              break;
            } else if (!ev.isAllDay && !exist.isAllDayEvent()) {
              var existStart = Utilities.formatDate(exist.getStartTime(), timeZone, 'HH:mm');
              if (existStart === ev.startTime) {
                isDuplicate = true;
                break;
              }
            }
          }
        }

        if (isDuplicate) {
          skipped.push({
            title: ev.title,
            date: ev.date,
            reason: 'Já existe um evento idêntico neste dia/horário'
          });
          return;
        }

        var description = 'Importado do PDF: ' + (ev.originalLine || ev.title);
        var options = {
          description: description,
          location: ev.location || ''
        };

        var createdEvent;

        var lastDay = eventDate;
        if (ev.endDate) {
          var ep = ev.endDate.split('-');
          lastDay = new Date(parseInt(ep[0], 10), parseInt(ep[1], 10) - 1, parseInt(ep[2], 10));
        }

        if (ev.isAllDay || !ev.startTime) {
          if (ev.endDate) {
            var afterLast = new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate() + 1);
            createdEvent = calendar.createAllDayEvent(ev.title, eventDate, afterLast, options);
          } else {
            createdEvent = calendar.createAllDayEvent(ev.title, eventDate, options);
          }
        } else {
          var startParts = ev.startTime.split(':');
          var startDateTime = new Date(year, month, day, parseInt(startParts[0], 10), parseInt(startParts[1], 10), 0);
          var endDateTime;
          if (ev.endTime) {
            var endParts = ev.endTime.split(':');
            endDateTime = new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate(), parseInt(endParts[0], 10), parseInt(endParts[1], 10), 0);
          }
          // Sem fim, ou fim antes do início: 1 hora depois (pode passar da meia-noite).
          if (!endDateTime || endDateTime <= startDateTime) {
            endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
          }
          createdEvent = calendar.createEvent(ev.title, startDateTime, endDateTime, options);
        }

        created.push({
          title: ev.title,
          date: ev.date,
          startTime: ev.startTime || '',
          endTime: ev.endTime || '',
          id: createdEvent.getId(),
          calendarName: calendar.getName()
        });

      } catch (e) {
        errors.push({
          title: ev.title,
          error: e.toString()
        });
      }
    });

    return {
      success: true,
      createdCount: created.length,
      skippedCount: skipped.length,
      errorsCount: errors.length,
      created: created,
      skipped: skipped,
      errors: errors
    };

  } catch (err) {
    return {
      success: false,
      error: err.toString()
    };
  }
}
`;

export const APPS_SCRIPT_JSON = `{
  "timeZone": "America/Sao_Paulo",
  "dependencies": {
    "enabledAdvancedServices": [
      {
        "userSymbol": "Drive",
        "serviceId": "drive",
        "version": "v2"
      }
    ]
  },
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "MYSELF"
  },
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8"
}`;

export const INDEX_HTML_GAS = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PDF para Google Agenda</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <script>
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
  </script>
  <style>
    .mark-highlight {
      background-color: #fef08a;
      color: #854d0e;
      padding: 0 4px;
      border-radius: 4px;
      font-weight: 600;
    }
    .dark .mark-highlight {
      background-color: #854d0e;
      color: #fef08a;
    }
  </style>
</head>
<body class="bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 min-h-screen p-4 sm:p-6 transition-colors">
  <div class="max-w-6xl mx-auto space-y-6">
    
    <!-- Top Header -->
    <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
      <div>
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-600 text-white font-bold text-lg shadow-sm">📅</span>
          <h1 class="text-2xl font-bold text-stone-900 dark:text-white">PDF para Google Agenda</h1>
        </div>
        <p class="text-sm text-stone-500 dark:text-stone-400 mt-1">Extraia datas de PDFs e envie direto para a sua agenda Google sem custos.</p>
      </div>

      <!-- Steps Indicator -->
      <div class="flex items-center gap-2 text-xs font-semibold">
        <div id="step-1-badge" class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 text-white">
          <span>1</span> Carregar
        </div>
        <div class="w-4 h-0.5 bg-stone-300 dark:bg-stone-700"></div>
        <div id="step-2-badge" class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
          <span>2</span> Revisar
        </div>
        <div class="w-4 h-0.5 bg-stone-300 dark:bg-stone-700"></div>
        <div id="step-3-badge" class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
          <span>3</span> Enviar
        </div>
      </div>
    </header>

    <!-- Main 2-Column Grid on Desktop -->
    <main class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      <!-- Left Column: Upload, Extract & Highlighted Text -->
      <section class="lg:col-span-5 space-y-4">
        <!-- Upload Card -->
        <div class="bg-white dark:bg-stone-800 rounded-2xl p-5 border border-stone-200 dark:border-stone-700 shadow-sm space-y-4">
          <h2 class="text-sm font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">1. Entrada de Arquivo ou Texto</h2>
          
          <!-- Drop Area -->
          <div id="drop-zone" class="border-2 border-dashed border-emerald-500/40 hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer transition bg-emerald-50/30 dark:bg-emerald-950/20">
            <input type="file" id="file-input" accept="application/pdf" class="hidden" />
            <div class="space-y-2">
              <span class="text-3xl">📄</span>
              <p class="text-sm font-medium text-stone-800 dark:text-stone-200">Arraste seu arquivo PDF aqui ou <span class="text-emerald-600 font-bold underline">clique para escolher</span></p>
              <p class="text-xs text-stone-500">Documentos escolares, editais, horários, boletos, escalas</p>
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex flex-wrap gap-2">
            <button id="btn-sample" type="button" class="text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:hover:bg-emerald-800 text-emerald-800 dark:text-emerald-200 transition">
              ✨ Carregar Exemplo (5 eventos)
            </button>
            <button id="btn-toggle-manual" type="button" class="text-xs font-semibold px-3 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 transition">
              ✏️ Colar Texto Manualmente
            </button>
          </div>

          <!-- Manual Text Box (Hidden by default) -->
          <div id="manual-box" class="hidden space-y-2">
            <textarea id="manual-text" rows="5" placeholder="Cole aqui o texto contendo datas e compromissos..." class="w-full text-xs font-mono p-3 rounded-lg border border-stone-300 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"></textarea>
            <button id="btn-process-manual" type="button" class="w-full text-xs font-bold py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition">
              Processar Texto Colado
            </button>
          </div>

          <!-- OCR Status / Loading indicator -->
          <div id="loading-bar" class="hidden flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-medium">
            <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
            <span id="loading-text">Processando PDF...</span>
          </div>
        </div>

        <!-- Highlighted Text Preview -->
        <div class="bg-white dark:bg-stone-800 rounded-2xl p-5 border border-stone-200 dark:border-stone-700 shadow-sm space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Texto Lido do Documento</h2>
            <span id="line-count" class="text-xs text-stone-400">0 linhas</span>
          </div>
          <p class="text-xs text-stone-500">Trechos de datas e horários reconhecidos ficam destacados em <span class="mark-highlight">amarelo</span>.</p>
          <div id="preview-container" class="max-h-80 overflow-y-auto p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-xs font-mono leading-relaxed space-y-1.5 whitespace-pre-wrap">
            <span class="text-stone-400 italic">Nenhum documento carregado ainda. Envie um PDF ou use o botão de exemplo acima.</span>
          </div>
        </div>
      </section>

      <!-- Right Column: Event Cards, Calendar Config & Sync -->
      <section class="lg:col-span-7 space-y-4">
        
        <!-- Calendar Selection & Config -->
        <div class="bg-white dark:bg-stone-800 rounded-2xl p-5 border border-stone-200 dark:border-stone-700 shadow-sm space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 class="text-sm font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">2. Destino no Google Agenda</h2>
            <button id="btn-add-manual-card" type="button" class="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 self-start sm:self-auto">
              ➕ Adicionar Compromisso Manual
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">Selecionar Agenda:</label>
              <select id="calendar-select" class="w-full text-xs p-2.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-100 font-medium focus:ring-2 focus:ring-emerald-500">
                <option value="">Carregando agendas...</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">Fuso Horário:</label>
              <select id="timezone-select" class="w-full text-xs p-2.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-100 font-medium focus:ring-2 focus:ring-emerald-500">
                <option value="America/Sao_Paulo" selected>Brasília (America/Sao_Paulo)</option>
                <option value="America/Manaus">Manaus (America/Manaus)</option>
                <option value="America/Belem">Belém (America/Belem)</option>
                <option value="America/Fortaleza">Fortaleza (America/Fortaleza)</option>
                <option value="America/Recife">Recife (America/Recife)</option>
                <option value="America/Cuiaba">Cuiabá (America/Cuiaba)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Event Cards Container -->
        <div class="bg-white dark:bg-stone-800 rounded-2xl p-5 border border-stone-200 dark:border-stone-700 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b border-stone-100 dark:border-stone-700/60 pb-3">
            <div class="flex items-center gap-2">
              <input type="checkbox" id="check-all" checked class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer">
              <label for="check-all" class="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300 cursor-pointer">
                Selecionar Todos (<span id="selected-count">0</span>/<span id="total-count">0</span>)
              </label>
            </div>
            <span id="detected-tag" class="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
              0 encontrados
            </span>
          </div>

          <!-- Cards list -->
          <div id="cards-container" class="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            <div class="text-center py-12 text-stone-400 text-xs italic">
              Nenhum compromisso detectado ainda. Carregue um documento para ver as fichas aqui.
            </div>
          </div>

          <!-- Action bar -->
          <div class="pt-3 border-t border-stone-100 dark:border-stone-700 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span class="text-xs text-stone-500 dark:text-stone-400">Anti-duplicatas ativado: eventos iguais não são recriados.</span>
            <button id="btn-send-calendar" type="button" disabled class="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2">
              <span>🚀</span> Enviar para o Google Agenda
            </button>
          </div>
        </div>

        <!-- Result Summary Box -->
        <div id="result-box" class="hidden bg-white dark:bg-stone-800 rounded-2xl p-5 border-2 border-emerald-500 shadow-md space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center text-xl font-bold">
              ✓
            </div>
            <div>
              <h3 id="result-title" class="font-bold text-base text-stone-900 dark:text-white">Eventos criados com sucesso!</h3>
              <p id="result-subtitle" class="text-xs text-stone-500 dark:text-stone-400">Seus compromissos já estão no Google Agenda.</p>
            </div>
          </div>

          <div id="result-details" class="space-y-2 max-h-48 overflow-y-auto text-xs font-medium border-t border-stone-200 dark:border-stone-700 pt-3">
          </div>

          <div class="flex flex-wrap items-center gap-3 pt-2">
            <a href="https://calendar.google.com" target="_blank" class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm">
              Abrir Google Agenda ↗
            </a>
            <button id="btn-reset" type="button" class="px-4 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-semibold transition">
              Carregar Novo Arquivo
            </button>
          </div>
        </div>

      </section>

    </main>
  </div>

  <script>
    // State
    var state = {
      rawText: '',
      events: [],
      calendars: []
    };

    // Leitor de datas: cópia de src/core/parser.js (mesmo código do app web)
${GAS_PARSER}

    // Render Preview with highlights
    function renderPreview(text, events) {
      var container = document.getElementById('preview-container');
      if (!text) {
        container.innerHTML = '<span class="text-stone-400 italic">Nenhum documento carregado ainda.</span>';
        document.getElementById('line-count').innerText = '0 linhas';
        return;
      }

      var lines = text.split(/\\r?\\n/);
      document.getElementById('line-count').innerText = lines.length + ' linhas';

      var html = lines.map(function(line) {
        var highlighted = escapeHtml(line);
        // Highlight dates
        events.forEach(function(ev) {
          if (ev.matchedDate && highlighted.includes(escapeHtml(ev.matchedDate))) {
            highlighted = highlighted.split(escapeHtml(ev.matchedDate)).join('<mark class="mark-highlight">' + escapeHtml(ev.matchedDate) + '</mark>');
          }
          if (ev.matchedTime && highlighted.includes(escapeHtml(ev.matchedTime))) {
            highlighted = highlighted.split(escapeHtml(ev.matchedTime)).join('<mark class="mark-highlight">' + escapeHtml(ev.matchedTime) + '</mark>');
          }
        });
        return '<div class="hover:bg-stone-100 dark:hover:bg-stone-800/80 p-0.5 rounded transition">' + highlighted + '</div>';
      }).join('');

      container.innerHTML = html;
    }

    function escapeHtml(str) {
      return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // Render Cards
    function renderCards() {
      var container = document.getElementById('cards-container');
      var total = state.events.length;
      var selected = state.events.filter(function(e) { return e.selected; }).length;

      document.getElementById('total-count').innerText = total;
      document.getElementById('selected-count').innerText = selected;
      document.getElementById('detected-tag').innerText = total + ' encontrados';
      document.getElementById('btn-send-calendar').disabled = selected === 0;

      if (total === 0) {
        container.innerHTML = '<div class="text-center py-12 text-stone-400 text-xs italic">Nenhum compromisso detectado. Tente enviar outro arquivo ou cole o texto.</div>';
        return;
      }

      container.innerHTML = state.events.map(function(ev, index) {
        return '<div class="p-3.5 rounded-xl border ' + (ev.selected ? 'border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/10' : 'border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/40 opacity-70') + ' space-y-2.5 transition">' +
          '<div class="flex items-start gap-2.5">' +
            '<input type="checkbox" data-index="' + index + '" class="event-checkbox mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer" ' + (ev.selected ? 'checked' : '') + '>' +
            '<div class="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2">' +
              '<div class="sm:col-span-12">' +
                '<input type="text" data-field="title" data-index="' + index + '" value="' + escapeHtml(ev.title) + '" class="card-input w-full text-xs font-bold p-1.5 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 focus:ring-1 focus:ring-emerald-500" placeholder="Título do evento">' +
              '</div>' +
              '<div class="sm:col-span-4">' +
                '<label class="text-[10px] text-stone-500 font-semibold block">Data</label>' +
                '<input type="date" data-field="date" data-index="' + index + '" value="' + ev.date + '" class="card-input w-full text-xs p-1.5 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800">' +
              '</div>' +
              '<div class="sm:col-span-4 flex items-center gap-1">' +
                '<div class="flex-1">' +
                  '<label class="text-[10px] text-stone-500 font-semibold block">Início</label>' +
                  '<input type="time" data-field="startTime" data-index="' + index + '" value="' + ev.startTime + '" class="card-input w-full text-xs p-1.5 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800" ' + (ev.isAllDay ? 'disabled' : '') + '>' +
                '</div>' +
                '<div class="flex-1">' +
                  '<label class="text-[10px] text-stone-500 font-semibold block">Fim</label>' +
                  '<input type="time" data-field="endTime" data-index="' + index + '" value="' + ev.endTime + '" class="card-input w-full text-xs p-1.5 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800" ' + (ev.isAllDay ? 'disabled' : '') + '>' +
                '</div>' +
              '</div>' +
              '<div class="sm:col-span-4">' +
                '<label class="text-[10px] text-stone-500 font-semibold block">Local / Sala</label>' +
                '<input type="text" data-field="location" data-index="' + index + '" value="' + escapeHtml(ev.location) + '" class="card-input w-full text-xs p-1.5 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800" placeholder="Opcional">' +
              '</div>' +
            '</div>' +
            '<button type="button" data-delete="' + index + '" class="btn-delete text-stone-400 hover:text-red-500 p-1 text-sm transition" title="Remover evento">🗑️</button>' +
          '</div>' +
          '<div class="flex items-center justify-between text-[11px] text-stone-400 px-1">' +
            '<label class="flex items-center gap-1.5 cursor-pointer">' +
              '<input type="checkbox" data-field="isAllDay" data-index="' + index + '" ' + (ev.isAllDay ? 'checked' : '') + ' class="card-toggle w-3.5 h-3.5 rounded text-emerald-600">' +
              '<span>Dia inteiro</span>' +
            '</label>' +
            '<span class="truncate max-w-[200px]" title="' + escapeHtml(ev.originalLine) + '">Origem: ' + escapeHtml(ev.originalLine || 'Manual') + '</span>' +
          '</div>' +
        '</div>';
      }).join('');

      bindCardEvents();
    }

    function bindCardEvents() {
      document.querySelectorAll('.event-checkbox').forEach(function(cb) {
        cb.addEventListener('change', function(e) {
          var idx = parseInt(e.target.dataset.index, 10);
          state.events[idx].selected = e.target.checked;
          renderCards();
        });
      });

      document.querySelectorAll('.btn-delete').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          var idx = parseInt(e.currentTarget.dataset.delete, 10);
          state.events.splice(idx, 1);
          renderCards();
          renderPreview(state.rawText, state.events);
        });
      });

      document.querySelectorAll('.card-input').forEach(function(input) {
        input.addEventListener('input', function(e) {
          var idx = parseInt(e.target.dataset.index, 10);
          var field = e.target.dataset.field;
          state.events[idx][field] = e.target.value;
        });
      });

      document.querySelectorAll('.card-toggle').forEach(function(tg) {
        tg.addEventListener('change', function(e) {
          var idx = parseInt(e.target.dataset.index, 10);
          state.events[idx].isAllDay = e.target.checked;
          if (e.target.checked) {
            state.events[idx].startTime = '';
            state.events[idx].endTime = '';
          } else {
            state.events[idx].startTime = '09:00';
            state.events[idx].endTime = '10:00';
          }
          renderCards();
        });
      });
    }

    // PDF extraction with pdf.js grouping by Y coordinate
    async function extractPdfText(file) {
      showLoading('Lendo texto do arquivo PDF...');
      var arrayBuffer = await file.arrayBuffer();
      var pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      var fullLines = [];

      for (var pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        var page = await pdf.getPage(pageNum);
        var content = await page.getTextContent();
        
        // Group items by vertical position (Y)
        var lineMap = {};
        content.items.forEach(function(item) {
          var y = Math.round(item.transform[5]);
          if (!lineMap[y]) lineMap[y] = [];
          lineMap[y].push(item);
        });

        // Sort descending by Y (top of page down)
        var yKeys = Object.keys(lineMap).map(Number).sort(function(a, b) { return b - a; });
        yKeys.forEach(function(y) {
          // Sort items horizontally (X)
          lineMap[y].sort(function(a, b) { return a.transform[4] - b.transform[4]; });
          var lineText = lineMap[y].map(function(item) { return item.str; }).join(' ').trim();
          if (lineText) fullLines.push(lineText);
        });
      }

      var text = fullLines.join('\\n').trim();

      // If PDF has no text (scanned PDF), trigger OCR fallback via server
      if (!text || text.length < 10) {
        showLoading('PDF sem texto direto detectado. Acionando OCR avançado no Google Drive...');
        var base64 = await fileToBase64(file);
        google.script.run
          .withSuccessHandler(function(res) {
            hideLoading();
            if (res.success && res.text) {
              processExtractedText(res.text);
            } else {
              alert('Erro no OCR: ' + (res.error || 'Nenhum texto encontrado no PDF escaneado.'));
            }
          })
          .withFailureHandler(function(err) {
            hideLoading();
            alert('Falha ao acionar OCR: ' + err.toString());
          })
          .extractTextWithOCR(base64, file.name);
      } else {
        hideLoading();
        processExtractedText(text);
      }
    }

    function fileToBase64(file) {
      return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = function() {
          var res = reader.result;
          var base64 = res.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    function processExtractedText(text) {
      state.rawText = text;
      state.events = parseEvents(text);
      renderPreview(text, state.events);
      renderCards();
      
      // Update step badge
      document.getElementById('step-1-badge').className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200';
      document.getElementById('step-2-badge').className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 text-white shadow-sm';
    }

    function showLoading(msg) {
      document.getElementById('loading-bar').classList.remove('hidden');
      document.getElementById('loading-text').innerText = msg;
    }

    function hideLoading() {
      document.getElementById('loading-bar').classList.add('hidden');
    }

    // Init & Listeners
    window.addEventListener('DOMContentLoaded', function() {
      // Load Google calendars
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(function(res) {
            if (res && res.success && res.calendars) {
              state.calendars = res.calendars;
              var sel = document.getElementById('calendar-select');
              sel.innerHTML = res.calendars.map(function(c) {
                return '<option value="' + c.id + '" ' + (c.isDefault ? 'selected' : '') + '>' + escapeHtml(c.name) + (c.isDefault ? ' (Padrão)' : '') + '</option>';
              }).join('');
            }
          })
          .getUserCalendars();
      } else {
        // Fallback for preview mode
        var sel = document.getElementById('calendar-select');
        sel.innerHTML = '<option value="primary">Agenda Principal</option>';
      }

      // Drag and drop
      var dropZone = document.getElementById('drop-zone');
      var fileInput = document.getElementById('file-input');

      dropZone.addEventListener('click', function() { fileInput.click(); });
      fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) extractPdfText(e.target.files[0]);
      });

      ['dragenter', 'dragover'].forEach(function(ev) {
        dropZone.addEventListener(ev, function(e) {
          e.preventDefault();
          dropZone.classList.add('border-emerald-600', 'bg-emerald-100/40');
        });
      });
      ['dragleave', 'drop'].forEach(function(ev) {
        dropZone.addEventListener(ev, function(e) {
          e.preventDefault();
          dropZone.classList.remove('border-emerald-600', 'bg-emerald-100/40');
        });
      });

      dropZone.addEventListener('drop', function(e) {
        if (e.dataTransfer.files.length > 0) {
          var f = e.dataTransfer.files[0];
          if (f.type === 'application/pdf') {
            extractPdfText(f);
          } else {
            alert('Por favor, selecione um arquivo em formato PDF.');
          }
        }
      });

      // Sample button (5 items from prompt)
      document.getElementById('btn-sample').addEventListener('click', function() {
        var sampleText = "Reunião pedagógica: 05/11/2026 às 14h – Local: Sala 12\\n" +
          "Entrega do projeto final 18 de novembro de 2026\\n" +
          "Prova prática de Power BI — 24/11 das 8h às 11h30\\n" +
          "Conselho de classe, quinta-feira, 3 de dezembro, 16:00 - 18:00\\n" +
          "Encerramento do semestre 2026-12-11";
        processExtractedText(sampleText);
      });

      // Toggle Manual Text
      document.getElementById('btn-toggle-manual').addEventListener('click', function() {
        var box = document.getElementById('manual-box');
        box.classList.toggle('hidden');
      });

      document.getElementById('btn-process-manual').addEventListener('click', function() {
        var txt = document.getElementById('manual-text').value;
        if (txt.trim()) {
          processExtractedText(txt);
        } else {
          alert('Digite ou cole algum texto antes de processar.');
        }
      });

      // Select All Checkbox
      document.getElementById('check-all').addEventListener('change', function(e) {
        var val = e.target.checked;
        state.events.forEach(function(ev) { ev.selected = val; });
        renderCards();
      });

      // Add manual card
      document.getElementById('btn-add-manual-card').addEventListener('click', function() {
        var today = new Date().toISOString().split('T')[0];
        state.events.unshift({
          id: 'manual_' + Date.now(),
          selected: true,
          title: 'Novo Compromisso',
          date: today,
          startTime: '10:00',
          endTime: '11:00',
          isAllDay: false,
          location: '',
          originalLine: 'Adicionado manualmente'
        });
        renderCards();
      });

      // Send to Google Calendar
      document.getElementById('btn-send-calendar').addEventListener('click', function() {
        var selectedEvents = state.events.filter(function(e) { return e.selected; });
        if (selectedEvents.length === 0) {
          alert('Selecione pelo menos um compromisso para enviar.');
          return;
        }

        var calId = document.getElementById('calendar-select').value;
        var tz = document.getElementById('timezone-select').value;

        showLoading('Gravando compromissos no Google Agenda...');

        if (typeof google !== 'undefined' && google.script && google.script.run) {
          google.script.run
            .withSuccessHandler(function(res) {
              hideLoading();
              if (res.success) {
                showResults(res);
              } else {
                alert('Erro ao criar eventos: ' + res.error);
              }
            })
            .withFailureHandler(function(err) {
              hideLoading();
              alert('Falha na comunicação com o Google Agenda: ' + err.toString());
            })
            .createCalendarEvents(selectedEvents, calId, tz);
        } else {
          // Preview mode simulation
          setTimeout(function() {
            hideLoading();
            showResults({
              success: true,
              createdCount: selectedEvents.length,
              skippedCount: 0,
              errorsCount: 0,
              created: selectedEvents.map(function(s) {
                return { title: s.title, date: s.date, startTime: s.startTime };
              }),
              skipped: []
            });
          }, 800);
        }
      });

      // Reset
      document.getElementById('btn-reset').addEventListener('click', function() {
        state.rawText = '';
        state.events = [];
        renderPreview('', []);
        renderCards();
        document.getElementById('result-box').classList.add('hidden');
        document.getElementById('step-1-badge').className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 text-white';
        document.getElementById('step-2-badge').className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400';
        document.getElementById('step-3-badge').className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400';
      });
    });

    function showResults(res) {
      document.getElementById('step-3-badge').className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 text-white shadow-sm';
      var box = document.getElementById('result-box');
      box.classList.remove('hidden');

      document.getElementById('result-title').innerText = res.createdCount + ' compromisso(s) adicionado(s) com sucesso!';
      document.getElementById('result-subtitle').innerText = res.skippedCount > 0 ? (res.skippedCount + ' pulado(s) por já existirem no mesmo dia.') : 'Todos os eventos foram gravados na sua agenda.';

      var details = document.getElementById('result-details');
      var html = '';

      if (res.created && res.created.length > 0) {
        html += '<div class="font-bold text-stone-700 dark:text-stone-300">Eventos adicionados:</div>';
        res.created.forEach(function(c) {
          html += '<div class="text-emerald-700 dark:text-emerald-400 flex items-center justify-between"><span>✓ ' + escapeHtml(c.title) + ' (' + c.date + (c.startTime ? ' às ' + c.startTime : '') + ')</span></div>';
        });
      }

      if (res.skipped && res.skipped.length > 0) {
        html += '<div class="font-bold text-amber-700 dark:text-amber-400 mt-2">Eventos duplicados ignorados:</div>';
        res.skipped.forEach(function(s) {
          html += '<div class="text-stone-500">⚠ ' + escapeHtml(s.title) + ' - ' + escapeHtml(s.reason) + '</div>';
        });
      }

      details.innerHTML = html;
      box.scrollIntoView({ behavior: 'smooth' });
    }
  </script>
</body>
</html>`;

