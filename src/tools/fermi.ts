import { z } from 'zod';
import { tapQuery, formatTapResult } from '../utils/http.js';

const FERMI_TAP = 'https://fermi.gsfc.nasa.gov/ssc/data/access/lat/tap/sync';

export function registerFermiTools(server: any) {
  server.tool(
    'fermi_lat_catalog_query',
    'Query Fermi LAT point source catalog (4FGL-DR4, the latest 14-year catalog)',
    {
      target: z.string().optional().describe('Target name (e.g., "Crab Nebula", "3C 273")'),
      ra: z.number().optional().describe('Right Ascension in degrees (0-360)'),
      dec: z.number().optional().describe('Declination in degrees (-90 to 90)'),
      radius: z.number().default(5).describe('Search radius in degrees'),
      min_energy: z.number().optional().describe('Minimum energy in MeV (e.g., 100)'),
      max_energy: z.number().optional().describe('Maximum energy in MeV (e.g., 100000)'),
      max_results: z.number().default(50).describe('Maximum number of results'),
      lang: z.enum(['en', 'zh']).default('en').describe('Output language'),
    },
    async ({
      target,
      ra,
      dec,
      radius,
      min_energy,
      max_energy,
      max_results,
      lang,
    }: {
      target?: string;
      ra?: number;
      dec?: number;
      radius: number;
      min_energy?: number;
      max_energy?: number;
      max_results: number;
      lang: string;
    }) => {
      if (!target && (ra === undefined || dec === undefined)) {
        const msg = lang === 'zh' ? '请提供目标名称或坐标 (ra + dec)' : 'Please provide a target name or coordinates (ra + dec)';
        return { content: [{ type: 'text' as const, text: msg }] };
      }

      let where: string;

      if (ra !== undefined && dec !== undefined) {
        where = `CONTAINS(POINT('ICRS', ra, dec), CIRCLE('ICRS', ${ra}, ${dec}, ${radius})) = 1`;
      } else {
        where = `source_name = '${target!.replace(/'/g, "''")}'`;
      }

      let adql = `SELECT TOP ${max_results} source_name, ra, dec, glon, glat, flux_100mev, flux_1000mev, flux_10000mev, flux_100000mev, spectral_index, variability FROM fermilat.4fgl_dr4 WHERE ${where}`;

      if (min_energy !== undefined || max_energy !== undefined) {
        const energyFilter = [];
        if (min_energy !== undefined) energyFilter.push(`energy_gev >= ${min_energy / 1000}`);
        if (max_energy !== undefined) energyFilter.push(`energy_gev <= ${max_energy / 1000}`);
        if (energyFilter.length > 0) {
          adql = adql.replace(`WHERE ${where}`, `WHERE ${where} AND ${energyFilter.join(' AND ')}`);
        }
      }

      try {
        const result = await tapQuery({ endpoint: FERMI_TAP, adql, maxrec: max_results, timeout: 120000 });
        const title = lang === 'zh'
          ? `Fermi LAT 目录查询: ${target ?? `(${ra}, ${dec})`}`
          : `Fermi LAT Catalog Query: ${target ?? `(${ra}, ${dec})`}`;
        return { content: [{ type: 'text' as const, text: formatTapResult(result, title) }] };
      } catch (error) {
        const errorMsg = lang === 'zh'
          ? `查询失败: ${error instanceof Error ? error.message : String(error)}\n\n注意：Fermi LAT TAP 服务可能需要更长时间或暂时不可用。`
          : `Query failed: ${error instanceof Error ? error.message : String(error)}\n\nNote: Fermi LAT TAP service may take longer or be temporarily unavailable.`;
        return { content: [{ type: 'text' as const, text: errorMsg }] };
      }
    }
  );

  server.tool(
    'fermi_lat_adql',
    'Execute a raw ADQL query on the Fermi LAT archive (TAP service)',
    {
      adql: z.string().describe('ADQL query string'),
      max_results: z.number().default(100).describe('Maximum number of results'),
      lang: z.enum(['en', 'zh']).default('en').describe('Output language'),
    },
    async ({ adql, max_results, lang }: { adql: string; max_results: number; lang: string }) => {
      try {
        const result = await tapQuery({ endpoint: FERMI_TAP, adql, maxrec: max_results, timeout: 120000 });
        const title = lang === 'zh' ? 'Fermi LAT ADQL 查询结果' : 'Fermi LAT ADQL Query Result';
        return { content: [{ type: 'text' as const, text: formatTapResult(result, title) }] };
      } catch (error) {
        const errorMsg = lang === 'zh'
          ? `查询失败: ${error instanceof Error ? error.message : String(error)}`
          : `Query failed: ${error instanceof Error ? error.message : String(error)}`;
        return { content: [{ type: 'text' as const, text: errorMsg }] };
      }
    }
  );
}
