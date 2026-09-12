import { existsSync, statSync } from 'node:fs';
import { appendFile, mkdir, rename, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { TOKEN_STORE_PATH } from '../auth/token-store.js';

export const LOG_FILE_PATH =
  process.env.PA_MCP_LOG_PATH || join(dirname(TOKEN_STORE_PATH), 'pa-mcp.log');
const MAX_LOG_BYTES = 5 * 1024 * 1024;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export function redact(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+/gi, 'Bearer [REDACTED]')
    .replace(
      /(access_token|refresh_token|client_secret|authorization)["'=:\s]+[^\s,"'}]+/gi,
      '$1=[REDACTED]',
    );
}

export function errorDetails(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: redact(error.message),
      stack: error.stack ? redact(error.stack) : undefined,
    };
  }
  return { errorMessage: redact(String(error)) };
}

async function rotateIfNeeded(): Promise<void> {
  if (
    !existsSync(LOG_FILE_PATH) ||
    statSync(LOG_FILE_PATH).size < MAX_LOG_BYTES
  )
    return;
  const rotatedPath = `${LOG_FILE_PATH}.1`;
  try {
    await rm(rotatedPath, { force: true });
    await rename(LOG_FILE_PATH, rotatedPath);
  } catch {
    // A concurrent writer may already have rotated the file.
  }
}

async function write(
  level: LogLevel,
  message: string,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    await mkdir(dirname(LOG_FILE_PATH), { recursive: true });
    await rotateIfNeeded();
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message: redact(message),
      processId: process.pid,
      ...details,
    });
    await appendFile(LOG_FILE_PATH, `${entry}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });
  } catch {
    // Logging must never interrupt MCP protocol handling.
  }
}

export const logger = {
  debug: (message: string, details?: Record<string, unknown>) =>
    write('debug', message, details),
  info: (message: string, details?: Record<string, unknown>) =>
    write('info', message, details),
  warn: (message: string, details?: Record<string, unknown>) =>
    write('warn', message, details),
  error: (
    message: string,
    error?: unknown,
    details?: Record<string, unknown>,
  ) =>
    write('error', message, {
      ...(error === undefined ? {} : errorDetails(error)),
      ...details,
    }),
};

export function publicErrorMessage(error: unknown): string {
  return redact(error instanceof Error ? error.message : 'Unexpected error');
}
