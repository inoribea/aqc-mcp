import { z } from 'zod';

const NIST_URL = 'https://physics.nist.gov/cgi-bin/ASD/lines1.pl';

async function queryNist(minwav: number, maxwav: number, linename?: string, timeout = 60000): Promise<string> {
  const params = new URLSearchParams({
    spectra: linename || '',
    low_w: String(minwav),
    upp_w: String(maxwav),
    unit: 0 as any, // Angstroms
    de: '0',
    format: '3', // Tab-delimited
    line_out: '0', // All lines
    en_unit: '0', // cm-1
    output: '0', // All output
    bibrefs: '1',
    page_size: '15',
    show_obs_wl: '1',
    show_calc_wl: '1',
    order_out: '0', // Wavelength order
    max_low_enrg: '',
    max_upp_enrg: '',
    min_str: '',
    max_str: '',
    min_accur: '',
    min_intens: '',
    conf_out: 'on',
    term_out: 'on',
    enrg_out: 'on',
    J_out: 'on',
    submit: 'Retrieve Data',
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(NIST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`NIST query failed (${response.status})`);
    }

    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function parseNistResponse(html: string): { columns: string[]; rows: Record<string, string>[] } {
  // NIST returns tab-delimited data within <pre> tags or as plain text
  // Try to extract tabular data
  const lines = html.split('\n').filter(l => l.trim().length > 0);

  // Find header line (contains tab separators)
  let headerIdx = -1;
  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    if (lines[i].includes('\t') && (lines[i].includes('Observed') || lines[i].includes('Ritz') || lines[i].includes('Aki') || lines[i].includes('Acc'))) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    // Try to find any tab-delimited content
    for (let i = 0; i < Math.min(lines.length, 30); i++) {
      const tabs = (lines[i].match(/\t/g) || []).length;
      if (tabs >= 3) {
        headerIdx = i;
        break;
      }
    }
  }

  if (headerIdx === -1) {
    return { columns: [], rows: [] };
  }

  const columns = lines[headerIdx].split('\t').map(c => c.trim().replace(/"/g, ''));
  const rows: Record<string, string>[] = [];

  // Skip separator lines (dashes)
  let dataStart = headerIdx + 1;
  if (dataStart < lines.length && /^[\s\-\t]+$/.test(lines[dataStart])) {
    dataStart++;
  }

  for (let i = dataStart; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes('\t')) continue;
    if (/^[\s\-\t]+$/.test(line)) continue;

    const values = line.split('\t').map(v => v.trim().replace(/"/g, ''));
    const row: Record<string, string> = {};
    columns.forEach((col, idx) => {
      row[col] = values[idx] || '';
    });
    rows.push(row);
  }

  return { columns, rows };
}

export function registerNistTools(server: any) {
  server.tool(
    'nist_lines',
    'Query NIST Atomic Spectra Database for spectral line data',
    {
      linename: z.string().optional().describe('Element/ion name (e.g. "Fe II", "H I", "Na")'),
      min_wavelength: z.number().optional().describe('Minimum wavelength in Angstroms'),
      max_wavelength: z.number().optional().describe('Maximum wavelength in Angstroms'),
      max_results: z.number().default(50).describe('Maximum number of results to display'),
      lang: z.enum(['en', 'zh']).default('en').describe('Output language'),
    },
    async ({ linename, min_wavelength, max_wavelength, max_results, lang }: {
      linename?: string; min_wavelength?: number; max_wavelength?: number; max_results: number; lang: string;
    }) => {
      // If only linename given, use broad default range
      let minwav = min_wavelength ?? (linename ? 1 : 0);
      let maxwav = max_wavelength ?? (linename ? 100000 : 0);

      if (minwav === 0 && maxwav === 0) {
        const msg = lang === 'zh'
          ? '请提供波长范围 (min_wavelength/max_wavelength) 或元素名称 (linename)。'
          : 'Please provide wavelength range (min_wavelength/max_wavelength) or element name (linename).';
        return { content: [{ type: 'text' as const, text: msg }] };
      }

      const html = await queryNist(minwav, maxwav, linename);
      const { columns, rows } = parseNistResponse(html);

      const lines: string[] = [];
      const title = lang === 'zh'
        ? `NIST 原子光谱数据库${linename ? ': ' + linename : ''}`
        : `NIST Atomic Spectra Database${linename ? ': ' + linename : ''}`;
      lines.push(`## ${title}\n`);

      if (rows.length === 0) {
        lines.push(lang === 'zh' ? '未找到光谱线数据。' : 'No spectral line data found.');
        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      }

      lines.push(lang === 'zh' ? `找到 ${rows.length} 条光谱线。\n` : `Found ${rows.length} spectral line(s).\n`);

      const displayRows = rows.slice(0, max_results);
      const displayCols = columns.slice(0, 8);

      if (displayRows.length <= 5) {
        for (let i = 0; i < displayRows.length; i++) {
          if (displayRows.length > 1) lines.push(`--- Line ${i + 1} ---`);
          for (const col of columns) {
            if (displayRows[i][col]) lines.push(`  ${col}: ${displayRows[i][col]}`);
          }
          lines.push('');
        }
      } else {
        lines.push(displayCols.join(' | '));
        lines.push(displayCols.map(() => '---').join(' | '));
        for (const row of displayRows) {
          lines.push(displayCols.map(c => row[c] || '').join(' | '));
        }
        if (rows.length > max_results) {
          lines.push(`\n... and ${rows.length - max_results} more lines.`);
        }
      }

      return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
    }
  );
}
