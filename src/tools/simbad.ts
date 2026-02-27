import { z } from 'zod';
import { tapQuery, formatTapResult } from '../utils/http.js';

const SIMBAD_TAP = 'https://simbad.cds.unistra.fr/simbad/sim-tap/sync';

export function registerSimbadTools(server: any) {
  server.tool(
    'simbad_query',
    'Query SIMBAD astronomical database by object identifier (e.g. M31, NGC 1234, Vega)',
    {
      object_name: z.string().describe('Astronomical object name or identifier'),
      lang: z.enum(['en', 'zh']).default('en').describe('Output language'),
    },
    async ({ object_name, lang }: { object_name: string; lang: string }) => {
      const adql = `
        SELECT TOP 10
          basic.OID, basic.main_id, basic.ra, basic.dec,
          basic.pmra, basic.pmdec,
          basic.plx_value AS parallax,
          basic.rvz_radvel AS radial_velocity,
          basic.sp_type AS spectral_type,
          basic.galdim_majaxis, basic.galdim_minaxis,
          basic.morph_type AS morphological_type
        FROM basic
        JOIN ident ON basic.oid = ident.oidref
        WHERE ident.id = '${object_name.replace(/'/g, "''")}'
      `;

      const result = await tapQuery({ endpoint: SIMBAD_TAP, adql });
      const title = lang === 'zh' ? `SIMBAD 查询结果: ${object_name}` : `SIMBAD Query Result: ${object_name}`;
      const text = formatTapResult(result, title);
      return { content: [{ type: 'text' as const, text }] };
    }
  );
}
