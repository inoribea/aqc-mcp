#!/usr/bin/env node
import { startSseAndStreamableHttpMcpServer } from 'mcp-http-server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAllTools } from './tools/index.js';

const VERSION = '2.0.0';

function createMcpServer() {
  const server = new McpServer(
    { name: 'astroquery-mcp', version: VERSION },
    { capabilities: { tools: {} } }
  );
  registerAllTools(server);
  return server;
}

async function main() {
  const args = process.argv.slice(2);
  const portIdx = args.indexOf('--port');
  const hostIdx = args.indexOf('--host');
  const port = portIdx !== -1 ? parseInt(args[portIdx + 1], 10) : undefined;
  const host = hostIdx !== -1 ? args[hostIdx + 1] : undefined;

  try {
    if (port || host) {
      await startSseAndStreamableHttpMcpServer({
        host,
        port: port!,
        // @ts-ignore - createMcpServer signature mismatch
        createMcpServer: async () => createMcpServer(),
      });
    } else {
      const server = createMcpServer();
      const transport = new StdioServerTransport();
      await server.connect(transport);
      console.error('AstroQuery MCP server running on stdio');
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
