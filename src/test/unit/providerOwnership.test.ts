import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { kpaDiagnosticCodes } from '../../language/diagnosticCodes';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type * as vscode from 'vscode';
import { isLocalSymbolRequest } from '../../providers/providerOwnership';
import { KpaLanguageService } from '@koppajs/koppajs-language-core';

const registrations = vi.hoisted(() => ({
  completions: [] as {
    provideCompletionItems(
      doc: ReturnType<typeof document>,
      offset: number,
    ): { label: string }[] | undefined;
  }[],
  symbols: [] as unknown[],
  workspaceSymbols: [] as unknown[],
  codeActions: [] as unknown[],
  options: undefined as
    | {
        middleware: Record<
          string,
          (doc: ReturnType<typeof document>, offset: number, ...args: unknown[]) => unknown
        >;
      }
    | undefined,
}));

vi.mock('vscode', () => {
  class Value {
    constructor(public label: unknown) {}
  }
  const disposable = () => ({ dispose() {} });
  const register = (items: unknown[]) => (_selector: unknown, provider: unknown) => {
    items.push(provider);
    return disposable();
  };
  return {
    languages: {
      registerCompletionItemProvider: register(registrations.completions),
      registerDocumentSymbolProvider: register(registrations.symbols),
      registerWorkspaceSymbolProvider: (provider: unknown) => {
        registrations.workspaceSymbols.push(provider);
        return disposable();
      },
      registerCodeActionsProvider: register(registrations.codeActions),
      registerHoverProvider: disposable,
      registerDefinitionProvider: disposable,
      registerReferenceProvider: disposable,
      registerRenameProvider: disposable,
    },
    workspace: {
      createFileSystemWatcher: disposable,
      onDidOpenTextDocument: disposable,
      onDidChangeTextDocument: disposable,
      onDidCloseTextDocument: disposable,
    },
    window: { onDidChangeActiveTextEditor: disposable },
    CompletionItem: Value,
    SnippetString: Value,
    MarkdownString: Value,
    CompletionItemKind: {},
    CodeActionKind: { QuickFix: 'quickfix' },
  };
});
vi.mock('vscode-languageclient/node', () => ({
  TransportKind: { ipc: 1 },
  LanguageClient: class {
    constructor(_id: string, _name: string, _server: unknown, options: unknown) {
      registrations.options = options as NonNullable<typeof registrations.options>;
    }
    async start() {}
    async stop() {}
  },
}));
vi.mock('../../diagnostics', () => ({
  kpaDiagnosticCollection: { clear() {} },
  updateDiagnostics() {},
}));
vi.mock('../../providers/workspaceIndexService', () => ({
  registerWorkspaceIndexService() {},
}));

import { activate } from '../../extension';
import { parseKpaDocument } from '../../language/parser';
import {
  collectLocalReferenceRangesForSymbols,
  resolveLocalSymbolOccurrenceAtOffset,
} from '../../language/localSymbolReferences';

function document(text: string) {
  return {
    languageId: 'kpa',
    uri: { scheme: 'untitled' },
    getText: () => text,
    offsetAt: (offset: number) => offset,
    getWordRangeAtPosition: () => undefined,
  };
}

beforeAll(async () => {
  await activate({
    subscriptions: [],
    asAbsolutePath: (value: string) => value,
  } as unknown as vscode.ExtensionContext);
});

const service = new KpaLanguageService();
const uri = 'untitled:ownership.kpa';

function open(text: string) {
  service.openDocument(uri, text);
  return document(text);
}

function completionLabels(items: readonly { label: string }[] | undefined) {
  return (items ?? []).map((item) => item.label);
}

describe('provider ownership', () => {
  it('publishes shared diagnostics in English without replacing their metadata', () => {
    const diagnostic = {
      source: 'koppa-diagnostics',
      message: 'Required Slot [header] fehlt an Komponente [Card].',
      code: 'kpa.missing-component-slot',
      range: { start: { line: 1, character: 1 }, end: { line: 1, character: 5 } },
    };
    const next = vi.fn();
    const middleware = registrations.options!.middleware.handleDiagnostics;
    expect(middleware).toBeTypeOf('function');
    Reflect.apply(middleware, undefined, ['untitled:english.kpa', [diagnostic], next]);
    expect(next).toHaveBeenCalledWith('untitled:english.kpa', [
      {
        ...diagnostic,
        message: 'Required slot [header] is missing on component [Card].',
      },
    ]);
  });

  it('presents server completion documentation in English and preserves completion lists', async () => {
    const doc = document('[template]\n<\n[/template]');
    const item = { label: 'div', insertText: '<div>$0</div>', documentation: 'German description' };
    const list = { items: [item], isIncomplete: true };
    const result = await registrations.options!.middleware.provideCompletionItem(
      doc,
      13,
      undefined,
      undefined,
      () => list,
    );
    expect(result).toBe(list);
    expect(item.documentation).toBe('A container element without special meaning.');
  });

  it('keeps exactly one HTML completion owner with an actual server replacement', async () => {
    const text = '[template]\n<div \n[/template]';
    const doc = open(text);
    const offset = text.indexOf('<div ') + 5;
    const serverLabels = completionLabels(service.getCompletions(uri, offset));
    expect(serverLabels).toContain('class');
    const localItems = await Promise.all(
      registrations.completions.map((provider) => provider.provideCompletionItems(doc, offset)),
    );
    expect(localItems.flatMap(completionLabels).filter((label) => label === 'class')).toHaveLength(
      0,
    );
  });

  it('assigns document symbols to the server and retains the empty-window workspace adapter', () => {
    const text = '[template]\n<p />\n[/template]\n[ts]\nconst count = 1;\n[/ts]';
    open(text);
    expect(service.getDocumentSymbols(uri).map((symbol) => symbol.name)).toEqual([
      '[template]',
      '[ts]',
    ]);
    expect(registrations.symbols).toHaveLength(0);
    expect(registrations.workspaceSymbols).toHaveLength(1);
    expect(registrations.codeActions).toHaveLength(1);
  });

  it('routes workspace-symbol requests to exactly one owner with or without workspace roots', async () => {
    const api = await import('vscode');
    const workspace = registrations.options!.middleware.provideWorkspaceSymbols;
    const local = registrations.workspaceSymbols[0] as {
      provideWorkspaceSymbols: (query: string) => Promise<unknown[]>;
    };
    const next = vi.fn(() => ['server-result']);
    try {
      Object.defineProperty(api.workspace, 'workspaceFolders', {
        configurable: true,
        value: undefined,
      });
      expect(Reflect.apply(workspace, undefined, ['query', {}, next])).toEqual([]);
      expect(next).not.toHaveBeenCalled();
      Object.defineProperty(api.workspace, 'workspaceFolders', { configurable: true, value: [{}] });
      expect(Reflect.apply(workspace, undefined, ['query', {}, next])).toEqual(['server-result']);
      expect(next).toHaveBeenCalledTimes(1);
      expect(await local.provideWorkspaceSymbols('query')).toEqual([]);
    } finally {
      Object.defineProperty(api.workspace, 'workspaceFolders', {
        configurable: true,
        value: undefined,
      });
    }
  });

  it('suppresses server hover/definition/references/rename only for legacy requests', async () => {
    const text = '[template]\n{count}\n{{count}}\n[/template]\n[ts]\nconst count = 1;\n[/ts]';
    const doc = open(text);
    const legacyOffset = text.indexOf('{count}') + 2;
    const runtimeOffset = text.indexOf('{{count}}') + 3;
    const middleware = registrations.options!.middleware;
    for (const name of [
      'provideHover',
      'provideDefinition',
      'provideReferences',
      'prepareRename',
      'provideRenameEdits',
    ]) {
      expect(middleware[name], name).toBeTypeOf('function');
      const next = vi.fn(() => 'server');
      const args = ['provideReferences', 'provideRenameEdits'].includes(name)
        ? [undefined, undefined, next]
        : [undefined, next];
      await middleware[name](doc, legacyOffset, ...args);
      expect(next, name).not.toHaveBeenCalled();
      await middleware[name](doc, runtimeOffset, ...args);
      expect(next, name).toHaveBeenCalledOnce();
    }
  });
  it('keeps script declarations on the legacy mapping and component tags on the server', () => {
    const text =
      '[template]\n{count} <Card /> {{count}}\n[/template]\n[ts]\nconst count = 1;\n[/ts]';
    expect(isLocalSymbolRequest(text, text.lastIndexOf('count') + 2)).toBe(true);
    expect(isLocalSymbolRequest(text, text.indexOf('Card') + 2)).toBe(false);
    expect(isLocalSymbolRequest(text, text.indexOf('{{count}}') + 4)).toBe(false);
  });
  it('routes runtime completions to the returned contract and legacy completions to local TS', async () => {
    const text =
      '[template]\n{privateValue} {{title}}\n[/template]\n[js]\nconst privateValue = 1;\nreturn { props: { title: { type: String } } };\n[/js]';
    const doc = open(text);
    const runtimeOffset = text.indexOf('{{title}}') + 3;
    const legacyOffset = text.indexOf('{privateValue}') + 2;
    expect(completionLabels(service.getCompletions(uri, runtimeOffset))).toContain('title');
    expect(completionLabels(service.getCompletions(uri, runtimeOffset))).not.toContain(
      'privateValue',
    );
    const localRuntime = await Promise.all(
      registrations.completions.map((provider) =>
        provider.provideCompletionItems(doc, runtimeOffset),
      ),
    );
    expect(localRuntime.flatMap(completionLabels)).toEqual([]);
    const localLegacy = await Promise.all(
      registrations.completions.map((provider) =>
        provider.provideCompletionItems(doc, legacyOffset),
      ),
    );
    expect(localLegacy.flatMap(completionLabels)).toContain('privateValue');
    const next = vi.fn(() => 'server');
    await registrations.options!.middleware.provideCompletionItem(
      doc,
      legacyOffset,
      undefined,
      undefined,
      next,
    );
    expect(next).not.toHaveBeenCalled();
    await registrations.options!.middleware.provideCompletionItem(
      doc,
      runtimeOffset,
      undefined,
      undefined,
      next,
    );
    expect(next).toHaveBeenCalledOnce();
  });

  it('retains script-to-legacy reference ranges without leaking runtime identifiers', () => {
    const text = '[template]\n{count} {{count}}\n[/template]\n[ts]\nconst count = 1;\n[/ts]';
    const parsed = parseKpaDocument(text);
    const occurrence = resolveLocalSymbolOccurrenceAtOffset(parsed, text.lastIndexOf('count') + 2);
    expect(occurrence?.symbols).toHaveLength(1);
    const ranges = collectLocalReferenceRangesForSymbols(parsed, occurrence!.symbols);
    expect(ranges.map((range) => range.start.offset).sort((a, b) => a - b)).toEqual([
      text.indexOf('{count}') + 1,
      text.lastIndexOf('count'),
    ]);
  });

  it('filters only locally owned server quick fixes and preserves new slot/emit codes', async () => {
    const doc = document('[template]\n<Card />\n[/template]');
    const diagnostics = [
      kpaDiagnosticCodes.missingComponentProp,
      kpaDiagnosticCodes.unresolvedComponentTag,
      kpaDiagnosticCodes.missingComponentSlot,
      kpaDiagnosticCodes.unknownComponentEmit,
    ].map((code) => ({ code, source: 'koppa-diagnostics' }));
    const foreign = { code: kpaDiagnosticCodes.missingComponentProp, source: 'other' };
    const next = vi.fn(() => []);
    await registrations.options!.middleware.provideCodeActions(
      doc,
      0,
      { diagnostics: [...diagnostics, foreign], only: 'quickfix' },
      undefined,
      next,
    );
    expect(next).toHaveBeenCalledWith(
      doc,
      0,
      { diagnostics: [diagnostics[2], diagnostics[3], foreign], only: 'quickfix' },
      undefined,
    );
    expect(registrations.codeActions).toHaveLength(1);
  });

  it('has actual server replacements for component and workspace features outside expressions', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kpa-provider-ownership-'));
    try {
      const child = path.join(root, 'Card.kpa');
      const parent = path.join(root, 'Parent.kpa');
      fs.writeFileSync(child, '[template]\n<p />\n[/template]');
      const text = '[template]\n<Card />\n[/template]\n[ts]\nimport Card from "./Card.kpa";\n[/ts]';
      fs.writeFileSync(parent, text);
      const parentUri = pathToFileURL(parent).toString();
      const componentService = new KpaLanguageService();
      componentService.setWorkspaceRoots([root]);
      componentService.openDocument(parentUri, text);
      const offset = text.indexOf('Card') + 2;
      expect(
        componentService
          .getCompletions(parentUri, text.indexOf('<Card'))
          ?.some((item) => item.label === 'Card'),
      ).toBe(true);
      expect(componentService.getHover(parentUri, offset)).toBeDefined();
      expect(componentService.getDefinitions(parentUri, offset)?.[0].uri).toBe(
        pathToFileURL(child).toString(),
      );
      expect(
        componentService.getReferences(parentUri, offset, true)?.length,
      ).toBeGreaterThanOrEqual(2);
      expect(componentService.getRenameInfo(parentUri, offset)?.placeholder).toBe('Card');
      expect(
        componentService.getRenameEdits(parentUri, offset, 'Panel')?.length,
      ).toBeGreaterThanOrEqual(2);
      expect(
        componentService.getWorkspaceSymbols('Card').some((symbol) => symbol.name === 'Card'),
      ).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
  it('retains imported-component tags locally so their legacy usages participate in rename', () => {
    const text =
      '[template]\n<Card /> {Card}\n[/template]\n[ts]\nimport Card from "./Card.kpa";\n[/ts]';
    expect(isLocalSymbolRequest(text, text.indexOf('<Card') + 3)).toBe(true);
    expect(isLocalSymbolRequest(text, text.lastIndexOf('import Card') + 9)).toBe(true);
  });
  it('defers unsupported script members instead of suppressing the server wholesale', () => {
    const text = '[template]\n{user.name}\n[/template]\n[ts]\nconst user = { name: "Ada" };\n[/ts]';
    expect(isLocalSymbolRequest(text, text.lastIndexOf('name') + 2)).toBe(false);
  });
});
