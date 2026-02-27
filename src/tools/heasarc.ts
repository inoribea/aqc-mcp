import { z } from 'zod';
import { tapQuery, formatTapResult } from '../utils/http.js';

const HEASARC_TAP = 'https://heasarc.gsfc.nasa.gov/xamin/vo/tap/sync';
const SIMBAD_TAP = 'https://simbad.cds.unistra.fr/simbad/sim-tap/sync';

/**
 * Resolve an object name to RA/Dec via SIMBAD TAP (supports JSON).
 */
async function resolveCoords(name: string): Promise<{ ra: number; dec: number }> {
  const safeName = name.replace(/'/g, "''");
  const adql = `SELECT ra, dec FROM basic JOIN ident ON oidref = oid WHERE id = '${safeName}'`;
  const result = await tapQuery({ endpoint: SIMBAD_TAP, adql, format: 'json' });
  if (result.rows.length === 0) {
    throw new Error(`Could not resolve object name: ${name}`);
  }
  const row = result.rows[0];
  return { ra: Number(row.ra), dec: Number(row.dec) };
}

export function registerHeasarcTools(server: any) {
  server.tool(
    'heasarc_query',
    'Query HEASARC (High Energy Astrophysics Science Archive) by object name and mission catalog',
    {
      object_name: z.string().describe('Object name (e.g. "Crab Nebula", "Cyg X-1")'),
      mission: z.string().default('xmmmaster').describe('Mission/catalog table (e.g. "xmmmaster", "chanmaster", "swiftmastr", "rosmaster")'),
      radius: z.number().default(10).describe('Search radius in arcminutes'),
      max_results: z.number().default(50).describe('Maximum number of results'),
      lang: z.enum(['en', 'zh']).default('en').describe('Output language'),
    },
    async ({ object_name, mission, radius, max_results, lang }: { object_name: string; mission: string; radius: number; max_results: number; lang: string }) => {
      // Step 1: Resolve object name to coordinates via SIMBAD
      const coords = await resolveCoords(object_name);

      // Step 2: Cone search on HEASARC with FORMAT=text (only format that works)
      const radiusDeg = radius / 60;
      const adql = `SELECT TOP ${max_results} * FROM ${mission} WHERE CONTAINS(POINT('ICRS', ra, dec), CIRCLE('ICRS', ${coords.ra}, ${coords.dec}, ${radiusDeg})) = 1`;

      const result = await tapQuery({ endpoint: HEASARC_TAP, adql, format: 'text', maxrec: max_results });
      const title = lang === 'zh' ? `HEASARC 查询结果: ${object_name} (${mission})` : `HEASARC Query Result: ${object_name} (${mission})`;
      return { content: [{ type: 'text' as const, text: formatTapResult(result, title) }] };
    }
  );
}
