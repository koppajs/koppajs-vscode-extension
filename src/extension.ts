import path from 'path';
import * as vscode from 'vscode';
import {
  LanguageClient,
  type LanguageClientOptions,
  TransportKind,
} from 'vscode-languageclient/node';
import { kpaDiagnosticCollection, updateDiagnostics } from './diagnostics';
import { registerBlockProvider } from './providers/blockProvider';
import { registerComponentCodeActionProvider } from './providers/componentCodeActionProvider';
import { kpaDiagnosticCodes } from './language/diagnosticCodes';
import {
  toEnglishCompletionItem,
  toEnglishDiagnostic,
  withEnglishErrors,
} from './providers/englishPresentation';
import { registerLocalReferencesProvider } from './providers/localReferencesProvider';
import { registerLocalRenameProvider } from './providers/localRenameProvider';
import { registerTemplateDefinitionProvider } from './providers/templateDefinitionProvider';
import { registerTemplateExpressionCompletionProvider } from './providers/templateExpressionCompletionProvider';
import { registerTemplateExpressionHoverProvider } from './providers/templateExpressionHoverProvider';
import { registerWorkspaceIndexService } from './providers/workspaceIndexService';
import { registerWorkspaceSymbolProvider } from './providers/workspaceSymbolProvider';
import { isLegacyExpressionRequest, isLocalSymbolRequest } from './providers/providerOwnership';

let languageClient: LanguageClient | undefined;

export async function activate(context: vscode.ExtensionContext) {
  registerWorkspaceIndexService(context);
  registerBlockProvider(context);
  registerTemplateExpressionCompletionProvider(context);
  registerTemplateExpressionHoverProvider(context);
  registerTemplateDefinitionProvider(context);
  registerLocalReferencesProvider(context);
  registerLocalRenameProvider(context);
  registerComponentCodeActionProvider(context);
  registerWorkspaceSymbolProvider(context);

  languageClient = await startLanguageClient(context);

  kpaDiagnosticCollection.clear();

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      updateDiagnostics(document);
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      updateDiagnostics(event.document);
    }),
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        updateDiagnostics(editor.document);
      }
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      kpaDiagnosticCollection.delete(document.uri);
    }),
  );

  const activeDocument = vscode.window.activeTextEditor?.document;
  if (activeDocument) {
    updateDiagnostics(activeDocument);
  }

  console.log('Koppa Extension is activated.');
}

export async function deactivate() {
  await languageClient?.stop();
  kpaDiagnosticCollection.dispose();
  console.log('Koppa Extension was deactivated.');
}

async function startLanguageClient(context: vscode.ExtensionContext): Promise<LanguageClient> {
  const serverModule = context.asAbsolutePath(path.join('dist', 'language-server.js'));
  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { language: 'kpa', scheme: 'file' },
      { language: 'kpa', scheme: 'untitled' },
    ],
    middleware: {
      handleDiagnostics(uri, diagnostics, next) {
        next(uri, diagnostics.map(toEnglishDiagnostic));
      },
      provideWorkspaceSymbols(query, token, next) {
        // An empty editor window has no server workspace roots. Preserve symbols
        // for its open files through the local index, without double results.
        return vscode.workspace.workspaceFolders?.length ? next(query, token) : [];
      },
      provideCodeActions(document, range, actionContext, token, next) {
        // These fixes are owned by the local component adapter, alongside its
        // additional slot/emit fixes that server 0.2 does not implement.
        const diagnostics = actionContext.diagnostics.filter(
          (diagnostic) =>
            diagnostic.source !== 'koppa-diagnostics' ||
            (diagnostic.code !== kpaDiagnosticCodes.missingComponentProp &&
              diagnostic.code !== kpaDiagnosticCodes.unresolvedComponentTag),
        );
        return next(document, range, { ...actionContext, diagnostics }, token);
      },
      async provideCompletionItem(document, position, completionContext, token, next) {
        if (isLegacyExpressionRequest(document.getText(), document.offsetAt(position))) {
          return [];
        }
        const completions = await next(document, position, completionContext, token);
        const items = Array.isArray(completions) ? completions : completions?.items;
        items?.forEach(toEnglishCompletionItem);
        return completions;
      },
      provideHover(document, position, token, next) {
        if (isLegacyExpressionRequest(document.getText(), document.offsetAt(position))) {
          return null;
        }
        return next(document, position, token);
      },
      provideDefinition(document, position, token, next) {
        if (isLegacyExpressionRequest(document.getText(), document.offsetAt(position))) {
          return null;
        }
        return next(document, position, token);
      },
      provideReferences(document, position, referenceContext, token, next) {
        if (isLocalSymbolRequest(document.getText(), document.offsetAt(position))) {
          return [];
        }
        return next(document, position, referenceContext, token);
      },
      prepareRename(document, position, token, next) {
        if (isLocalSymbolRequest(document.getText(), document.offsetAt(position))) {
          return null;
        }
        return withEnglishErrors(() => next(document, position, token));
      },
      provideRenameEdits(document, position, newName, token, next) {
        if (isLocalSymbolRequest(document.getText(), document.offsetAt(position))) {
          return null;
        }
        return withEnglishErrors(() => next(document, position, newName, token));
      },
    },
    synchronize: {
      fileEvents: [
        vscode.workspace.createFileSystemWatcher('**/*.kpa'),
        vscode.workspace.createFileSystemWatcher('**/*.{ts,tsx,js,jsx,mjs,cjs}'),
        vscode.workspace.createFileSystemWatcher('**/{tsconfig,jsconfig}.json'),
      ],
    },
  };
  const client = new LanguageClient(
    'koppajsLanguageServer',
    'KoppaJS Language Server',
    {
      debug: {
        module: serverModule,
        options: {
          execArgv: ['--nolazy', '--inspect=6010'],
        },
        transport: TransportKind.ipc,
      },
      run: {
        module: serverModule,
        transport: TransportKind.ipc,
      },
    },
    clientOptions,
  );

  await client.start();
  context.subscriptions.push({
    dispose: () => {
      void client.stop();
    },
  });

  return client;
}
