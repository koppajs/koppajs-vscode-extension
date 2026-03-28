import fs from 'fs';
import path from 'path';
import ts from 'typescript';

interface KpaProjectConfig {
  configPath: string;
  baseDirectory: string;
  baseUrl?: string;
  paths: Readonly<Record<string, readonly string[]>>;
}

const projectConfigCache = new Map<string, KpaProjectConfig | null>();

export interface ResolvedKpaProjectConfig extends KpaProjectConfig {}

export function resolveWorkspaceImportPath(
  importPath: string,
  sourcePath: string | undefined,
  allowedExtensions: readonly string[],
): string | undefined {
  if (!sourcePath) {
    return undefined;
  }

  const directResolution = resolveCandidatePath(
    importPath.startsWith('.') || path.isAbsolute(importPath)
      ? path.isAbsolute(importPath)
        ? importPath
        : path.resolve(path.dirname(sourcePath), importPath)
      : undefined,
    allowedExtensions,
  );

  if (directResolution) {
    return directResolution;
  }

  const projectConfig = findNearestProjectConfig(sourcePath);

  if (!projectConfig) {
    return undefined;
  }

  const baseUrlDirectory = projectConfig.baseUrl
    ? path.resolve(projectConfig.baseDirectory, projectConfig.baseUrl)
    : projectConfig.baseDirectory;
  const mappedCandidates = resolvePathAliases(importPath, projectConfig, baseUrlDirectory);

  for (const candidatePath of mappedCandidates) {
    const resolvedCandidate = resolveCandidatePath(candidatePath, allowedExtensions);

    if (resolvedCandidate) {
      return resolvedCandidate;
    }
  }

  if (!importPath.startsWith('.') && !path.isAbsolute(importPath)) {
    return resolveCandidatePath(path.resolve(baseUrlDirectory, importPath), allowedExtensions);
  }

  return undefined;
}

export function clearProjectConfigCache(): void {
  projectConfigCache.clear();
}

export function invalidateProjectConfigCacheForPath(filePath: string): void {
  let currentDirectory = path.dirname(filePath);
  let didReachFilesystemRoot = false;

  while (!didReachFilesystemRoot) {
    projectConfigCache.delete(currentDirectory);

    const parentDirectory = path.dirname(currentDirectory);

    if (parentDirectory === currentDirectory) {
      didReachFilesystemRoot = true;
      continue;
    }

    currentDirectory = parentDirectory;
  }
}

export function getNearestProjectConfig(
  sourcePath: string | undefined,
): ResolvedKpaProjectConfig | undefined {
  if (!sourcePath) {
    return undefined;
  }

  return findNearestProjectConfig(sourcePath);
}

export function getNearestProjectConfigPath(sourcePath: string | undefined): string | undefined {
  return getNearestProjectConfig(sourcePath)?.configPath;
}

function findNearestProjectConfig(sourcePath: string): KpaProjectConfig | undefined {
  let currentDirectory = path.dirname(sourcePath);
  let didReachFilesystemRoot = false;

  while (!didReachFilesystemRoot) {
    const cachedEntry = projectConfigCache.get(currentDirectory);

    if (cachedEntry !== undefined) {
      return cachedEntry ?? undefined;
    }

    const tsconfigPath = path.join(currentDirectory, 'tsconfig.json');
    const jsconfigPath = path.join(currentDirectory, 'jsconfig.json');
    const configPath = fs.existsSync(tsconfigPath)
      ? tsconfigPath
      : fs.existsSync(jsconfigPath)
        ? jsconfigPath
        : undefined;

    if (configPath) {
      const projectConfig = readProjectConfig(configPath);
      projectConfigCache.set(currentDirectory, projectConfig ?? null);
      return projectConfig ?? undefined;
    }

    const parentDirectory = path.dirname(currentDirectory);

    if (parentDirectory === currentDirectory) {
      projectConfigCache.set(currentDirectory, null);
      didReachFilesystemRoot = true;
      continue;
    }

    currentDirectory = parentDirectory;
  }

  return undefined;
}

function readProjectConfig(configPath: string): KpaProjectConfig | undefined {
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

  if (configFile.error || !configFile.config) {
    return undefined;
  }

  const compilerOptions = (configFile.config.compilerOptions ?? {}) as {
    baseUrl?: string;
    paths?: Record<string, readonly string[]>;
  };

  return {
    configPath,
    baseDirectory: path.dirname(configPath),
    baseUrl: compilerOptions.baseUrl,
    paths: compilerOptions.paths ?? {},
  };
}

function resolvePathAliases(
  importPath: string,
  projectConfig: KpaProjectConfig,
  baseUrlDirectory: string,
): readonly string[] {
  const candidates: string[] = [];

  for (const [pattern, targetPatterns] of Object.entries(projectConfig.paths)) {
    const wildcardIndex = pattern.indexOf('*');

    if (wildcardIndex === -1) {
      if (pattern !== importPath) {
        continue;
      }

      for (const targetPattern of targetPatterns) {
        candidates.push(path.resolve(baseUrlDirectory, targetPattern));
      }

      continue;
    }

    const prefix = pattern.slice(0, wildcardIndex);
    const suffix = pattern.slice(wildcardIndex + 1);

    if (!importPath.startsWith(prefix) || !importPath.endsWith(suffix)) {
      continue;
    }

    const wildcardValue = importPath.slice(prefix.length, importPath.length - suffix.length);

    for (const targetPattern of targetPatterns) {
      candidates.push(path.resolve(baseUrlDirectory, targetPattern.replace('*', wildcardValue)));
    }
  }

  return candidates;
}

function resolveCandidatePath(
  candidateBasePath: string | undefined,
  allowedExtensions: readonly string[],
): string | undefined {
  if (!candidateBasePath) {
    return undefined;
  }

  const extension = path.extname(candidateBasePath);
  const candidatePaths =
    extension.length > 0
      ? allowedExtensions.includes(extension)
        ? [candidateBasePath]
        : []
      : [
          ...allowedExtensions.map((allowedExtension) => `${candidateBasePath}${allowedExtension}`),
          ...allowedExtensions.map((allowedExtension) =>
            path.join(candidateBasePath, `index${allowedExtension}`),
          ),
        ];

  return candidatePaths.find((candidatePath) => fs.existsSync(candidatePath));
}
