import { z } from 'zod';
import { tapQuery, formatTapResult } from '../utils/http.js';

const ESASKY_TAP = 'https://sky.esa.int/esasky-tap/tap/sync';

const MISSION_TABLES: Record<string, string> = {
  'xmm': 'observations.mv_v_v_xsa_esasky_photo_fdw_fdw',
  'hst': 'observations.mv_v_v_hst_mmi_observation_fdw_fdw',
  'alma': 'observations.mv_v_v_alma_obs_fdw',
  'jwst': 'observations.mv_v_jwst_obs_fdw',
  'chandra': 'observations.mv_chandra_obs_photo_fdw',
  'herschel': 'observations.mv_v_v_hsa_esasky_photo_fdw_fdw',
  'spitzer': 'observations.mv_spitzer_irac_fdw',
  'suzaku': 'observations.mv_suzaku_data_fdw',
  'cheops': 'observations.mv_cheops_obs_fdw',
  'xmm-om': 'observations.mv_v_esasky_xmm_om_uv_fdw',
  'iso': 'observations.mv_iso_spectra_fdw',
  'iue': 'observations.mv_iue_spectra_fdw',
  'akari': 'observations.mv_akari_irc_fdw',
};

const SUPPORTED_MISSIONS = Object.keys(MISSION_TABLES).join(', ');

export function registerEsaskyTools(server: any) {
  server.tool(
    'esasky_query',
    'Query ESASky archive for astronomical observations by position and radius',
    {
      ra: z.number().describe('Right Ascension in degrees (0-360)'),
      dec: z.number().describe('Declination in degrees (-90 to 90)'),
      radius: z.number().default(10).describe('Search radius in arcminutes'),
      mission: z.string().default('xmm').describe(`Mission name: ${SUPPORTED_MISSIONS}, or "all" for XMM default`),
      max_results: z.number().default(50).describe('Maximum number of results'),
      lang: z.enum(['en', 'zh']).default('en').describe('Output language'),
    },
    async ({ ra, dec, radius, mission, max_results, lang }: { ra: number; dec: number; radius: number; mission: string; max_results: number; lang: string }) => {
      const missionKey = mission.toLowerCase();
      const tableName = MISSION_TABLES[missionKey] ?? MISSION_TABLES['xmm'];

      const radiusDeg = radius / 60;
      const adql = `SELECT TOP ${max_results} observation_id, ra_deg, dec_deg, target_name, start_time, end_time FROM ${tableName} WHERE CONTAINS(POINT('ICRS', ra_deg, dec_deg), CIRCLE('ICRS', ${ra}, ${dec}, ${radiusDeg})) = 1`;

      const result = await tapQuery({ endpoint: ESASKY_TAP, adql, format: 'csv', maxrec: max_results });
      const resolvedMission = MISSION_TABLES[missionKey] ? missionKey.toUpperCase() : 'XMM';
      const title = lang === 'zh' ? `ESASky 查询结果: (${ra}, ${dec}) [${resolvedMission}]` : `ESASky Query Result: (${ra}, ${dec}) [${resolvedMission}]`;
      return { content: [{ type: 'text' as const, text: formatTapResult(result, title) }] };
    }
  );
}
