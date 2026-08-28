#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config/env.js';
import { createServer } from './server.js';

async function main() {
  const config = loadConfig();
  const server = createServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('open-zzjilu-mcp-server 启动失败:', err instanceof Error ? err.message : err);
  process.exit(1);
});
