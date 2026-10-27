import type { CallToolResult } from '@modelcontextprotocol/server';
import { logger, publicErrorMessage } from '../logging/logger.js';

export function jsonText(value: unknown): CallToolResult {
  const structuredContent =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : { result: value };
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    structuredContent,
  };
}

export const readOnlyTool = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

export const writeTool = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
} as const;

export const destructiveTool = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: true,
} as const;

interface RunToolOptions {
  retry?: boolean;
  maxAttempts?: number;
  initialDelayMs?: number;
}

function errorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const candidate = error as {
    code?: unknown;
    status?: unknown;
    response?: { status?: unknown };
  };
  const value =
    candidate.response?.status ?? candidate.status ?? candidate.code;
  return typeof value === 'number' ? value : Number(value) || undefined;
}

function isRetryable(error: unknown): boolean {
  const status = errorStatus(error);
  return status === 429 || (status !== undefined && status >= 500);
}

async function delay(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function runTool(
  name: string,
  operation: () => Promise<CallToolResult>,
  options: RunToolOptions = {},
): Promise<CallToolResult> {
  const startedAt = Date.now();
  await logger.info('Tool started', { tool: name });
  try {
    const maxAttempts = options.retry ? (options.maxAttempts ?? 3) : 1;
    let attempt = 1;
    let result: CallToolResult;
    for (;;) {
      try {
        result = await operation();
        break;
      } catch (error) {
        if (attempt >= maxAttempts || !isRetryable(error)) throw error;
        await logger.info('Tool retrying', { tool: name, attempt });
        await delay((options.initialDelayMs ?? 100) * 2 ** (attempt - 1));
        attempt += 1;
      }
    }
    await logger.info('Tool completed', {
      tool: name,
      durationMs: Date.now() - startedAt,
    });
    return result;
  } catch (error) {
    await logger.error('Tool failed', error, {
      tool: name,
      durationMs: Date.now() - startedAt,
    });
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Unable to complete ${name}: ${publicErrorMessage(error)}`,
        },
      ],
    };
  }
}
