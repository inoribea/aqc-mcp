import { z } from 'zod';
import { executeAqc } from '../utils/executor.js';

let executeSimbadQuery: (identifier: string, lang?: string) => Promise<string>;

export function registerSimbadTools(server: any) {
  executeSimbadQuery = async (identifier: string, lang?: string) => {
    const args = ['simbad', 'query', '--identifier', identifier];
    if (lang) args.push('--lang', lang);

    const result = await executeAqc(args);

    if (!result.success) {
      throw new Error(result.error);
    }

    return result.output || '';
  };

  server.tool(
    'simbad_query',
    'Query the SIMBAD astronomical database for an object identifier',
    {
      identifier: z.string().describe('Object identifier (e.g., "M31", "NGC 1234")'),
      lang: z.enum(['en', 'zh']).optional().describe('Output language'),
    },
    async ({ identifier, lang }: any) => {
      const output = await executeSimbadQuery(identifier, lang);

      return {
        content: [{
          type: 'text',
          text: output
        }]
      };
    }
  );
}

export { executeSimbadQuery };
