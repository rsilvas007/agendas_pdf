// Feriados nacionais do Brasil (e pontos facultativos de Carnaval e Corpus Christi).
// Calculados para qualquer ano, sem depender de internet.

export interface Feriado {
  nome: string;
  facultativo: boolean;
}

const FIXOS: Record<string, string> = {
  '01-01': 'Confraternização Universal',
  '04-21': 'Tiradentes',
  '05-01': 'Dia do Trabalho',
  '09-07': 'Independência do Brasil',
  '10-12': 'Nossa Senhora Aparecida',
  '11-02': 'Finados',
  '11-15': 'Proclamação da República',
  '11-20': 'Dia da Consciência Negra',
  '12-25': 'Natal',
};

// Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher).
function pascoa(ano: number) {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(ano, mes - 1, dia);
}

const cache = new Map<number, Map<string, Feriado>>();

function doAno(ano: number) {
  let mapa = cache.get(ano);
  if (mapa) return mapa;
  mapa = new Map();
  Object.entries(FIXOS).forEach(([md, nome]) => mapa!.set(`${ano}-${md}`, { nome, facultativo: false }));
  const p = pascoa(ano);
  const dia = (offset: number) => new Date(p + offset * 864e5).toISOString().slice(0, 10);
  mapa.set(dia(-48), { nome: 'Carnaval', facultativo: true });
  mapa.set(dia(-47), { nome: 'Carnaval', facultativo: true });
  mapa.set(dia(-2), { nome: 'Sexta-feira Santa', facultativo: false });
  mapa.set(dia(60), { nome: 'Corpus Christi', facultativo: true });
  cache.set(ano, mapa);
  return mapa;
}

export function feriado(data: string): Feriado | null {
  if (!data) return null;
  return doAno(Number(data.slice(0, 4))).get(data) || null;
}

export function proximoFeriado(desde: string): { data: string; feriado: Feriado } | null {
  const ano = Number(desde.slice(0, 4));
  const todos = [...doAno(ano).entries(), ...doAno(ano + 1).entries()]
    .filter(([d, f]) => d > desde && !f.facultativo)
    .sort(([a], [b]) => a.localeCompare(b));
  return todos[0] ? { data: todos[0][0], feriado: todos[0][1] } : null;
}
