import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { executeAqc } from '../utils/executor.js';

export async function listTools(mcpServer: McpServer) {
  // SIMBAD - simbad object NAME
  mcpServer.registerTool(
    'simbad_query',
    {
      description: 'Query the SIMBAD astronomical database for an object',
    },
    async ({ object_name, lang }: any) => {
      const args = ['simbad', 'object', object_name];
      if (lang) args.push('--lang', lang);

      const result = await executeAqc(args);
      if (!result.success) throw new Error(result.error);

      return { content: [{ type: 'text', text: result.output || '' }] };
    }
  );

  // VizieR - vizier object TARGET RADIUS
  mcpServer.registerTool(
    'vizier_query',
    {
      description: 'Query the VizieR catalog database for an object or coordinates',
    },
    async ({ target, radius, catalog, lang }: any) => {
      const args = ['vizier', 'object', target, radius];
      if (catalog) args.push('--catalog', catalog);
      if (lang) args.push('--lang', lang);

      const result = await executeAqc(args);
      if (!result.success) throw new Error(result.error);

      return { content: [{ type: 'text', text: result.output || '' }] };
    }
  );

  // ALMA - alma object OBJECT_NAME
  mcpServer.registerTool(
    'alma_query',
    {
      description: 'Query the ALMA archive for observations of an object',
    },
    async ({ object_name, lang }: any) => {
      const args = ['alma', 'object', object_name];
      if (lang) args.push('--lang', lang);

      const result = await executeAqc(args);
      if (!result.success) throw new Error(result.error);

      return { content: [{ type: 'text', text: result.output || '' }] };
    }
  );

  // ADS - ads query [QUERY_STRING]
  mcpServer.registerTool(
    'ads_query',
    {
      description: 'Query NASA Astrophysics Data System for papers and bibliographic information',
    },
    async ({ query, latest, review, lang }: any) => {
      const args = ['ads', 'query'];

      if (latest) args.push('--latest');
      if (review) args.push('--review');
      if (query) args.push(query);
      if (lang) args.push('--lang', lang);

      const result = await executeAqc(args);
      if (!result.success) throw new Error(result.error);

      return { content: [{ type: 'text', text: result.output || '' }] };
    }
  );

  // Gaia - gaia cone-search TARGET --radius RADIUS
  mcpServer.registerTool(
    'gaia_cone_search',
    {
      description: 'Query Gaia archive via cone search around an object or coordinates',
    },
    async ({ target, radius, lang }: any) => {
      const args = ['gaia', 'cone-search', target, '--radius', radius || '10arcsec'];
      if (lang) args.push('--lang', lang);

      const result = await executeAqc(args);
      if (!result.success) throw new Error(result.error);

      return { content: [{ type: 'text', text: result.output || '' }] };
    }
  );
}
