import { z } from 'zod';
import { tapQuery, formatTapResult } from '../utils/http.js';

const ALMA_TAP = 'https://almascience.eso.org/tap/sync';

export function registerAlmaTools(server: any) {
  server.tool(
    'alma_query',
    'Query ALMA (Atacama Large Millimeter Array) archive by object name or coordinates',
    {
      target: z.string().optional().describe('Object name (e.g. "M83", "NGC 253")'),
      ra: z.number().optional().describe('Right Ascension in degrees (0-360)'),
      dec: z.number().optional().describe('Declination in degrees (-90 to 90)'),
      radius: z.number().default(5).describe('Search radius in arcminutes'),
      max_results: z.number().default(50).describe('Maximum number of results'),
      lang: z.enum(['en', 'zh']).default('en').describe('Output language'),
    },
    async ({ target, ra, dec, radius, max_results, lang }: { target?: string; ra?: number; dec?: number; radius: number; max_results: number; lang: string }) => {
      if (!target && (ra === undefined || dec === undefined)) {
        return { content: [{ type: 'text' as const, text: lang === 'zh' ? '请提供目标名称或坐标 (ra + dec)' : 'Please provide a target name or coordinates (ra + dec)' }] };
      }

      const radiusDeg = radius / 60;
      let where: string;

      if (ra !== undefined && dec !== undefined) {
        where = `CONTAINS(POINT('ICRS', s_ra, s_dec), CIRCLE('ICRS', ${ra}, ${dec}, ${radiusDeg})) = 1`;
      } else {
        where = `target_name = '${target!.replace(/'/g, "''")}'`;
      }

      const adql = `SELECT TOP ${max_results} target_name, s_ra, s_dec, frequency, bandwidth, t_exptime, instrument_name, proposal_id, obs_id FROM ivoa.obscore WHERE ${where}`;

      const result = await tapQuery({ endpoint: ALMA_TAP, adql, maxrec: max_results });
      const title = lang === 'zh' ? `ALMA 查询结果: ${target ?? `${ra}, ${dec}`}` : `ALMA Query Result: ${target ?? `${ra}, ${dec}`}`;
      return { content: [{ type: 'text' as const, text: formatTapResult(result, title) }] };
    }
  );
}
