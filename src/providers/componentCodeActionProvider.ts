import {
  collectCanonicalTemplateComponentDiagnostics,
  parseKpaDocument as parseSharedDocument,
} from '@koppajs/koppajs-language-core';
import ts from 'typescript';
import * as vscode from 'vscode';
import { createComponentQuickFix } from '../language/componentQuickFixes';
import { toKebabCase } from '../language/templateComponents';
import type { KpaBlockNode } from '../language/ast';
import {
  kpaDiagnosticCodes,
  type MissingComponentPropDiagnosticData,
  type UnresolvedComponentTagDiagnosticData,
} from '../language/diagnosticCodes';
import { parseKpaDocument } from '../language/parser';
import {
  createRelativeKpaImportPath,
  findBestWorkspaceComponentFileByName,
} from './workspaceComponentSupport';

type ScriptBlock = KpaBlockNode & { kind: 'script-js' | 'script-ts' };

export function registerComponentCodeActionProvider(context: vscode.ExtensionContext) {
  const provider = vscode.languages.registerCodeActionsProvider(
    'kpa',
    {
      async provideCodeActions(document, _range, codeActionContext) {
        const actions: vscode.CodeAction[] = [];
        const text = document.getText();
        const currentDiagnostics = codeActionContext.diagnostics.some(
          (diagnostic) =>
            diagnostic.source === 'koppa-diagnostics' &&
            (diagnostic.code === kpaDiagnosticCodes.missingComponentSlot ||
              diagnostic.code === kpaDiagnosticCodes.unknownComponentEmit),
        )
          ? collectCanonicalTemplateComponentDiagnostics(
              parseSharedDocument(text),
              document.uri.scheme === 'file' ? document.uri.fsPath : undefined,
            )
          : [];

        for (const diagnostic of codeActionContext.diagnostics) {
          if (diagnostic.source !== 'koppa-diagnostics') {
            continue;
          }

          if (diagnostic.range.start.line === diagnostic.range.end.line) {
            const fix = createComponentQuickFix(
              text,
              {
                code: typeof diagnostic.code === 'object' ? diagnostic.code.value : diagnostic.code,
                source: diagnostic.source,
                message: diagnostic.message,
                range: {
                  line: diagnostic.range.start.line,
                  startChar: diagnostic.range.start.character,
                  endChar: diagnostic.range.end.character,
                },
              },
              currentDiagnostics,
            );
            if (fix) {
              const action = new vscode.CodeAction(fix.title, vscode.CodeActionKind.QuickFix);
              const edit = new vscode.WorkspaceEdit();
              edit.replace(
                document.uri,
                new vscode.Range(
                  document.positionAt(fix.startOffset),
                  document.positionAt(fix.endOffset),
                ),
                fix.newText,
              );
              action.edit = edit;
              action.diagnostics = [diagnostic];
              actions.push(action);
            }
          }

          if (diagnostic.code === kpaDiagnosticCodes.missingComponentProp) {
            const action = createMissingPropCodeAction(
              document,
              diagnostic,
              (diagnostic as vscode.Diagnostic & { data?: unknown }).data as
                MissingComponentPropDiagnosticData | undefined,
            );

            if (action) {
              actions.push(action);
            }
          }

          if (diagnostic.code === kpaDiagnosticCodes.unresolvedComponentTag) {
            const action = await createImportComponentCodeAction(
              document,
              diagnostic,
              (diagnostic as vscode.Diagnostic & { data?: unknown }).data as
                UnresolvedComponentTagDiagnosticData | undefined,
            );

            if (action) {
              actions.push(action);
            }
          }
        }

        return actions;
      },
    },
    {
      providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
    },
  );

  context.subscriptions.push(provider);
}

function createMissingPropCodeAction(
  document: vscode.TextDocument,
  diagnostic: vscode.Diagnostic,
  data: MissingComponentPropDiagnosticData | undefined,
): vscode.CodeAction | undefined {
  if (!data) {
    return undefined;
  }

  const action = new vscode.CodeAction(
    `Add prop [${data.propName}] for [${data.componentName}]`,
    vscode.CodeActionKind.QuickFix,
  );
  const edit = new vscode.WorkspaceEdit();

  edit.insert(
    document.uri,
    document.positionAt(data.insertOffset),
    ` :${toKebabCase(data.propName)}="${createPropPlaceholder(data.propTypeText)}"`,
  );

  action.diagnostics = [diagnostic];
  action.edit = edit;
  action.isPreferred = true;
  return action;
}

async function createImportComponentCodeAction(
  document: vscode.TextDocument,
  diagnostic: vscode.Diagnostic,
  data: UnresolvedComponentTagDiagnosticData | undefined,
): Promise<vscode.CodeAction | undefined> {
  if (!data || document.uri.scheme !== 'file') {
    return undefined;
  }

  const targetUri = await findBestWorkspaceComponentFileByName(data.componentName, document.uri);

  if (!targetUri) {
    return undefined;
  }

  const action = new vscode.CodeAction(
    `Import component [${data.componentName}]`,
    vscode.CodeActionKind.QuickFix,
  );
  const edit = new vscode.WorkspaceEdit();
  const importPath = createRelativeKpaImportPath(document.uri.fsPath, targetUri.fsPath);
  const importText = `  import ${data.componentName} from '${importPath}';`;
  const insertion = createImportInsertion(document, importText);

  edit.insert(document.uri, insertion.position, insertion.text);

  action.diagnostics = [diagnostic];
  action.edit = edit;
  action.isPreferred = true;
  return action;
}

function createImportInsertion(
  document: vscode.TextDocument,
  importStatement: string,
): {
  position: vscode.Position;
  text: string;
} {
  const kpaDocument = parseKpaDocument(document.getText());
  const scriptBlock = kpaDocument.blocks.find(isScriptBlock);

  if (!scriptBlock) {
    const appendText = `${document.getText().endsWith('\n') ? '\n' : '\n\n'}[ts]\n${importStatement}\n[/ts]\n`;

    return {
      position: document.positionAt(document.getText().length),
      text: appendText,
    };
  }

  const content = document
    .getText()
    .slice(scriptBlock.contentRange.start.offset, scriptBlock.contentRange.end.offset);
  const sourceFile = ts.createSourceFile(
    scriptBlock.kind === 'script-ts' ? 'embedded.kpa.ts' : 'embedded.kpa.js',
    content,
    ts.ScriptTarget.Latest,
    true,
    scriptBlock.kind === 'script-ts' ? ts.ScriptKind.TS : ts.ScriptKind.JS,
  );
  const importStatements = sourceFile.statements.filter(ts.isImportDeclaration);
  const insertOffset =
    importStatements.length > 0
      ? scriptBlock.contentRange.start.offset + importStatements[importStatements.length - 1].end
      : scriptBlock.contentRange.start.offset;

  return {
    position: document.positionAt(insertOffset),
    text: `\n${importStatement}`,
  };
}

function createPropPlaceholder(typeText: string | undefined): string {
  const normalizedTypeText = typeText?.replace(/\s+/g, '') ?? '';

  if (normalizedTypeText.includes('string') || /'[^']*'|"[^"]*"/.test(typeText ?? '')) {
    return "''";
  }

  if (normalizedTypeText.includes('number')) {
    return '0';
  }

  if (normalizedTypeText.includes('boolean')) {
    return 'false';
  }

  if (normalizedTypeText.includes('[]') || normalizedTypeText.includes('Array<')) {
    return '[]';
  }

  if (
    normalizedTypeText.includes('{') ||
    normalizedTypeText.includes('object') ||
    normalizedTypeText.includes('Record<')
  ) {
    return '{}';
  }

  return 'undefined';
}

function isScriptBlock(block: KpaBlockNode): block is ScriptBlock {
  return block.kind === 'script-ts' || block.kind === 'script-js';
}
