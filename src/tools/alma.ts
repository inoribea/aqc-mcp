import { z } from 'zod';
import { executeAqc } from '../utils/executor.js';

let executeAlmaQuery: (ra?: number, dec?: number, radius?: number, catalog?: string, lang?: string) => Promise<string>;

export function registerAlmaTools(server: any) {
  executeAlmaQuery = async (ra?: number, dec?: number, radius?: number, catalog?: string, lang?: string) => {
    const args = ['alma', 'query'];
    if (ra !== undefined) args.push('--ra', ra.toString());
    if (dec !== undefined) args.push('--dec', dec.toString());
    if (radius !== undefined) args.push('--radius', radius.toString());
    if (catalog) args.push('--catalog', catalog);
    if (lang) args.push('--lang', lang);

    const result = await executeAqc(args);

    if (!result.success) {
      throw new Error(result.error);
    }

    return result.output || '';
  };

  server.tool(
    'alma_query',
    'Query ALMA archive for observations',
    {
      ra: z.number().optional().describe('Right Ascension (degrees)'),
      dec: z.number().optional().describe('Declination (degrees)'),
      radius: z.number().optional().describe('Search radius (degrees)'),
      catalog: z.string().optional().describe('Specific catalog to search'),
      lang: z.enum(['en', 'zh']).optional().describe('Output language'),
    },
    async ({ ra, dec, radius, catalog, lang }: any) => {
      const output = await executeAlmaQuery(ra, dec, radius, catalog, lang);

      return {
        content: [{
          type: 'text',
          text: output
        }]
      };
    }
  );
}

export { executeAlmaQuery };
