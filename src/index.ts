#!/usr/bin/env node
import './config/bootstrap.js';
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { google } from 'googleapis';
import { createGoogleAuth } from './auth/google/index.js';
import { registerCalendarTools } from './tools/calendar/index.js';
import { registerGmailTools } from './tools/gmail/index.js';
import { registerLinkedInTools } from './tools/linkedin/index.js';
import { logger, LOG_FILE_PATH } from './logging/logger.js';
import { getPackageMetadata } from './utils/common.js';

const auth = createGoogleAuth();
const gmail = google.gmail({ version: 'v1', auth });
const calendar = google.calendar({ version: 'v3', auth });
const packageMetadata = getPackageMetadata();
const server = new McpServer(packageMetadata);

try {
  registerGmailTools(server, gmail);
  registerCalendarTools(server, calendar);
  registerLinkedInTools(server);
  await logger.info('All MCP tools registered');
} catch (error) {
  await logger.error('Failed to register MCP tools', error);
  process.exit(1);
}

let shuttingDown = false;

async function cleanup(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  try {
    await logger.info('MCP server shutting down', { signal });
    await server.close();
    await logger.info('MCP server shutdown completed');
    process.exit(0);
  } catch (error) {
    await logger.error('MCP server shutdown failed', error, { signal });
    process.exit(1);
  }
}

async function main() {
  await logger.info('MCP server starting', {
    logFile: LOG_FILE_PATH,
    name: packageMetadata.name,
    version: packageMetadata.version,
  });
  await server.connect(new StdioServerTransport());
  await logger.info('MCP server connected');
}

main().catch((error: unknown) => {
  void logger
    .error('MCP server failed to start', error)
    .finally(() => process.exit(1));
});

process.on('uncaughtException', (error) => {
  void logger.error('Uncaught exception', error).finally(() => process.exit(1));
});

process.on('unhandledRejection', (error) => {
  void logger.error('Unhandled rejection', error);
});

process.on('SIGTERM', () => void cleanup('SIGTERM'));
process.on('SIGINT', () => void cleanup('SIGINT'));
