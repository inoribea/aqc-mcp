import { z } from 'zod';
import { tapQuery, formatTapResult } from '../utils/http.js';

const VIZIER_TAP = 'https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync';

export function registerVizierTools(server: any) {
  server.tool(
    'vizier_query',
    'Query VizieR catalog service. Cone search by coordinates+radius on a specific catalog.',
    {
      target: z.string().describe('Target name or coordinates (e.g. "M31" or "10.684 +41.269")'),
      radius: z.number().default(10).describe('Search radius in arcseconds'),
      catalog: z.string().default('I/355/gaiadr3').describe('VizieR catalog ID (e.g. "I/355/gaiadr3", "II/246/out")'),
      max_results: z.number().default(50).describe('Maximum number of results'),
      lang: z.enum(['en', 'zh']).default('en').describe('Output language'),
    },
    async ({ target, radius, catalog, max_results, lang }: { target: string; radius: number; catalog: string; max_results: number; lang: string }) => {
      const tableName = `"${catalog}"`;
      const radiusDeg = radius / 3600;

      const coordMatch = target.match(/^([+-]?\d+\.?\d*)\s+([+-]?\d+\.?\d*)$/);

      let adql: string;
      if (coordMatch) {
        const ra = coordMatch[1];
        const dec = coordMatch[2];
        adql = `SELECT TOP ${max_results} * FROM ${tableName} WHERE 1=CONTAINS(POINT('ICRS', RAJ2000, DEJ2000), CIRCLE('ICRS', ${ra}, ${dec}, ${radiusDeg}))`;
      } else {
        adql = `SELECT TOP ${max_results} * FROM ${tableName}`;
      }

      const result = await tapQuery({ endpoint: VIZIER_TAP, adql, maxrec: max_results });
      const title = lang === 'zh' ? `VizieR 目录查询: ${catalog}` : `VizieR Catalog Query: ${catalog}`;
      const text = formatTapResult(result, title);
      return { content: [{ type: 'text' as const, text }] };
    }
  );
}
