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
