import { z } from 'zod';
import { tapQuery, formatTapResult } from '../utils/http.js';

const GAIA_TAP = 'https://gea.esac.esa.int/tap-server/tap/sync';

export function registerGaiaTools(server: any) {
  server.tool(
    'gaia_cone_search',
    'Cone search on Gaia DR3 catalog by coordinates and radius',
    {
      ra: z.number().describe('Right Ascension in degrees (0-360)'),
      dec: z.number().describe('Declination in degrees (-90 to 90)'),
      radius: z.number().default(5).describe('Search radius in arcseconds'),
      max_results: z.number().default(50).describe('Maximum number of results'),
      lang: z.enum(['en', 'zh']).default('en').describe('Output language'),
    },
    async ({ ra, dec, radius, max_results, lang }: { ra: number; dec: number; radius: number; max_results: number; lang: string }) => {
      const radiusDeg = radius / 3600;
      const adql = `SELECT TOP ${max_results} source_id, ra, dec, parallax, pmra, pmdec, phot_g_mean_mag, bp_rp, radial_velocity, teff_gspphot FROM gaiadr3.gaia_source WHERE CONTAINS(POINT('ICRS', ra, dec), CIRCLE('ICRS', ${ra}, ${dec}, ${radiusDeg})) = 1 ORDER BY phot_g_mean_mag ASC`;

      const result = await tapQuery({ endpoint: GAIA_TAP, adql, maxrec: max_results });
      const title = lang === 'zh' ? `Gaia DR3 锥形搜索: (${ra}, ${dec})` : `Gaia DR3 Cone Search: (${ra}, ${dec})`;
      return { content: [{ type: 'text' as const, text: formatTapResult(result, title) }] };
    }
  );

  server.tool(
    'gaia_adql',
    'Execute a raw ADQL query on the Gaia archive',
    {
      adql: z.string().describe('ADQL query string'),
      max_results: z.number().default(100).describe('Maximum number of results'),
      lang: z.enum(['en', 'zh']).default('en').describe('Output language'),
    },
    async ({ adql, max_results, lang }: { adql: string; max_results: number; lang: string }) => {
      const result = await tapQuery({ endpoint: GAIA_TAP, adql, maxrec: max_results });
      const title = lang === 'zh' ? 'Gaia ADQL 查询结果' : 'Gaia ADQL Query Result';
      return { content: [{ type: 'text' as const, text: formatTapResult(result, title) }] };
    }
  );
}
