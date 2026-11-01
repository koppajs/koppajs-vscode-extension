import path from 'path';
import * as vscode from 'vscode';
import type { KpaWorkspaceTemplateComponentUsage } from '../language/core';
import { getWorkspaceIndex } from './workspaceIndexService';

export interface WorkspaceResolvedComponentUsages {
  document: vscode.TextDocument;
  sourcePath: string;
  usages: readonly KpaWorkspaceTemplateComponentUsage[];
}

export async function collectWorkspaceResolvedComponentUsages(
  resolvedFilePath: string,
  additionalPaths: readonly (string | undefined)[] = [],
): Promise<readonly WorkspaceResolvedComponentUsages[]> {
  const openDocumentsByPath = new Map(
    vscode.workspace.textDocuments
      .filter((document) => document.languageId === 'kpa' && document.uri.scheme === 'file')
      .map((document) => [document.uri.fsPath, document] as const),
  );
  const usagesByPath = new Map<string, WorkspaceResolvedComponentUsages>();
  const workspaceIndex = getWorkspaceIndex([resolvedFilePath, ...additionalPaths]);

  for (const indexedUsage of workspaceIndex.collectComponentUsagesForResolvedFile(
    resolvedFilePath,
    additionalPaths,
  )) {
    const document =
      openDocumentsByPath.get(indexedUsage.filePath) ??
      (await vscode.workspace.openTextDocument(indexedUsage.filePath));

    usagesByPath.set(indexedUsage.filePath, {
      document,
      sourcePath: indexedUsage.filePath,
      usages: indexedUsage.usages,
    });
  }

  return [...usagesByPath.values()];
}

export async function findWorkspaceComponentFilesByName(
  componentName: string,
  excludeUri?: vscode.Uri,
  additionalPaths: readonly (string | undefined)[] = [],
): Promise<readonly vscode.Uri[]> {
  const workspaceIndex = getWorkspaceIndex([
    excludeUri?.scheme === 'file' ? excludeUri.fsPath : undefined,
    ...additionalPaths,
  ]);

  return workspaceIndex
    .findComponentFilePathsByName(
      componentName,
      excludeUri?.scheme === 'file' ? excludeUri.fsPath : undefined,
      additionalPaths,
    )
    .map((filePath) => vscode.Uri.file(filePath));
}

export async function findBestWorkspaceComponentFileByName(
  componentName: string,
  sourceUri: vscode.Uri,
  additionalPaths: readonly (string | undefined)[] = [],
): Promise<vscode.Uri | undefined> {
  const candidates = await findWorkspaceComponentFilesByName(
    componentName,
    sourceUri,
    additionalPaths,
  );

  if (candidates.length === 0) {
    return undefined;
  }

  if (candidates.length === 1) {
    return candidates[0];
  }

  const rankedCandidates = candidates
    .map((candidate) => ({
      candidate,
      score: scoreComponentCandidate(sourceUri.fsPath, candidate.fsPath),
    }))
    .sort((left, right) => left.score - right.score);
  const bestCandidate = rankedCandidates[0];
  const nextBestCandidate = rankedCandidates[1];

  if (!bestCandidate) {
    return undefined;
  }

  if (!nextBestCandidate || bestCandidate.score < nextBestCandidate.score) {
    return bestCandidate.candidate;
  }

  return undefined;
}

export function createRelativeKpaImportPath(sourcePath: string, targetPath: string): string {
  let relativePath = path.relative(path.dirname(sourcePath), targetPath).replace(/\\/g, '/');

  if (relativePath.endsWith('/index.kpa')) {
    relativePath = relativePath.slice(0, -'/index.kpa'.length);
  } else if (relativePath.endsWith('.kpa')) {
    relativePath = relativePath.slice(0, -'.kpa'.length);
  }

  if (!relativePath.startsWith('.')) {
    relativePath = `./${relativePath}`;
  }

  return relativePath;
}

function scoreComponentCandidate(sourcePath: string, targetPath: string): number {
  const relativePath = path.relative(path.dirname(sourcePath), targetPath).replace(/\\/g, '/');
  const segmentCount = relativePath.split('/').filter((segment) => segment.length > 0).length;
  const parentPenalty = relativePath.startsWith('..') ? 50 : 0;
  const sameDirectoryBonus =
    path.dirname(sourcePath) === path.dirname(targetPath)
      ? targetPath.endsWith('/index.kpa') || targetPath.endsWith('\\index.kpa')
        ? -5
        : -10
      : 0;

  return parentPenalty + segmentCount + sameDirectoryBonus;
}
