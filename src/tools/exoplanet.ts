import { z } from 'zod';
import { tapQuery, formatTapResult } from '../utils/http.js';

const EXOPLANET_TAP = 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync';

export function registerExoplanetTools(server: any) {
  server.tool(
    'exoplanet_query',
    'Query NASA Exoplanet Archive for confirmed exoplanet data',
    {
      planet_name: z.string().optional().describe('Planet name (e.g. "Kepler-22 b", "TRAPPIST-1 e")'),
      hostname: z.string().optional().describe('Host star name (e.g. "TRAPPIST-1", "Kepler-22")'),
      max_results: z.number().default(50).describe('Maximum number of results'),
      lang: z.enum(['en', 'zh']).default('en').describe('Output language'),
    },
    async ({ planet_name, hostname, max_results, lang }: { planet_name?: string; hostname?: string; max_results: number; lang: string }) => {
      const conditions: string[] = [];

      if (planet_name) {
        conditions.push(`pl_name = '${planet_name.replace(/'/g, "''")}'`);
      }
      if (hostname) {
        conditions.push(`hostname = '${hostname.replace(/'/g, "''")}'`);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const adql = `SELECT TOP ${max_results} pl_name, hostname, discoverymethod, disc_year, pl_orbper, pl_rade, pl_bmasse, pl_eqt, st_teff, st_rad, st_mass, sy_dist FROM ps ${where} ORDER BY disc_year DESC`;

      const result = await tapQuery({ endpoint: EXOPLANET_TAP, adql, maxrec: max_results });
      const title = lang === 'zh' ? `系外行星查询结果` : `Exoplanet Query Result`;
      return { content: [{ type: 'text' as const, text: formatTapResult(result, title) }] };
    }
  );
}
