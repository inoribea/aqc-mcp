import { z } from 'zod';
import { executeAqc } from '../utils/executor.js';

let executeVizierQuery: (catalog: string, ra?: number, dec?: number, radius?: number, lang?: string) => Promise<string>;

export function registerVizierTools(server: any) {
  executeVizierQuery = async (catalog: string, ra?: number, dec?: number, radius?: number, lang?: string) => {
    const args = ['vizier', 'query', '--catalog', catalog];
    if (ra !== undefined) args.push('--ra', ra.toString());
    if (dec !== undefined) args.push('--dec', dec.toString());
    if (radius !== undefined) args.push('--radius', radius.toString());
    if (lang) args.push('--lang', lang);

    const result = await executeAqc(args);

    if (!result.success) {
      throw new Error(result.error);
    }

    return result.output || '';
  };

  server.tool(
    'vizier_query',
    'Query the VizieR catalog database for a specific catalog',
    {
      catalog: z.string().describe('Catalog identifier (e.g., "VII/118")'),
      ra: z.number().optional().describe('Right Ascension (degrees)'),
      dec: z.number().optional().describe('Declination (degrees)'),
      radius: z.number().optional().describe('Search radius (degrees)'),
      lang: z.enum(['en', 'zh']).optional().describe('Output language'),
    },
    async ({ catalog, ra, dec, radius, lang }: any) => {
      const output = await executeVizierQuery(catalog, ra, dec, radius, lang);

      return {
        content: [{
          type: 'text',
          text: output
        }]
      };
    }
  );
}

export { executeVizierQuery };
