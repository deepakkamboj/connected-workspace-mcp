import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function getCurrentDir(): string {
  return path.dirname(fileURLToPath(import.meta.url));
}

function findProjectRoot(startDir: string): string {
  let currentDir = startDir;

  while (currentDir !== path.parse(currentDir).root) {
    if (fs.existsSync(path.join(currentDir, 'package.json'))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  return process.cwd();
}

interface PackageMetadata {
  name?: string;
  version?: string;
}

export const projectRoot = findProjectRoot(getCurrentDir());

export function getPackageMetadata(): Required<PackageMetadata> {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const packageJson = JSON.parse(
    fs.readFileSync(packageJsonPath, 'utf8'),
  ) as PackageMetadata;

  return {
    name: packageJson.name || 'connected-workspace-mcp',
    version: packageJson.version || '0.1.0',
  };
}
