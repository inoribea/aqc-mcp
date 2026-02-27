import { z } from 'zod';
import { tapQuery, formatTapResult } from '../utils/http.js';

const IRSA_TAP = 'https://irsa.ipac.caltech.edu/TAP/sync';

export function registerIrsaTools(server: any) {
  server.tool(
    'irsa_query',
    'Query NASA/IPAC Infrared Science Archive (IRSA) by coordinates and catalog',
    {
      ra: z.number().describe('Right Ascension in degrees'),
      dec: z.number().describe('Declination in degrees'),
      catalog: z.string().default('allwise_p3as_psd').describe('IRSA catalog table name (e.g. "allwise_p3as_psd", "fp_psc" for 2MASS)'),
      radius: z.number().default(10).describe('Search radius in arcseconds'),
      max_results: z.number().default(50).describe('Maximum number of results'),
      lang: z.enum(['en', 'zh']).default('en').describe('Output language'),
    },
    async ({ ra, dec, catalog, radius, max_results, lang }: { ra: number; dec: number; catalog: string; radius: number; max_results: number; lang: string }) => {
      const radiusDeg = radius / 3600;
      const adql = `SELECT TOP ${max_results} * FROM ${catalog} WHERE CONTAINS(POINT('ICRS', ra, dec), CIRCLE('ICRS', ${ra}, ${dec}, ${radiusDeg})) = 1`;

      const result = await tapQuery({ endpoint: IRSA_TAP, adql, maxrec: max_results });
      const title = lang === 'zh' ? `IRSA 查询结果 (${catalog})` : `IRSA Query Result (${catalog})`;
      return { content: [{ type: 'text' as const, text: formatTapResult(result, title) }] };
    }
  );

  server.tool(
    'irsa_tap',
    'Execute raw ADQL query against IRSA TAP service',
    {
      adql: z.string().describe('ADQL query string'),
      max_results: z.number().default(100).describe('Maximum number of results'),
      lang: z.enum(['en', 'zh']).default('en').describe('Output language'),
    },
    async ({ adql, max_results, lang }: { adql: string; max_results: number; lang: string }) => {
      const result = await tapQuery({ endpoint: IRSA_TAP, adql, maxrec: max_results });
      const title = lang === 'zh' ? 'IRSA TAP 查询结果' : 'IRSA TAP Query Result';
      return { content: [{ type: 'text' as const, text: formatTapResult(result, title) }] };
    }
  );
}
