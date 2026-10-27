import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile, access } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const metadata = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const published = process.argv.includes('--published');
const directory = await mkdtemp(join(tmpdir(), 'connected-workspace-package-'));
const npmCli = process.env.npm_execpath;
assert.ok(npmCli, 'Run this check with npm run test:package.');
const environment = { ...process.env };
for (const name of Object.keys(environment)) {
  if (/^(GOOGLE_|LINKEDIN_|PA_MCP_)/.test(name)) delete environment[name];
}

function npm(args, cwd = directory) {
  return execFileSync(process.execPath, [npmCli, ...args], {
    cwd,
    env: environment,
    encoding: 'utf8',
    timeout: 180_000,
    maxBuffer: 5 * 1024 * 1024,
  });
}

function start(executable, args) {
  const child = spawn(process.execPath, [executable, ...args], {
    cwd: directory,
    env: environment,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const exited = once(child, 'exit');
  let stderr = '';
  child.stderr.setEncoding('utf8').on('data', (text) => {
    stderr += text;
  });
  const lines = createInterface({ input: child.stdout });
  return {
    child,
    lines,
    stderr: () => stderr,
    async close() {
      child.stdin.end();
      let timer;
      try {
        await Promise.race([
          exited,
          new Promise((resolve) => {
            timer = setTimeout(resolve, 5_000);
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
      if (child.exitCode === null && child.signalCode === null) child.kill();
      await exited;
      lines.close();
    },
  };
}

async function unusedPort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return address.port;
}

async function checkAuthorization(executable, provider, envFile) {
  const port = await unusedPort();
  const callback = `http://127.0.0.1:${port}/callback`;
  await writeFile(
    envFile,
    `GOOGLE_CLIENT_ID=package-test\nGOOGLE_CLIENT_SECRET=package-test\nLINKEDIN_CLIENT_ID=package-test\nLINKEDIN_CLIENT_SECRET=package-test\n${provider}_REDIRECT_URI=${callback}\n`,
  );
  const process = start(executable, ['--env-file', envFile]);
  try {
    const url = await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () =>
          reject(
            new Error(`Authorization startup timed out: ${process.stderr()}`),
          ),
        15_000,
      );
      process.child.once('exit', () => {
        clearTimeout(timer);
        reject(new Error(`Authorization exited early: ${process.stderr()}`));
      });
      process.lines.on('line', (line) => {
        if (line.startsWith('https://')) {
          clearTimeout(timer);
          resolve(new URL(line));
        }
      });
    });
    assert.equal(url.searchParams.get('redirect_uri'), callback);
    assert.match(url.searchParams.get('state'), /^[a-f0-9]{48}$/);
    const rejected = await fetch(`${callback}?code=invalid&state=invalid`);
    assert.equal(rejected.status, 400, 'OAuth must reject an incorrect state.');
  } finally {
    await process.close();
  }
}

async function checkServer(executable, envFile, packageSpec) {
  const tokenPath = join(directory, 'tokens.json');
  await writeFile(tokenPath, '{"google":{"refreshToken":"package-test"}}');
  await writeFile(
    envFile,
    `GOOGLE_CLIENT_ID=package-test\nGOOGLE_CLIENT_SECRET=package-test\nPA_MCP_TOKEN_PATH=${JSON.stringify(tokenPath)}\nPA_MCP_LOG_PATH=${JSON.stringify(join(directory, 'server.log'))}\n`,
  );
  const process = packageSpec
    ? start(npmCli, [
        'exec',
        '--yes',
        '--cache',
        join(directory, 'npx-cache'),
        '--package',
        packageSpec,
        '--',
        'connected-workspace-mcp',
        '--env-file',
        envFile,
      ])
    : start(executable, ['--env-file', envFile]);
  let id = 0;
  const pending = new Map();
  let protocolError;
  process.lines.on('line', (line) => {
    try {
      const message = JSON.parse(line);
      pending.get(message.id)?.(message);
    } catch (error) {
      protocolError = error;
    }
  });
  async function request(method, params = {}) {
    const requestId = ++id;
    const response = await new Promise((resolve, reject) => {
      const onExit = (code) => {
        clearTimeout(timer);
        pending.delete(requestId);
        reject(
          new Error(`${method}: process exited (${code}): ${process.stderr()}`),
        );
      };
      const timer = setTimeout(() => {
        process.child.off('exit', onExit);
        pending.delete(requestId);
        reject(new Error(`${method} timed out: ${process.stderr()}`));
      }, 120_000);
      process.child.once('exit', onExit);
      pending.set(requestId, (message) => {
        clearTimeout(timer);
        process.child.off('exit', onExit);
        pending.delete(requestId);
        resolve(message);
      });
      process.child.stdin.write(
        `${JSON.stringify({ jsonrpc: '2.0', id: requestId, method, params })}\n`,
      );
    });
    assert.equal(response.error, undefined, JSON.stringify(response.error));
    return response.result;
  }
  try {
    const initialized = await request('initialize', {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'package-smoke-test', version: '1.0.0' },
    });
    assert.equal(initialized.serverInfo.name, metadata.name);
    assert.equal(initialized.serverInfo.version, metadata.version);
    process.child.stdin.write(
      '{"jsonrpc":"2.0","method":"notifications/initialized"}\n',
    );
    const listed = await request('tools/list');
    const tools = listed.tools.map((tool) => tool.name);
    assert.equal(new Set(tools).size, 42);
    for (const [prefix, count] of Object.entries({
      gmail: 5,
      calendar: 5,
      sheets: 7,
      drive: 6,
      contacts: 6,
      tasks: 6,
      linkedin: 7,
    })) {
      assert.equal(
        tools.filter((name) => name.startsWith(`${prefix}_`)).length,
        count,
        `Missing ${prefix} tools in the installed package.`,
      );
    }
    const unauthorized = await request('tools/call', {
      name: 'linkedin_get_profile',
      arguments: {},
    });
    assert.equal(unauthorized.isError, true);
    assert.match(unauthorized.content[0].text, /LinkedIn is not authorized/);
    assert.equal(
      protocolError,
      undefined,
      'stdout must contain only MCP messages.',
    );
  } finally {
    await process.close();
  }
}

try {
  const [packed] = JSON.parse(
    npm(
      [
        'pack',
        ...(published ? [`${metadata.name}@${metadata.version}`] : []),
        '--json',
        '--ignore-scripts',
        '--pack-destination',
        directory,
      ],
      root,
    ),
  );
  const files = new Set(packed.files.map((file) => file.path));
  for (const required of [
    'package.json',
    'README.md',
    'LICENSE',
    '.env.example',
    'examples/.env.example',
    'examples/USAGE.md',
    ...Object.values(metadata.bin),
  ]) {
    assert.ok(files.has(required), `Missing package file: ${required}`);
  }
  for (const path of files) {
    assert.ok(
      /^(dist\/src\/.*\.js|docs\/.*\.md|examples\/(USAGE\.md|\.env\.example)|package\.json|README\.md|CONTRIBUTING\.md|LICENSE|\.env\.example)$/.test(
        path,
      ),
      `Unexpected file in npm tarball: ${path}`,
    );
  }
  assert.equal(
    (await readFile(join(root, '.env.example'), 'utf8'))
      .trim()
      .replaceAll('\r\n', '\n'),
    (await readFile(join(root, 'examples', '.env.example'), 'utf8'))
      .trim()
      .replaceAll('\r\n', '\n'),
    'The environment templates must stay in sync.',
  );
  await writeFile(join(directory, 'package.json'), '{"private":true}');
  npm([
    'install',
    '--ignore-scripts',
    '--omit=dev',
    '--no-audit',
    '--no-fund',
    join(directory, packed.filename),
  ]);
  const installed = join(directory, 'node_modules', metadata.name);
  for (const [name, path] of Object.entries(metadata.bin)) {
    assert.match(
      await readFile(join(installed, path), 'utf8'),
      /^#!\/usr\/bin\/env node/,
    );
    await access(
      join(
        directory,
        'node_modules',
        '.bin',
        `${name}${process.platform === 'win32' ? '.cmd' : ''}`,
      ),
    );
  }
  const envFile = join(directory, 'consumer.env');
  await checkAuthorization(
    join(installed, metadata.bin['connected-workspace-google-auth']),
    'GOOGLE',
    envFile,
  );
  await checkAuthorization(
    join(installed, metadata.bin['connected-workspace-linkedin-auth']),
    'LINKEDIN',
    envFile,
  );
  await checkServer(
    join(installed, metadata.bin['connected-workspace-mcp']),
    envFile,
  );
  await checkServer(
    undefined,
    envFile,
    published
      ? `${metadata.name}@${metadata.version}`
      : join(directory, packed.filename),
  );
  console.log(
    `Package verified: ${files.size} files, three executables, 42 MCP tools, isolated consumer installation and fresh npm exec cache${published ? ' from the published npm version' : ''}, no live provider calls.`,
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
