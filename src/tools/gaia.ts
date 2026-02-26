import { z } from 'zod';
import { executeAqc } from '../utils/executor.js';

let executeGaiaConeSearch: (ra: number, dec: number, radius?: number, lang?: string) => Promise<string>;

export function registerGaiaTools(server: any) {
  executeGaiaConeSearch = async (ra: number, dec: number, radius?: number, lang?: string) => {
    const args = ['gaia', 'cone-search', '--ra', ra.toString(), '--dec', dec.toString(), '--radius', (radius || 1).toString()];
    if (lang) args.push('--lang', lang);

    const result = await executeAqc(args);

    if (!result.success) {
      throw new Error(result.error);
    }

    return result.output || '';
  };

  server.tool(
    'gaia_cone_search',
    'Query Gaia archive via cone search',
    {
      ra: z.number().describe('Right Ascension (degrees)'),
      dec: z.number().describe('Declination (degrees)'),
      radius: z.number().optional().default(1).describe('Search radius (degrees)'),
      lang: z.enum(['en', 'zh']).optional().describe('Output language'),
    },
    async ({ ra, dec, radius, lang }: any) => {
      const output = await executeGaiaConeSearch(ra, dec, radius, lang);

      return {
        content: [{
          type: 'text',
          text: output
        }]
      };
    }
  );
}

export { executeGaiaConeSearch };
