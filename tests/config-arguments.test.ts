import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getEnvFilePath } from '../src/config/arguments.js';
import { loadEnvironment } from '../src/config/environment.js';

describe('environment file arguments', () => {
  it('reads a separate env-file path argument', () => {
    expect(getEnvFilePath(['--env-file', 'C:/config/workspace.env'])).toBe(
      'C:/config/workspace.env',
    );
  });

  it('reads an inline env-file path argument', () => {
    expect(getEnvFilePath(['--env-file=C:/config/workspace.env'])).toBe(
      'C:/config/workspace.env',
    );
  });

  it('returns undefined when no env-file argument is present', () => {
    expect(getEnvFilePath(['--other-option'])).toBeUndefined();
  });

  it.each([['--env-file'], ['--env-file='], ['--env-file', '--other-option']])(
    'rejects a missing path in %j',
    (...args) => {
      expect(() => getEnvFilePath(args)).toThrow('--env-file requires a path.');
    },
  );

  it('loads an explicit env file without overriding host values', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pa-mcp-config-'));
    const envFile = join(directory, '.env');
    await writeFile(
      envFile,
      'PA_MCP_CONFIG_TEST=from-file\nPA_MCP_CONFIG_EXISTING=from-file\n',
      'utf8',
    );
    process.env.PA_MCP_CONFIG_EXISTING = 'from-host';

    try {
      expect(loadEnvironment(['--env-file', envFile])).toBe(envFile);
      expect(process.env.PA_MCP_CONFIG_TEST).toBe('from-file');
      expect(process.env.PA_MCP_CONFIG_EXISTING).toBe('from-host');
    } finally {
      delete process.env.PA_MCP_CONFIG_TEST;
      delete process.env.PA_MCP_CONFIG_EXISTING;
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('rejects an explicit env file that cannot be loaded', () => {
    const missingPath = join(tmpdir(), 'pa-mcp-missing.env');
    expect(() => loadEnvironment(['--env-file', missingPath])).toThrow(
      `Unable to load environment file: ${missingPath}`,
    );
  });
});
