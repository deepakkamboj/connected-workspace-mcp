import { resolve } from 'node:path';
import { config } from 'dotenv';
import { getEnvFilePath } from './arguments.js';

export function loadEnvironment(args: string[]): string | undefined {
  const envFileArgument = getEnvFilePath(args);
  const envFilePath = envFileArgument ? resolve(envFileArgument) : undefined;
  const result = config(
    envFilePath ? { path: envFilePath, quiet: true } : { quiet: true },
  );

  if (envFilePath && result.error) {
    throw new Error(`Unable to load environment file: ${envFilePath}`, {
      cause: result.error,
    });
  }

  return envFilePath;
}
