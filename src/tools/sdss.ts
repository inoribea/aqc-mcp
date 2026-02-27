import { z } from 'zod';
import { restGet } from '../utils/http.js';

const SDSS_ENDPOINT = 'https://skyserver.sdss.org/dr18/SkyServerWS/SearchTools/SqlSearch';

interface SdssRow {
  [key: string]: unknown;
}

interface SdssResponse {
  Rows?: SdssRow[];
}

async function sdssQuery(sql: string, maxResults: number): Promise<{ columns: string[]; rows: SdssRow[] }> {
  const url = `${SDSS_ENDPOINT}?cmd=${encodeURIComponent(sql)}&format=json`;
  const raw = await restGet(url, { timeout: 30000 }) as SdssResponse[];

  const data = Array.isArray(raw) && raw.length > 0 && raw[0].Rows ? raw[0].Rows : [];
  if (data.length === 0) return { columns: [], rows: [] };

  const columns = Object.keys(data[0]);
  return { columns, rows: data.slice(0, maxResults) };
}

function formatSdssResult(result: { columns: string[]; rows: SdssRow[] }, title: string): string {
  if (result.rows.length === 0) return `${title}\n\nNo results found.`;

  const lines: string[] = [title, `Results: ${result.rows.length}`, ''];
  for (const row of result.rows) {
    const parts = result.columns.map(c => `${c}: ${row[c] ?? 'N/A'}`);
    lines.push(parts.join(' | '));
  }
  return lines.join('\n');
}

export function registerSdssTools(server: any) {
  server.tool(
    'sdss_query',
    'Query the Sloan Digital Sky Survey (SDSS DR18). Supports cone search, specobjid lookup, and plate/mjd/fiberid lookup.',
    {
      query_type: z.enum(['cone', 'specobjid', 'plate_mjd_fiberid']).describe('Query type'),
      ra: z.number().optional().describe('Right Ascension in degrees (cone search)'),
      dec: z.number().optional().describe('Declination in degrees (cone search)'),
      radius: z.number().default(2).describe('Search radius in arcminutes (cone search, max 3)'),
      specobjid: z.number().optional().describe('Spectroscopic object ID'),
      plate: z.number().optional().describe('Plate number'),
      mjd: z.number().optional().describe('Modified Julian Date'),
      fiberid: z.number().optional().describe('Fiber ID'),
      objtype: z.string().optional().describe('Filter by object type (STAR, GALAXY, QSO) — only for specobjid/plate queries'),
      max_results: z.number().default(25).describe('Maximum results'),
      lang: z.enum(['en', 'zh']).default('en').describe('Output language'),
    },
    async ({ query_type, ra, dec, radius, specobjid, plate, mjd, fiberid, objtype, max_results, lang }: {
      query_type: 'cone' | 'specobjid' | 'plate_mjd_fiberid';
      ra?: number; dec?: number; radius: number;
      specobjid?: number; plate?: number; mjd?: number; fiberid?: number;
      objtype?: string; max_results: number; lang: string;
    }) => {
      let sql: string;

      switch (query_type) {
        case 'cone': {
          if (ra === undefined || dec === undefined) {
            return { content: [{ type: 'text' as const, text: lang === 'zh' ? '锥形搜索需要 ra 和 dec 参数' : 'Cone search requires ra and dec parameters' }] };
          }
          const r = Math.min(radius, 3);
          sql = `SELECT TOP ${max_results} p.objID, p.ra, p.dec, p.u, p.g, p.r, p.i, p.z, p.type, p.clean FROM PhotoObj p JOIN dbo.fGetNearbyObjEq(${ra}, ${dec}, ${r}) n ON p.objID = n.objID`;
          break;
        }
        case 'specobjid': {
          if (specobjid === undefined) {
            return { content: [{ type: 'text' as const, text: lang === 'zh' ? '需要 specobjid 参数' : 'specobjid parameter is required' }] };
          }
          const where = objtype ? ` AND objtype = '${objtype.toUpperCase()}'` : '';
          sql = `SELECT TOP ${max_results} * FROM SpecObj WHERE specobjid = ${specobjid}${where}`;
          break;
        }
        case 'plate_mjd_fiberid': {
          if (plate === undefined || mjd === undefined || fiberid === undefined) {
            return { content: [{ type: 'text' as const, text: lang === 'zh' ? '需要 plate、mjd 和 fiberid 参数' : 'plate, mjd, and fiberid parameters are all required' }] };
          }
          const where2 = objtype ? ` AND objtype = '${objtype.toUpperCase()}'` : '';
          sql = `SELECT TOP ${max_results} * FROM SpecObj WHERE plate = ${plate} AND mjd = ${mjd} AND fiberid = ${fiberid}${where2}`;
          break;
        }
      }

      try {
        const result = await sdssQuery(sql, max_results);
        const title = lang === 'zh' ? `=== SDSS DR18 查询结果 ===` : `=== SDSS DR18 Query Results ===`;
        return { content: [{ type: 'text' as const, text: formatSdssResult(result, title) }] };
      } catch (e: any) {
        return { content: [{ type: 'text' as const, text: `SDSS query error: ${e.message}` }] };
      }
    }
  );
}
