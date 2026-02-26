#!/usr/bin/env node
import { program } from 'commander';
import { startSseAndStreamableHttpMcpServer } from 'mcp-http-server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { listTools } from './tools/index.js';

const VERSION = '1.2.5';

async function createMcpServer() {
  const server = new McpServer(
    {
      name: 'astroquery-mcp',
      version: VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  await listTools(server);

  return server;
}

program
  .name('aqc-mcp')
  .description('MCP server for astroquery-cli')
  .version(VERSION)
  .option('--port <port>', 'HTTP server port')
  .option('--host <host>', 'HTTP server host')
  .action(async (options) => {
    try {
      const server = await createMcpServer();

      if (options.port || options.host) {
        // HTTP mode with SSE support
        await startSseAndStreamableHttpMcpServer({
          host: options.host,
          port: parseInt(options.port),
          // @ts-ignore
          createMcpServer: async ({ headers }) => {
            return server;
          },
        });
      } else {
        // stdio mode
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error('AstroQuery MCP server running on stdio');
      }
    } catch (error) {
      console.error('Fatal error:', error);
      process.exit(1);
    }
  });

program.parse();
