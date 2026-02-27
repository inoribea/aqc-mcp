import { z } from 'zod';

const SPLATALOGUE_SLAP = 'https://splatalogue.online/splata-slap/slap';
const C_M_S = 299792458; // speed of light in m/s

interface SlapLine {
  [key: string]: string;
}

function ghzToMeters(ghz: number): number {
  return C_M_S / (ghz * 1e9);
}

async function querySplatalogue(minFreqGHz: number, maxFreqGHz: number, timeout = 30000): Promise<SlapLine[]> {
  // SLAP uses wavelength in meters; higher freq = shorter wavelength
  const maxWavelength = ghzToMeters(minFreqGHz);
  const minWavelength = ghzToMeters(maxFreqGHz);

  const params = new URLSearchParams({
    REQUEST: 'queryData',
    WAVELENGTH: `${minWavelength}/${maxWavelength}`,
    RESPONSEFORMAT: 'application/x-votable+xml',
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${SPLATALOGUE_SLAP}?${params.toString()}`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Splatalogue query failed (${response.status})`);
    }

    const xml = await response.text();
    return parseVOTable(xml);
  } finally {
    clearTimeout(timer);
  }
}

function parseVOTable(xml: string): SlapLine[] {
  // Extract FIELD names
  const fieldRegex = /<FIELD[^>]*name="([^"]*)"[^>]*>/g;
  const fields: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = fieldRegex.exec(xml)) !== null) {
    fields.push(m[1]);
  }

  if (fields.length === 0) return [];

  // Extract TABLEDATA rows
  const tdMatch = xml.match(/<TABLEDATA>([\s\S]*?)<\/TABLEDATA>/);
  if (!tdMatch) return [];

  const rows: SlapLine[] = [];
  const trRegex = /<TR>([\s\S]*?)<\/TR>/g;
  let trMatch: RegExpExecArray | null;

  while ((trMatch = trRegex.exec(tdMatch[1])) !== null) {
    const tdRegex = /<TD>([\s\S]*?)<\/TD>/g;
    const values: string[] = [];
    let tdM: RegExpExecArray | null;
    while ((tdM = tdRegex.exec(trMatch[1])) !== null) {
      values.push(tdM[1].trim());
    }

    if (values.length > 0) {
      const row: SlapLine = {};
      for (let i = 0; i < Math.min(fields.length, values.length); i++) {
        row[fields[i]] = values[i];
      }
      rows.push(row);
    }
  }

  return rows;
}

function formatLines(lines: SlapLine[], title: string, chemicalFilter?: string): string {
  let filtered = lines;
  if (chemicalFilter) {
    const lower = chemicalFilter.toLowerCase();
    filtered = lines.filter(l => {
      const name = (l['chemical_name'] || l['species'] || l['name'] || '').toLowerCase();
      const formula = (l['formula'] || l['Chemical Name'] || '').toLowerCase();
      return name.includes(lower) || formula.includes(lower);
    });
  }

  if (filtered.length === 0) {
    return `${title}\n\nNo spectral lines found.`;
  }

  const output: string[] = [title, `Lines found: ${filtered.length}`, ''];

  for (const line of filtered.slice(0, 200)) {
    const parts: string[] = [];
    for (const [k, v] of Object.entries(line)) {
      if (v && v.length > 0) {
        parts.push(`${k}: ${v}`);
      }
    }
    output.push(parts.join(' | '));
  }

  if (filtered.length > 200) {
    output.push(`\n... and ${filtered.length - 200} more lines`);
  }

  return output.join('\n');
}

export function registerSplatalogueTools(server: any) {
  server.tool(
    'splatalogue_lines',
    'Query the Splatalogue spectral line database by frequency range. Optionally filter by chemical species name.',
    {
      min_frequency: z.number().describe('Minimum frequency in GHz'),
      max_frequency: z.number().describe('Maximum frequency in GHz'),
      chemical_name: z.string().optional().describe('Filter by chemical species name (e.g., "CO", "H2O")'),
      lang: z.enum(['en', 'zh']).default('en').describe('Output language'),
    },
    async ({ min_frequency, max_frequency, chemical_name, lang }: {
      min_frequency: number; max_frequency: number; chemical_name?: string; lang: string;
    }) => {
      if (min_frequency >= max_frequency) {
        return { content: [{ type: 'text' as const, text: lang === 'zh' ? '最小频率必须小于最大频率' : 'min_frequency must be less than max_frequency' }] };
      }

      try {
        const lines = await querySplatalogue(min_frequency, max_frequency);
        const title = lang === 'zh'
          ? `=== Splatalogue 光谱线查询 (${min_frequency}-${max_frequency} GHz) ===`
          : `=== Splatalogue Spectral Lines (${min_frequency}-${max_frequency} GHz) ===`;
        return { content: [{ type: 'text' as const, text: formatLines(lines, title, chemical_name) }] };
      } catch (e: any) {
        return { content: [{ type: 'text' as const, text: `Splatalogue query error: ${e.message}` }] };
      }
    }
  );
}
