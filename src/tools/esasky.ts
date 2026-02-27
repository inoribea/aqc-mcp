import { z } from 'zod';
import { tapQuery, formatTapResult } from '../utils/http.js';

const ESASKY_TAP = 'https://sky.esa.int/esasky-tap/tap/sync';

export function registerEsaskyTools(server: any) {
  server.tool(
    'esasky_query',
    'Query ESASky archive for astronomical observations by position and radius',
    {
      ra: z.number().describe('Right Ascension in degrees (0-360)'),
      dec: z.number().describe('Declination in degrees (-90 to 90)'),
      radius: z.number().default(10).describe('Search radius in arcminutes'),
      mission: z.string().default('all').describe('Mission name (e.g. "XMM", "HST", "Herschel", "all")'),
      max_results: z.number().default(50).describe('Maximum number of results'),
      lang: z.enum(['en', 'zh']).default('en').describe('Output language'),
    },
    async ({ ra, dec, radius, mission, max_results, lang }: { ra: number; dec: number; radius: number; mission: string; max_results: number; lang: string }) => {
      const radiusDeg = radius / 60;
      let tableName = 'ivoa.obscore';
      let missionFilter = '';

      if (mission !== 'all') {
        missionFilter = ` AND obs_collection = '${mission.replace(/'/g, "''")}'`;
      }

      const adql = `SELECT TOP ${max_results} obs_id, obs_collection, target_name, s_ra, s_dec, instrument_name, t_exptime, access_url FROM ${tableName} WHERE CONTAINS(POINT('ICRS', s_ra, s_dec), CIRCLE('ICRS', ${ra}, ${dec}, ${radiusDeg})) = 1${missionFilter}`;

      const result = await tapQuery({ endpoint: ESASKY_TAP, adql, maxrec: max_results });
      const title = lang === 'zh' ? `ESASky 查询结果: (${ra}, ${dec})` : `ESASky Query Result: (${ra}, ${dec})`;
      return { content: [{ type: 'text' as const, text: formatTapResult(result, title) }] };
    }
  );
}
