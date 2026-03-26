import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension integration', () => {
  const extensionId = 'koppajs.koppajs-vscode-extension';

  function getExtension(): vscode.Extension<unknown> {
    const extension = vscode.extensions.getExtension(extensionId);
    assert.ok(extension, `Extension ${extensionId} should be available in the host.`);
    return extension;
  }

  async function waitForExtensionActivation(): Promise<void> {
    const extension = getExtension();
    const startedAt = Date.now();

    while (Date.now() - startedAt < 2_000) {
      if (extension.isActive) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    assert.ok(extension.isActive, `Extension ${extensionId} should activate for kpa documents.`);
  }

  function getCompletionLabels(completions: vscode.CompletionList | undefined): string[] {
    return (
      completions?.items.map((item) =>
        typeof item.label === 'string' ? item.label : item.label.label,
      ) ?? []
    );
  }

  function getHoverText(hovers: readonly vscode.Hover[]): string {
    return hovers
      .flatMap((hover) => hover.contents)
      .map((content) => {
        if (typeof content === 'string') {
          return content;
        }

        const normalizedContent = content as { language?: string; value?: string };

        if (typeof normalizedContent.value !== 'string') {
          return '';
        }

        return typeof normalizedContent.language === 'string'
          ? `${normalizedContent.language}\n${normalizedContent.value}`
          : normalizedContent.value;
      })
      .join('\n');
  }

  function getDefinitionLines(
    definitions: readonly (vscode.Location | vscode.LocationLink)[] | undefined,
  ): number[] {
    return (
      definitions?.map((definition) =>
        isLocationLink(definition)
          ? (definition.targetSelectionRange ?? definition.targetRange).start.line
          : definition.range.start.line,
      ) ?? []
    );
  }

  function flattenDocumentSymbolNames(
    symbols: readonly (vscode.DocumentSymbol | vscode.SymbolInformation)[] | undefined,
  ): string[] {
    if (!symbols) {
      return [];
    }

    return symbols.flatMap((symbol) =>
      'children' in symbol
        ? [symbol.name, ...flattenDocumentSymbolNames(symbol.children)]
        : [symbol.name],
    );
  }

  function isLocationLink(
    definition: vscode.Location | vscode.LocationLink,
  ): definition is vscode.LocationLink {
    return 'targetUri' in definition;
  }

  async function waitForKpaDiagnostics(
    document: vscode.TextDocument,
    expectedCount: number,
  ): Promise<vscode.Diagnostic[]> {
    const startedAt = Date.now();

    while (Date.now() - startedAt < 2_000) {
      const diagnostics = vscode.languages
        .getDiagnostics(document.uri)
        .filter((diagnostic) => diagnostic.source === 'koppa-diagnostics');

      if (diagnostics.length === expectedCount) {
        return diagnostics;
      }

      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    return vscode.languages
      .getDiagnostics(document.uri)
      .filter((diagnostic) => diagnostic.source === 'koppa-diagnostics');
  }

  teardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
  });

  test('activates automatically for kpa documents', async () => {
    const document = await vscode.workspace.openTextDocument({
      content: '',
      language: 'kpa',
    });
    await vscode.window.showTextDocument(document);

    await waitForExtensionActivation();
  });

  test('offers block snippets outside existing Koppa blocks', async () => {
    const document = await vscode.workspace.openTextDocument({
      content: '',
      language: 'kpa',
    });
    await vscode.window.showTextDocument(document);
    await waitForExtensionActivation();

    const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider',
      document.uri,
      new vscode.Position(0, 0),
    );

    assert.ok(completions);
    assert.ok(completions.items.some((item) => item.label === 'template'));
  });

  test('offers HTML tag completions inside the canonical template block', async () => {
    const document = await vscode.workspace.openTextDocument({
      content: '[template]\n  <\n[/template]',
      language: 'kpa',
    });
    await vscode.window.showTextDocument(document);
    await waitForExtensionActivation();

    const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider',
      document.uri,
      new vscode.Position(1, 3),
      '<',
    );

    assert.ok(completions);
    assert.ok(completions.items.some((item) => item.label === 'div'));
  });

  test('offers local script symbol completions inside canonical template expressions', async () => {
    const document = await vscode.workspace.openTextDocument({
      content: [
        '[template]',
        '  <div>{co}</div>',
        '[/template]',
        '',
        '[ts]',
        '  const count = 1;',
        '  function increment() {}',
        '  interface Props {}',
        '[/ts]',
      ].join('\n'),
      language: 'kpa',
    });
    await vscode.window.showTextDocument(document);
    await waitForExtensionActivation();

    const offset = document.getText().indexOf('{co}') + 3;
    const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider',
      document.uri,
      document.positionAt(offset),
    );
    const labels = getCompletionLabels(completions);

    assert.ok(labels.includes('count'));
    assert.ok(labels.includes('increment'));
    assert.ok(!labels.includes('Props'));
  });

  test('publishes warning diagnostics for missing local template bindings', async () => {
    const document = await vscode.workspace.openTextDocument({
      content: '[template]\n  <div>{missing}</div>\n[/template]',
      language: 'kpa',
    });
    await vscode.window.showTextDocument(document);

    const diagnostics = await waitForKpaDiagnostics(document, 1);

    assert.strictEqual(diagnostics.length, 1);
    assert.ok(diagnostics[0].message.includes('Lokales Template-Symbol [missing]'));
  });

  test('does not offer HTML attribute completions inside template expressions in opening tags', async () => {
    const document = await vscode.workspace.openTextDocument({
      content: [
        '[template]',
        '  <div class={co}></div>',
        '[/template]',
        '',
        '[ts]',
        '  const count = 1;',
        '[/ts]',
      ].join('\n'),
      language: 'kpa',
    });
    await vscode.window.showTextDocument(document);
    await waitForExtensionActivation();

    const offset = document.getText().indexOf('{co}') + 3;
    const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider',
      document.uri,
      document.positionAt(offset),
    );
    const labels = getCompletionLabels(completions);

    assert.ok(labels.includes('count'));
    assert.ok(!labels.includes('class'));
  });

  test('resolves local script symbol definitions inside canonical template expressions', async () => {
    const document = await vscode.workspace.openTextDocument({
      content: [
        '[template]',
        '  <div>{count}</div>',
        '[/template]',
        '',
        '[ts]',
        '  const count = 1;',
        '[/ts]',
      ].join('\n'),
      language: 'kpa',
    });
    await vscode.window.showTextDocument(document);
    await waitForExtensionActivation();

    const offset = document.getText().indexOf('{count}') + 2;
    const definitions = await vscode.commands.executeCommand<
      Array<vscode.Location | vscode.LocationLink>
    >('vscode.executeDefinitionProvider', document.uri, document.positionAt(offset));

    assert.deepStrictEqual(getDefinitionLines(definitions), [5]);
  });

  test('does not offer canonical template completions inside compatibility alias blocks', async () => {
    const document = await vscode.workspace.openTextDocument({
      content: '[html]\n  <\n[/html]',
      language: 'kpa',
    });
    await vscode.window.showTextDocument(document);
    await waitForExtensionActivation();

    const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider',
      document.uri,
      new vscode.Position(1, 3),
      '<',
    );

    assert.ok(completions);
    assert.ok(!completions.items.some((item) => item.label === 'div'));
    assert.ok(!completions.items.some((item) => item.label === 'template'));
  });

  test('reports document symbols for blocks and local script symbols', async () => {
    const document = await vscode.workspace.openTextDocument({
      content: [
        '[template]',
        '  <div>{count}</div>',
        '[/template]',
        '',
        '[ts]',
        '  const count = 1;',
        '  function increment() {}',
        '[/ts]',
      ].join('\n'),
      language: 'kpa',
    });
    await vscode.window.showTextDocument(document);
    await waitForExtensionActivation();

    const symbols = await vscode.commands.executeCommand<
      Array<vscode.DocumentSymbol | vscode.SymbolInformation>
    >('vscode.executeDocumentSymbolProvider', document.uri);
    const symbolNames = flattenDocumentSymbolNames(symbols);

    assert.ok(symbolNames.includes('[template]'));
    assert.ok(symbolNames.includes('[ts]'));
    assert.ok(symbolNames.includes('count'));
    assert.ok(symbolNames.includes('increment'));
  });

  test('provides hover information for local script symbols inside canonical template expressions', async () => {
    const document = await vscode.workspace.openTextDocument({
      content: [
        '[template]',
        '  <div>{count}</div>',
        '[/template]',
        '',
        '[ts]',
        '  const count = 1;',
        '[/ts]',
      ].join('\n'),
      language: 'kpa',
    });
    await vscode.window.showTextDocument(document);
    await waitForExtensionActivation();

    const offset = document.getText().indexOf('{count}') + 2;
    const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
      'vscode.executeHoverProvider',
      document.uri,
      document.positionAt(offset),
    );

    assert.ok(hovers);
    assert.ok(hovers.length > 0);

    const hoverText = getHoverText(hovers);
    assert.ok(hoverText.includes('variable count'));
    assert.ok(hoverText.includes('Template-visible local variable'));
    assert.ok(hoverText.includes('[ts]'));
  });

  test('publishes warning diagnostics for malformed canonical blocks', async () => {
    const document = await vscode.workspace.openTextDocument({
      content: '[template]\n[/css]',
      language: 'kpa',
    });
    await vscode.window.showTextDocument(document);

    const diagnostics = await waitForKpaDiagnostics(document, 2);
    assert.strictEqual(diagnostics.length, 2);
    assert.ok(
      diagnostics.some((diagnostic) =>
        diagnostic.message.includes('Stattdessen [/css] verwendet.'),
      ),
    );
    assert.ok(
      diagnostics.some((diagnostic) => diagnostic.message.includes('Erwartet [/template].')),
    );
  });
});
