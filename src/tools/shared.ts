import type { CallToolResult } from '@modelcontextprotocol/server';
import { logger, publicErrorMessage } from '../logging/logger.js';

export function jsonText(value: unknown): CallToolResult {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
  };
}

export async function runTool(
  name: string,
  operation: () => Promise<CallToolResult>,
): Promise<CallToolResult> {
  const startedAt = Date.now();
  await logger.info('Tool started', { tool: name });
  try {
    const result = await operation();
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
