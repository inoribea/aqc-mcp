import { z } from 'zod';

const MAST_API = 'https://mast.stsci.edu/api/v0/invoke';

async function mastQuery(service: string, params: Record<string, unknown>, timeout = 60000): Promise<unknown> {
  const body = JSON.stringify({ service, params, format: 'json', timeout: Math.floor(timeout / 1000) });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(MAST_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`MAST API error (${response.status}): ${text.slice(0, 500)}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function formatMastResults(data: any, title: string): string {
  const lines: string[] = [`## ${title}\n`];

  const rows = data?.data || data?.Data || [];
  if (!Array.isArray(rows) || rows.length === 0) {
    lines.push('No results found.');
    return lines.join('\n');
  }

  lines.push(`Found ${rows.length} result(s).\n`);

  const displayCols = ['intentType', 'obs_collection', 'instrument_name', 'filters', 'target_name', 'obsid', 's_ra', 's_dec', 't_min', 'dataproduct_type'];

  if (rows.length <= 5) {
    for (let i = 0; i < rows.length; i++) {
      if (rows.length > 1) lines.push(`--- Result ${i + 1} ---`);
      const row = rows[i];
      for (const [key, value] of Object.entries(row)) {
        if (value !== null && value !== undefined && value !== '') {
          lines.push(`  ${key}: ${value}`);
        }
      }
      lines.push('');
    }
  } else {
    const cols = displayCols.filter(c => rows[0][c] !== undefined);
    if (cols.length === 0) {
      const allCols = Object.keys(rows[0]).slice(0, 8);
      cols.push(...allCols);
    }
    lines.push(cols.join(' | '));
    lines.push(cols.map(() => '---').join(' | '));
    for (const row of rows.slice(0, 20)) {
      lines.push(cols.map(c => String(row[c] ?? '')).join(' | '));
    }
    if (rows.length > 20) {
      lines.push(`\n... and ${rows.length - 20} more rows.`);
    }
  }

  return lines.join('\n');
}

export function registerMastTools(server: any) {
  server.tool(
    'mast_query',
    'Search MAST (Mikulski Archive for Space Telescopes) for observations by object name or coordinates',
    {
      object_name: z.string().optional().describe('Object name (e.g. "M31", "NGC 1068"). Use this OR ra/dec.'),
      ra: z.number().optional().describe('Right Ascension in degrees (use with dec)'),
      dec: z.number().optional().describe('Declination in degrees (use with ra)'),
      radius: z.number().default(3).describe('Search radius in arcminutes'),
      max_results: z.number().default(50).describe('Maximum number of results'),
      lang: z.enum(['en', 'zh']).default('en').describe('Output language'),
    },
    async ({ object_name, ra, dec, radius, max_results, lang }: {
      object_name?: string; ra?: number; dec?: number; radius: number; max_results: number; lang: string;
    }) => {
      if (!object_name && (ra === undefined || dec === undefined)) {
        const msg = lang === 'zh'
          ? '请提供 object_name 或 ra/dec 坐标。'
          : 'Please provide object_name or ra/dec coordinates.';
        return { content: [{ type: 'text' as const, text: msg }] };
      }

      let service: string;
      let params: Record<string, unknown>;

      if (object_name && (ra === undefined || dec === undefined)) {
        service = 'Mast.Name.Lookup';
        const resolveData = await mastQuery(service, { input: object_name }) as any;
        const resolved = resolveData?.resolvedCoordinate;
        if (!resolved || resolved.length === 0) {
          const msg = lang === 'zh' ? `无法解析天体名称: ${object_name}` : `Could not resolve object name: ${object_name}`;
          return { content: [{ type: 'text' as const, text: msg }] };
        }
        ra = resolved[0].ra;
        dec = resolved[0].decl;
      }

      service = 'Mast.Caom.Cone';
      params = { ra: ra!, dec: dec!, radius: radius / 60, pagesize: max_results, page: 1 };

      const data = await mastQuery(service, params);
      const title = lang === 'zh'
        ? `MAST 查询结果${object_name ? ': ' + object_name : ''}`
        : `MAST Query Result${object_name ? ': ' + object_name : ''}`;
      return { content: [{ type: 'text' as const, text: formatMastResults(data, title) }] };
    }
  );
}
