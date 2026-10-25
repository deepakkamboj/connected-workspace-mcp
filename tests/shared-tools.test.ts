import { jsonText, runTool } from '../src/tools/shared.js';
import { publicErrorMessage, redact } from '../src/logging/logger.js';

describe('shared tool execution', () => {
  it('wraps arrays for structured content without changing text results', () => {
    const result = jsonText([{ id: 'one' }]);
    expect(result.structuredContent).toEqual({ result: [{ id: 'one' }] });
    expect(result.content[0]).toEqual({
      type: 'text',
      text: '[\n  {\n    "id": "one"\n  }\n]',
    });
  });

  it('retries a transient read failure and returns the successful result', async () => {
    const operation = jest
      .fn()
      .mockRejectedValueOnce({ response: { status: 429 } })
      .mockRejectedValueOnce({ status: 503 })
      .mockResolvedValue(jsonText({ ok: true }));
    const result = await runTool('read', operation, {
      retry: true,
      initialDelayMs: 0,
    });
    expect(operation).toHaveBeenCalledTimes(3);
    expect(result.isError).not.toBe(true);
  });

  it('stops retrying after the attempt limit', async () => {
    const operation = jest.fn().mockRejectedValue({ code: 503 });
    const result = await runTool('read', operation, {
      retry: true,
      maxAttempts: 2,
      initialDelayMs: 0,
    });
    expect(operation).toHaveBeenCalledTimes(2);
    expect(result.isError).toBe(true);
  });

  it('does not retry permanent failures or writes', async () => {
    const permanent = jest.fn().mockRejectedValue({ status: 403 });
    const write = jest.fn().mockRejectedValue({ status: 503 });
    expect((await runTool('read', permanent, { retry: true })).isError).toBe(
      true,
    );
    expect((await runTool('write', write)).isError).toBe(true);
    expect(permanent).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('redacts credentials from public error messages', () => {
    const message =
      'Bearer fake-token access_token=fake-access refresh_token=fake-refresh client_secret=fake-secret';
    const redacted = redact(message);
    expect(redacted).not.toMatch(/fake-(token|access|refresh|secret)/);
    expect(publicErrorMessage(new Error(message))).toBe(redacted);
    expect(publicErrorMessage({ arbitrary: 'private' })).toBe(
      'Unexpected error',
    );
  });
});
