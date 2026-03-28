import fs from 'fs';
import path from 'path';
import {
  collectWorkspaceTemplateComponentUsagesForResolvedFile,
  collectKpaDiagnosticsFromText,
  collectWorkspaceSymbolsFromKpaText,
  toKebabCase,
  type KpaWorkspaceSymbolEntry,
  type KpaWorkspaceTemplateComponentUsage,
} from './core';
import type { KpaBlockDiagnostic } from './diagnosticsRules';
import { parseKpaDocument } from './parser';
import type { KpaDocument } from './ast';

export interface KpaWorkspaceIndexOptions {
  overlayTextByPath?: ReadonlyMap<string, string>;
  rootPaths?: readonly string[];
}

export interface KpaWorkspaceIndexedFile {
  document: KpaDocument;
  filePath: string;
  text: string;
}

export interface KpaWorkspaceComponentUsages {
  filePath: string;
  usages: readonly KpaWorkspaceTemplateComponentUsage[];
}

export interface KpaWorkspaceFileDiagnostics {
  diagnostics: readonly KpaBlockDiagnostic[];
  filePath: string;
}

interface KpaWorkspaceCachedFile {
  diagnostics?: readonly KpaBlockDiagnostic[];
  document: KpaDocument;
  mtimeMs?: number;
  symbols?: readonly KpaWorkspaceSymbolEntry[];
  text: string;
}

const excludedDirectoryNames = new Set(['.git', 'coverage', 'dist', 'node_modules', 'out']);

export class KpaWorkspaceIndex {
  private fileCache = new Map<string, KpaWorkspaceCachedFile>();
  private overlayTextByPath: ReadonlyMap<string, string>;
  private rootPaths: readonly string[];

  constructor(options: KpaWorkspaceIndexOptions = {}) {
    this.rootPaths = normalizeRootPaths(options.rootPaths ?? []);
    this.overlayTextByPath = options.overlayTextByPath ?? new Map();
  }

  setOverlayTextByPath(overlayTextByPath: ReadonlyMap<string, string>): void {
    this.overlayTextByPath = overlayTextByPath;
  }

  setRootPaths(rootPaths: readonly string[]): void {
    this.rootPaths = normalizeRootPaths(rootPaths);
  }

  invalidateFile(filePath: string): void {
    this.fileCache.delete(filePath);
  }

  clear(): void {
    this.fileCache.clear();
  }

  getKpaFilePaths(additionalPaths: readonly (string | undefined)[] = []): readonly string[] {
    const searchRoots = new Set(this.rootPaths);

    for (const additionalPath of additionalPaths) {
      if (!additionalPath) {
        continue;
      }

      searchRoots.add(toSearchRoot(additionalPath));
    }

    const filePaths = new Set<string>();

    for (const rootPath of searchRoots) {
      if (!fs.existsSync(rootPath)) {
        continue;
      }

      collectKpaFilePathsRecursively(rootPath, filePaths);
    }

    return [...filePaths].sort();
  }

  getIndexedFile(filePath: string): KpaWorkspaceIndexedFile | undefined {
    const cachedFile = this.getCachedFile(filePath);

    if (!cachedFile) {
      return undefined;
    }

    return {
      document: cachedFile.document,
      filePath,
      text: cachedFile.text,
    };
  }

  collectWorkspaceSymbols(
    query = '',
    additionalPaths: readonly (string | undefined)[] = [],
  ): readonly KpaWorkspaceSymbolEntry[] {
    const normalizedQuery = query.trim().toLowerCase();
    const matchingSymbols: KpaWorkspaceSymbolEntry[] = [];

    for (const filePath of this.getKpaFilePaths(additionalPaths)) {
      const cachedFile = this.getCachedFile(filePath);

      if (!cachedFile) {
        continue;
      }

      const symbols =
        cachedFile.symbols ?? collectWorkspaceSymbolsFromKpaText(cachedFile.text, filePath);

      cachedFile.symbols = symbols;

      for (const symbol of symbols) {
        if (
          normalizedQuery.length > 0 &&
          !symbol.name.toLowerCase().includes(normalizedQuery) &&
          !symbol.filePath.toLowerCase().includes(normalizedQuery)
        ) {
          continue;
        }

        matchingSymbols.push(symbol);
      }
    }

    return matchingSymbols;
  }

  findComponentFilePathsByName(
    componentName: string,
    excludePath?: string,
    additionalPaths: readonly (string | undefined)[] = [],
  ): readonly string[] {
    const acceptedNames = new Set([componentName, toKebabCase(componentName)]);

    return this.getKpaFilePaths(additionalPaths).filter((filePath) => {
      if (filePath === excludePath) {
        return false;
      }

      const fileName = path.basename(filePath, '.kpa');
      const parentName = path.basename(path.dirname(filePath));

      return acceptedNames.has(fileName) || (fileName === 'index' && acceptedNames.has(parentName));
    });
  }

  collectComponentUsagesForResolvedFile(
    resolvedFilePath: string,
    additionalPaths: readonly (string | undefined)[] = [],
  ): readonly KpaWorkspaceComponentUsages[] {
    const usages: KpaWorkspaceComponentUsages[] = [];

    for (const filePath of this.getKpaFilePaths([resolvedFilePath, ...additionalPaths])) {
      const cachedFile = this.getCachedFile(filePath);

      if (!cachedFile) {
        continue;
      }

      const fileUsages = collectWorkspaceTemplateComponentUsagesForResolvedFile(
        cachedFile.document,
        filePath,
        resolvedFilePath,
      );

      if (fileUsages.length === 0) {
        continue;
      }

      usages.push({
        filePath,
        usages: fileUsages,
      });
    }

    return usages;
  }

  collectDiagnosticsForPaths(
    paths: readonly string[],
    additionalPaths: readonly (string | undefined)[] = [],
  ): readonly KpaWorkspaceFileDiagnostics[] {
    const explicitKpaPaths = paths.filter((candidatePath) => candidatePath.endsWith('.kpa'));
    const filePaths =
      explicitKpaPaths.length > 0
        ? explicitKpaPaths
        : this.getKpaFilePaths([...paths, ...additionalPaths]);

    return filePaths.flatMap((filePath) => {
      const cachedFile = this.getCachedFile(filePath);

      if (!cachedFile) {
        return [];
      }

      const diagnostics =
        cachedFile.diagnostics ??
        collectKpaDiagnosticsFromText(cachedFile.text, undefined, filePath).diagnostics;

      cachedFile.diagnostics = diagnostics;

      return [
        {
          diagnostics,
          filePath,
        } satisfies KpaWorkspaceFileDiagnostics,
      ];
    });
  }

  private getCachedFile(filePath: string): KpaWorkspaceCachedFile | undefined {
    const overlayText = this.overlayTextByPath.get(filePath);

    if (overlayText !== undefined) {
      const cachedOverlayFile = this.fileCache.get(filePath);

      if (cachedOverlayFile && cachedOverlayFile.text === overlayText) {
        return cachedOverlayFile;
      }

      const overlayFile = createCachedFile(overlayText);
      this.fileCache.set(filePath, overlayFile);
      return overlayFile;
    }

    try {
      const fileStats = fs.statSync(filePath);
      const cachedFile = this.fileCache.get(filePath);

      if (cachedFile && cachedFile.mtimeMs === fileStats.mtimeMs) {
        return cachedFile;
      }

      const text = fs.readFileSync(filePath, 'utf8');
      const nextCachedFile = createCachedFile(text, fileStats.mtimeMs);

      this.fileCache.set(filePath, nextCachedFile);
      return nextCachedFile;
    } catch {
      this.fileCache.delete(filePath);
      return undefined;
    }
  }
}

function createCachedFile(text: string, mtimeMs?: number): KpaWorkspaceCachedFile {
  return {
    document: parseKpaDocument(text),
    mtimeMs,
    text,
  };
}

function collectKpaFilePathsRecursively(rootPath: string, filePaths: Set<string>): void {
  for (const entry of fs.readdirSync(rootPath, { withFileTypes: true })) {
    const entryPath = path.join(rootPath, entry.name);

    if (entry.isDirectory()) {
      if (excludedDirectoryNames.has(entry.name)) {
        continue;
      }

      collectKpaFilePathsRecursively(entryPath, filePaths);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.kpa')) {
      filePaths.add(entryPath);
    }
  }
}

function normalizeRootPaths(rootPaths: readonly string[]): readonly string[] {
  return [...new Set(rootPaths.map(toSearchRoot))];
}

function toSearchRoot(fileOrDirectoryPath: string): string {
  try {
    return fs.statSync(fileOrDirectoryPath).isDirectory()
      ? fileOrDirectoryPath
      : path.dirname(fileOrDirectoryPath);
  } catch {
    return path.dirname(fileOrDirectoryPath);
  }
}
