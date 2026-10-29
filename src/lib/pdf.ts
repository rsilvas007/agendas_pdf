import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export class PdfReadError extends Error {
  name = 'PdfReadError';
}

interface Piece {
  x: number;
  y: number;
  w: number;
  h: number;
  s: string;
}

// Junta os pedaços de texto de uma página em linhas, na ordem de leitura.
// Pedaços colados (sem espaço entre eles) são unidos sem espaço, para não
// quebrar palavras como "Reuni ão".
function pageToLines(items: any[]): string[] {
  const pieces: Piece[] = items
    .filter((it) => typeof it.str === 'string' && it.str.length > 0)
    .map((it) => ({
      x: it.transform[4],
      y: it.transform[5],
      w: it.width || 0,
      h: Math.abs(it.transform[3]) || it.height || 10,
      s: it.str,
    }));
  pieces.sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: Piece[][] = [];
  for (const p of pieces) {
    const row = rows.find((r) => Math.abs(r[0].y - p.y) <= Math.max(2, r[0].h * 0.4));
    if (row) row.push(p);
    else rows.push([p]);
  }
  return rows
    .sort((a, b) => b[0].y - a[0].y)
    .map((row) => {
      row.sort((a, b) => a.x - b.x);
      let line = '';
      let lastEnd: number | null = null;
      for (const p of row) {
        const gap = lastEnd === null ? 0 : p.x - lastEnd;
        if (lastEnd !== null && gap > p.h * 0.15 && !line.endsWith(' ') && !p.s.startsWith(' ')) line += ' ';
        line += p.s;
        lastEnd = p.x + p.w;
      }
      return line.replace(/\s+/g, ' ').trim();
    })
    .filter(Boolean);
}

export async function readPdfText(file: File, onPage?: (page: number, total: number) => void) {
  let doc;
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  } catch (err: any) {
    if (err?.name === 'PasswordException') {
      throw new PdfReadError('Este PDF tem senha. Abra-o, salve uma cópia sem senha e envie de novo.');
    }
    throw new PdfReadError('Não foi possível abrir este arquivo. Confira se é um PDF válido.');
  }
  const lines: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    onPage?.(n, doc.numPages);
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    lines.push(...pageToLines(content.items as any[]), '');
  }
  return { text: lines.join('\n').trim(), pages: doc.numPages };
}
