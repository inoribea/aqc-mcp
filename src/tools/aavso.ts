import { z } from 'zod';
import { restGet } from '../utils/http.js';

const AAVSO_VSX_BASE = 'https://www.aavso.org/vsx/index.php';

function parseVOTable(xmlText: string): { columns: string[]; rows: Record<string, unknown>[] } {
  const columns: string[] = [];
  const rows: Record<string, unknown>[] = [];

  const fieldRegex = /<FIELD\s+[^>]*name="([^"]+)"/g;
  let match;
  while ((match = fieldRegex.exec(xmlText)) !== null) {
    columns.push(match[1]);
  }

  const trRegex = /<TR>([\s\S]*?)<\/TR>/g;
  let trMatch;
  while ((trMatch = trRegex.exec(xmlText)) !== null) {
    const tdRegex = /<TD>([\s\S]*?)<\/TD>/g;
    const values: string[] = [];
    let tdMatch;
    while ((tdMatch = tdRegex.exec(trMatch[1])) !== null) {
      values.push(tdMatch[1].trim());
    }

    const row: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      row[col] = values[i] || null;
    });
    rows.push(row);
  }

  return { columns, rows };
}

function formatAavsoResult(
  data: { columns: string[]; rows: Record<string, unknown>[] },
  title?: string
): string {
  const lines: string[] = [];

  if (title) lines.push(`## ${title}\n`);

  if (data.rows.length === 0) {
    lines.push('No results found.');
    return lines.join('\n');
  }

  lines.push(`Found ${data.rows.length} result(s).\n`);

  data.rows.forEach((row, idx) => {
    if (data.rows.length > 1) lines.push(`--- Result ${idx + 1} ---`);
    for (const [key, value] of Object.entries(row)) {
      if (value !== null && value !== undefined && value !== '' && value !== '\n') {
        const cleanValue = String(value).replace(/<[^>]+>/g, '').trim();
        if (cleanValue) {
          lines.push(`  ${key}: ${cleanValue}`);
        }
      }
    }
    lines.push('');
  });

  return lines.join('\n');
}

export function registerAavsoTools(server: any) {
  server.tool(
    'aavso_query_star',
    'Query AAVSO VSX (Variable Star Index) for a specific variable star by name',
    {
      star_name: z.string().describe('Variable star name or identifier (e.g., "Mira", "Delta Cephei", "SX Uma")'),
      lang: z.enum(['en', 'zh']).default('en').describe('Output language'),
    },
    async ({ star_name, lang }: { star_name: string; lang: string }) => {
      const url = `${AAVSO_VSX_BASE}?view=query.votable&ident=${encodeURIComponent(star_name)}`;

      try {
        const text = await (await fetch(url)).text();
        const result = parseVOTable(text);

        const title = lang === 'zh'
          ? `AAVSO 变星查询: ${star_name}`
          : `AAVSO Variable Star Query: ${star_name}`;

        const output = formatAavsoResult(result, title);
        return { content: [{ type: 'text' as const, text: output }] };
      } catch (error) {
        const errorMsg = lang === 'zh'
          ? `查询失败: ${error instanceof Error ? error.message : String(error)}`
          : `Query failed: ${error instanceof Error ? error.message : String(error)}`;
        return { content: [{ type: 'text' as const, text: errorMsg }] };
      }
    }
  );

  server.tool(
    'aavso_query_region',
    'Query AAVSO VSX for variable stars in a circular region around coordinates',
    {
      ra: z.number().describe('Right Ascension in degrees (0-360)'),
      dec: z.number().describe('Declination in degrees (-90 to 90)'),
      radius: z.number().default(10).describe('Search radius in arcminutes'),
      max_magnitude: z.number().optional().describe('Maximum magnitude filter (brighter than)'),
      format: z.enum(['votable', 'json', 'xml']).default('votable').describe('Response format'),
      lang: z.enum(['en', 'zh']).default('en').describe('Output language'),
    },
    async ({
      ra,
      dec,
      radius,
      max_magnitude,
      format,
      lang,
    }: {
      ra: number;
      dec: number;
      radius: number;
      max_magnitude?: number;
      format: string;
      lang: string;
    }) => {
      const params = new URLSearchParams({
        view: 'api.list',
        ra: String(ra),
        dec: String(dec >= 0 ? `+${dec}` : dec),
        radius: String(radius / 60),
        format,
      });

      if (max_magnitude !== undefined) {
        params.set('tomag', String(max_magnitude));
      }

      const url = `${AAVSO_VSX_BASE}?${params.toString()}`;

      try {
        const text = await (await fetch(url)).text();
        let result;

        if (format === 'json') {
          const json = JSON.parse(text);
          result = {
            columns: json.columns || [],
            rows: json.data || [],
          };
        } else {
          result = parseVOTable(text);
        }

        const title = lang === 'zh'
          ? `AAVSO 区域查询: (${ra}, ${dec})`
          : `AAVSO Regional Query: (${ra}, ${dec})`;

        const output = formatAavsoResult(result, title);
        return { content: [{ type: 'text' as const, text: output }] };
      } catch (error) {
        const errorMsg = lang === 'zh'
          ? `查询失败: ${error instanceof Error ? error.message : String(error)}`
          : `Query failed: ${error instanceof Error ? error.message : String(error)}`;
        return { content: [{ type: 'text' as const, text: errorMsg }] };
      }
    }
  );
}
