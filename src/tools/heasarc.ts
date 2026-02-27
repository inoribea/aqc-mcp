import { z } from 'zod';
import { tapQuery, formatTapResult } from '../utils/http.js';

const HEASARC_TAP = 'https://heasarc.gsfc.nasa.gov/xamin/vo/tap/sync';

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
      // HEASARC TAP uses name resolver internally via a special function
      // We query the mission table with a cone search around resolved coordinates
      // First try a simple name-based query
      const radiusDeg = radius / 60;
      const adql = `SELECT TOP ${max_results} * FROM ${mission} WHERE CONTAINS(POINT('ICRS', ra, dec), CIRCLE('ICRS', COORD1(SIMBAD('${object_name.replace(/'/g, "''")}')), COORD2(SIMBAD('${object_name.replace(/'/g, "''")}')), ${radiusDeg})) = 1`;

      try {
        const result = await tapQuery({ endpoint: HEASARC_TAP, adql, maxrec: max_results });
        const title = lang === 'zh' ? `HEASARC 查询结果: ${object_name} (${mission})` : `HEASARC Query Result: ${object_name} (${mission})`;
        return { content: [{ type: 'text' as const, text: formatTapResult(result, title) }] };
      } catch {
        // Fallback: some HEASARC tables use name column directly
        const fallbackAdql = `SELECT TOP ${max_results} * FROM ${mission} WHERE name LIKE '%${object_name.replace(/'/g, "''").replace(/%/g, '')}%'`;
        const result = await tapQuery({ endpoint: HEASARC_TAP, adql: fallbackAdql, maxrec: max_results });
        const title = lang === 'zh' ? `HEASARC 查询结果: ${object_name} (${mission})` : `HEASARC Query Result: ${object_name} (${mission})`;
        return { content: [{ type: 'text' as const, text: formatTapResult(result, title) }] };
      }
    }
  );
}
