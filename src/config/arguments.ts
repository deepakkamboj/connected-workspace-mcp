export function getEnvFilePath(args: string[]): string | undefined {
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === '--env-file') {
      const path = args[index + 1];
      if (!path || path.startsWith('--')) {
        throw new Error('--env-file requires a path.');
      }
      return path;
    }

    if (argument.startsWith('--env-file=')) {
      const path = argument.slice('--env-file='.length);
      if (!path) throw new Error('--env-file requires a path.');
      return path;
    }
  }

  return undefined;
}
