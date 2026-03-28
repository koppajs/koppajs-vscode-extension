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
import { registerDocumentSymbolProvider } from './providers/documentSymbolProvider';
import { registerHtmlAttributeProvider } from './providers/htmlAttributeProvider';
import { registerHtmlTagProvider } from './providers/htmlTagProvider';
import { registerLocalReferencesProvider } from './providers/localReferencesProvider';
import { registerLocalRenameProvider } from './providers/localRenameProvider';
import { registerTemplateDefinitionProvider } from './providers/templateDefinitionProvider';
import { registerTemplateExpressionCompletionProvider } from './providers/templateExpressionCompletionProvider';
import { registerTemplateExpressionHoverProvider } from './providers/templateExpressionHoverProvider';
import { registerWorkspaceIndexService } from './providers/workspaceIndexService';
import { registerWorkspaceSymbolProvider } from './providers/workspaceSymbolProvider';
import { getTemplateExpressionContext } from './utils/templateContext';

let languageClient: LanguageClient | undefined;

export async function activate(context: vscode.ExtensionContext) {
  registerWorkspaceIndexService(context);
  registerBlockProvider(context);
  registerHtmlTagProvider(context);
  registerHtmlAttributeProvider(context);
  registerTemplateExpressionCompletionProvider(context);
  registerTemplateExpressionHoverProvider(context);
  registerTemplateDefinitionProvider(context);
  registerLocalReferencesProvider(context);
  registerLocalRenameProvider(context);
  registerComponentCodeActionProvider(context);
  registerDocumentSymbolProvider(context);
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

  console.log('Koppa Extension ist aktiviert.');
}

export async function deactivate() {
  await languageClient?.stop();
  kpaDiagnosticCollection.dispose();
  console.log('Koppa Extension wurde deaktiviert.');
}

async function startLanguageClient(context: vscode.ExtensionContext): Promise<LanguageClient> {
  const serverModule = context.asAbsolutePath(path.join('dist', 'language-server.js'));
  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { language: 'kpa', scheme: 'file' },
      { language: 'kpa', scheme: 'untitled' },
    ],
    middleware: {
      provideCompletionItem(document, position, completionContext, token, next) {
        if (document.languageId === 'kpa') {
          const offset = document.offsetAt(position);

          if (getTemplateExpressionContext(document.getText(), offset)) {
            return [];
          }
        }

        return next(document, position, completionContext, token);
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
