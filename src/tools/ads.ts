import { z } from 'zod';
import { executeAqc } from '../utils/executor.js';

let executeAdsQuery: (query?: string, lang?: string) => Promise<string>;

export function registerAdsTools(server: any) {
  executeAdsQuery = async (query?: string, lang?: string) => {
    const args = ['ads', 'query'];
    if (query) args.push('--query', query);
    if (lang) args.push('--lang', lang);

    const result = await executeAqc(args);

    if (!result.success) {
      throw new Error(result.error);
    }

    return result.output || '';
  };

  server.tool(
    'ads_query',
    'Query NASA Astrophysics Data System for papers and bibliographic information',
    {
      query: z.string().optional().describe('Search query (e.g., "latest papers", "highly cited reviews")'),
      lang: z.enum(['en', 'zh']).optional().describe('Output language'),
    },
    async ({ query, lang }: any) => {
      const output = await executeAdsQuery(query, lang);

      return {
        content: [{
          type: 'text',
          text: output
        }]
      };
    }
  );
}

export { executeAdsQuery };
