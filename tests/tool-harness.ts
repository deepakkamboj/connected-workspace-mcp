import type { McpServer } from '@modelcontextprotocol/server';
import type { CallToolResult } from '@modelcontextprotocol/server';

export type CapturedToolHandler = (args: any) => Promise<CallToolResult>;

export class ToolHarness {
  readonly handlers = new Map<string, CapturedToolHandler>();

  readonly server = {
    registerTool: (
      name: string,
      _config: unknown,
      handler: CapturedToolHandler,
    ) => {
      this.handlers.set(name, handler);
      return {};
    },
  } as unknown as McpServer;

  handler(name: string): CapturedToolHandler {
    const handler = this.handlers.get(name);
    if (!handler) throw new Error(`Tool was not registered: ${name}`);
    return handler;
  }
}

export function parsedText(result: CallToolResult): any {
  const content = result.content[0];
  if (!content || content.type !== 'text')
    throw new Error('Expected a text tool result');
  return JSON.parse(content.text);
}
