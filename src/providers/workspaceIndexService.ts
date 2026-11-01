import path from 'path';
import * as vscode from 'vscode';
import { KpaWorkspaceIndex } from '../language/workspaceIndex';

const overlayTextByPath = new Map<string, string>();
const workspaceIndex = new KpaWorkspaceIndex();

export function registerWorkspaceIndexService(context: vscode.ExtensionContext): void {
  syncOpenDocuments();
  refreshWorkspaceIndex();

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      syncDocumentOverlay(document);
      refreshWorkspaceIndex();
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      syncDocumentOverlay(event.document);
      invalidateDocumentIfFile(event.document);
      refreshWorkspaceIndex();
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      syncDocumentOverlay(document);
      invalidateDocumentIfFile(document);
      refreshWorkspaceIndex();
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      if (document.languageId === 'kpa' && document.uri.scheme === 'file') {
        overlayTextByPath.delete(document.uri.fsPath);
        workspaceIndex.invalidateFile(document.uri.fsPath);
      }

      refreshWorkspaceIndex();
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      refreshWorkspaceIndex();
    }),
  );
}

export function getWorkspaceIndex(
  additionalPaths: readonly (string | undefined)[] = [],
): KpaWorkspaceIndex {
  workspaceIndex.setOverlayTextByPath(overlayTextByPath);
  workspaceIndex.setRootPaths(collectWorkspaceRoots(additionalPaths));
  return workspaceIndex;
}

function refreshWorkspaceIndex(additionalPaths: readonly (string | undefined)[] = []): void {
  workspaceIndex.setOverlayTextByPath(overlayTextByPath);
  workspaceIndex.setRootPaths(collectWorkspaceRoots(additionalPaths));
}

function syncOpenDocuments(): void {
  for (const document of vscode.workspace.textDocuments) {
    syncDocumentOverlay(document);
  }
}

function syncDocumentOverlay(document: vscode.TextDocument): void {
  if (document.languageId !== 'kpa' || document.uri.scheme !== 'file') {
    return;
  }

  overlayTextByPath.set(document.uri.fsPath, document.getText());
}

function invalidateDocumentIfFile(document: vscode.TextDocument): void {
  if (document.languageId === 'kpa' && document.uri.scheme === 'file') {
    workspaceIndex.invalidateFile(document.uri.fsPath);
  }
}

function collectWorkspaceRoots(
  additionalPaths: readonly (string | undefined)[],
): readonly string[] {
  const rootPaths = new Set<string>();

  for (const workspaceFolder of vscode.workspace.workspaceFolders ?? []) {
    if (workspaceFolder.uri.scheme === 'file') {
      rootPaths.add(workspaceFolder.uri.fsPath);
    }
  }

  for (const document of vscode.workspace.textDocuments) {
    if (document.languageId === 'kpa' && document.uri.scheme === 'file') {
      rootPaths.add(path.dirname(document.uri.fsPath));
    }
  }

  for (const additionalPath of additionalPaths) {
    if (!additionalPath) {
      continue;
    }

    rootPaths.add(path.dirname(additionalPath));
  }

  return [...rootPaths];
}
