import { existsSync, readFileSync } from 'node:fs';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export interface StoredGoogleTokens {
  accessToken?: string;
  refreshToken: string;
  expiryDate?: number;
}

export interface StoredLinkedInTokens {
  accessToken: string;
  userUrn: string;
  refreshToken?: string;
  expiresAt?: number;
}

interface TokenStore {
  google?: StoredGoogleTokens;
  linkedin?: StoredLinkedInTokens;
}

export const TOKEN_STORE_PATH =
  process.env.PA_MCP_TOKEN_PATH || join(homedir(), '.pa-mcp', 'tokens.json');

function readStore(): TokenStore {
  if (!existsSync(TOKEN_STORE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(TOKEN_STORE_PATH, 'utf8')) as TokenStore;
  } catch (error) {
    throw new Error(
      `Could not read token store at ${TOKEN_STORE_PATH}: ${String(error)}`,
    );
  }
}

async function writeStore(store: TokenStore): Promise<void> {
  await mkdir(dirname(TOKEN_STORE_PATH), { recursive: true });
  const temporaryPath = `${TOKEN_STORE_PATH}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(store, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
  await rename(temporaryPath, TOKEN_STORE_PATH);
}

export function loadGoogleTokens(): StoredGoogleTokens | undefined {
  return readStore().google;
}

export async function saveGoogleTokens(
  tokens: StoredGoogleTokens,
): Promise<void> {
  await writeStore({ ...readStore(), google: tokens });
}

export function loadLinkedInTokens(): StoredLinkedInTokens | undefined {
  return readStore().linkedin;
}

export async function saveLinkedInTokens(
  tokens: StoredLinkedInTokens,
): Promise<void> {
  await writeStore({ ...readStore(), linkedin: tokens });
}
