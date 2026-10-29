import { feriado } from '../lib/feriados';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const DIAS_LONGOS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

function partes(data: string) {
  const [y, m, d] = data.split('-').map(Number);
  return { y, m, d, wd: new Date(y, m - 1, d).getDay() };
}

// Dia em vermelho, como na folhinha: domingos e feriados.
export function diaVermelho(data: string) {
  if (!data) return false;
  const f = feriado(data);
  return partes(data).wd === 0 || (!!f && !f.facultativo);
}

interface Props {
  data: string;
  tamanho?: 'p' | 'g';
  mostrarAno?: boolean;
}

// Uma folha de calendário de destacar, com picote, faixa do mês e o número grande.
export function Folhinha({ data, tamanho = 'p', mostrarAno = false }: Props) {
  if (!data) {
    return (
      <div className="grid h-[64px] w-[52px] shrink-0 place-items-center rounded-[4px] border border-dashed border-line-strong text-xs text-muted">
        sem data
      </div>
    );
  }
  const { y, m, d, wd } = partes(data);
  const vermelho = diaVermelho(data);

  if (tamanho === 'g') {
    return (
      <div className="w-[150px] shrink-0 overflow-hidden rounded-[6px] border border-ink/80 bg-paper sm:w-[168px]" aria-hidden="true">
        <div className="bg-red px-3 pb-1.5 pt-0.5 text-center text-red-ink">
          <div className="picote h-2.5" />
          <div className="text-[15px] font-bold leading-tight">{MESES_LONGOS[m - 1]}</div>
          <div className="text-[12px] font-medium leading-tight opacity-90 tnum">{y}</div>
        </div>
        <div className={`pt-1 text-center text-[76px] font-black leading-[0.95] tracking-[-0.04em] tnum ${vermelho ? 'text-red' : 'text-ink'}`}>
          {d}
        </div>
        <div className={`pb-3 text-center text-[15px] font-semibold ${vermelho ? 'text-red' : 'text-ink'}`}>{DIAS_LONGOS[wd]}</div>
      </div>
    );
  }

  return (
    <div className="w-[52px] shrink-0 overflow-hidden rounded-[4px] border border-ink/70 bg-paper text-center" aria-hidden="true">
      <div className="bg-red py-px text-[11px] font-bold leading-4 text-red-ink">
        {MESES[m - 1]}
        {mostrarAno ? ` ${String(y).slice(2)}` : ''}
      </div>
      <div className={`text-[24px] font-extrabold leading-7 tracking-[-0.03em] tnum ${vermelho ? 'text-red' : 'text-ink'}`}>{d}</div>
      <div className={`pb-0.5 text-[11px] font-medium leading-4 ${vermelho ? 'text-red' : 'text-muted'}`}>{DIAS[wd]}</div>
    </div>
  );
}
