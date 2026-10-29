import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEvents, SAMPLE_TEXT, addOneHour, safeEnd } from '../src/core/parser.js';

const REF = new Date(2026, 9, 29); // 29/10/2026
const rows = (t) => parseEvents(t, REF).map((e) => [e.title, e.date, e.endDate, e.startTime, e.endTime, e.location]);

test('texto de exemplo gera os 5 compromissos com títulos completos', () => {
  assert.deepEqual(rows(SAMPLE_TEXT), [
    ['Reunião pedagógica', '2026-11-05', '', '14:00', '15:00', 'Sala 12'],
    ['Entrega do projeto final', '2026-11-18', '', '', '', ''],
    ['Prova prática de Power BI', '2026-11-24', '', '08:00', '11:30', ''],
    ['Conselho de classe', '2026-12-03', '', '16:00', '18:00', ''],
    ['Encerramento do semestre', '2026-12-11', '', '', '', ''],
  ]);
});

test('números soltos não viram horário', () => {
  assert.deepEqual(rows('Aula 1 - 10/11 (seg) 19h às 22h'), [['Aula 1', '2026-11-10', '', '19:00', '22:00', '']]);
  assert.deepEqual(rows('Semana de 3 a 7 de novembro'), [['Semana', '2026-11-03', '2026-11-07', '', '', '']]);
});

test('horário perto da meia-noite não passa para o dia seguinte', () => {
  assert.deepEqual(rows('Prazo: até 30/11/2026 23:59'), [['Prazo', '2026-11-30', '', '23:59', '23:59', '']].map((r) => r));
  assert.equal(addOneHour('23:30'), '23:59');
  assert.equal(safeEnd('10:00', '09:00'), '11:00');
});

test('número de página não vira data', () => {
  assert.deepEqual(rows('Página 1/3'), []);
  assert.deepEqual(rows('pág. 2/10 do edital'), []);
});

test('listas e períodos de datas', () => {
  assert.deepEqual(rows('Visita técnica dia 20 e 21/11, das 9h às 12h'), [
    ['Visita técnica', '2026-11-20', '', '09:00', '12:00', ''],
    ['Visita técnica', '2026-11-21', '', '09:00', '12:00', ''],
  ]);
  assert.deepEqual(rows('Recesso de 22/12/2026 a 05/01/2027').map((r) => r.slice(0, 3)), [['Recesso', '2026-12-22', '2027-01-05']]);
  assert.equal(rows('Plantão 20, 21 e 22 de novembro').length, 3);
});

test('outros formatos', () => {
  assert.deepEqual(rows('Webinar 12.11.2026 - 19h30'), [['Webinar', '2026-11-12', '', '19:30', '20:30', '']]);
  assert.deepEqual(rows('Palestra 1º de março, às 9'), [['Palestra', '2027-03-01', '', '09:00', '10:00', '']]);
  assert.deepEqual(rows('Reunião com as famílias em 5 nov. entre 18 e 20h'), [['Reunião com as famílias', '2026-11-05', '', '18:00', '20:00', '']]);
  assert.deepEqual(rows('Feriado 15/11'), [['Feriado', '2026-11-15', '', '', '', '']]);
  assert.deepEqual(rows('31/02/2026 inválida'), []);
});

test('linha só com data usa o texto anterior como título', () => {
  assert.deepEqual(rows('Formatura da turma\n12/12/2026 às 19h\nLocal: Auditório'), [
    ['Formatura da turma', '2026-12-12', '', '19:00', '20:00', 'Auditório'],
  ]);
});

import { eventEnd, nextDay } from '../src/core/parser.js';
test('fim do evento cruza a meia-noite corretamente', () => {
  assert.deepEqual(eventEnd('2026-11-30', '', '23:59', '23:59'), { date: '2026-12-01', time: '00:59' });
  assert.deepEqual(eventEnd('2026-11-05', '', '14:00', '15:00'), { date: '2026-11-05', time: '15:00' });
  assert.deepEqual(eventEnd('2026-11-03', '2026-11-07', '09:00', '12:00'), { date: '2026-11-07', time: '12:00' });
  assert.equal(nextDay('2026-12-31'), '2027-01-01');
});
