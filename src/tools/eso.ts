import { z } from 'zod';
import { tapQuery, formatTapResult } from '../utils/http.js';

const ESO_TAP = 'http://archive.eso.org/tap_obs/sync';

export function registerEsoTools(server: any) {
  server.tool(
    'eso_query',
    'Query ESO (European Southern Observatory) science archive by target, instrument, or coordinates',
    {
      target: z.string().optional().describe('Target object name (e.g. "NGC 1068")'),
      instrument: z.string().optional().describe('Instrument name (e.g. "UVES", "XSHOOTER", "MUSE")'),
      ra: z.number().optional().describe('Right Ascension in degrees'),
      dec: z.number().optional().describe('Declination in degrees'),
      radius: z.number().default(10).describe('Search radius in arcminutes'),
      max_results: z.number().default(50).describe('Maximum number of results'),
      lang: z.enum(['en', 'zh']).default('en').describe('Output language'),
    },
    async ({ target, instrument, ra, dec, radius, max_results, lang }: { target?: string; instrument?: string; ra?: number; dec?: number; radius: number; max_results: number; lang: string }) => {
      const conditions: string[] = [];

      if (target) {
        conditions.push(`target = '${target.replace(/'/g, "''")}'`);
      }
      if (instrument) {
        conditions.push(`instrument = '${instrument.replace(/'/g, "''")}'`);
      }
      if (ra !== undefined && dec !== undefined) {
        const radiusDeg = radius / 60;
        conditions.push(`CONTAINS(POINT('ICRS', ra, dec), CIRCLE('ICRS', ${ra}, ${dec}, ${radiusDeg})) = 1`);
      }

      if (conditions.length === 0) {
        return { content: [{ type: 'text' as const, text: lang === 'zh' ? '请至少提供一个查询条件 (target, instrument, 或坐标)' : 'Please provide at least one search criterion (target, instrument, or coordinates)' }] };
      }

      const adql = `SELECT TOP ${max_results} target, ra, dec, instrument, filter, exptime, date_obs, prog_id, dp_id FROM dbo.raw WHERE ${conditions.join(' AND ')}`;

      const result = await tapQuery({ endpoint: ESO_TAP, adql, maxrec: max_results });
      const title = lang === 'zh' ? `ESO 档案查询结果` : `ESO Archive Query Result`;
      return { content: [{ type: 'text' as const, text: formatTapResult(result, title) }] };
    }
  );
}
