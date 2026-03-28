import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

suite('Extension integration', function () {
  this.timeout(10_000);
  const extensionId = 'koppajs.koppajs-vscode-extension';

  function getExtension(): vscode.Extension<unknown> {
    const extension = vscode.extensions.getExtension(extensionId);
    assert.ok(extension, `Extension ${extensionId} should be available in the host.`);
    return extension;
  }

  async function waitForExtensionActivation(): Promise<void> {
    const extension = getExtension();
    await extension.activate();
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

  function getReferenceLines(references: readonly vscode.Location[] | undefined): number[] {
    return references?.map((reference) => reference.range.start.line) ?? [];
  }

  function getReferenceUris(references: readonly vscode.Location[] | undefined): string[] {
    return references?.map((reference) => reference.uri.fsPath) ?? [];
  }

  function getWorkspaceEditTexts(
    edit: vscode.WorkspaceEdit | undefined,
    document: vscode.TextDocument,
  ): string[] {
    return edit?.get(document.uri)?.map((textEdit) => textEdit.newText) ?? [];
  }

  function getWorkspaceEditEntries(
    edit: vscode.WorkspaceEdit | undefined,
  ): Array<{ uri: vscode.Uri; texts: string[] }> {
    return (
      edit
        ?.entries()
        .map(([uri, edits]) => ({ uri, texts: edits.map((entry) => entry.newText) })) ?? []
    );
  }

  function getCodeActionTitles(
    actions: readonly (vscode.CodeAction | vscode.Command)[] | undefined,
  ): string[] {
    return actions?.map((action) => action.title) ?? [];
  }

  async function createWorkspaceTempDir(prefix: string): Promise<string> {
    return fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
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

  function isCodeAction(action: vscode.CodeAction | vscode.Command): action is vscode.CodeAction {
    return 'edit' in action || 'kind' in action;
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

  test('offers imported .kpa components as canonical template tag completions', async () => {
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'kpa-component-completion-'));
    const componentPath = path.join(tempDirectory, 'UserCard.kpa');
    const pagePath = path.join(tempDirectory, 'Page.kpa');

    fs.writeFileSync(componentPath, '[template]\n  <div></div>\n[/template]\n');
    fs.writeFileSync(
      pagePath,
      [
        '[template]',
        '  <',
        '[/template]',
        '',
        '[ts]',
        "  import UserCard from './UserCard';",
        '[/ts]',
      ].join('\n'),
    );

    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(pagePath));
    await vscode.window.showTextDocument(document);
    await waitForExtensionActivation();

    const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider',
      document.uri,
      new vscode.Position(1, 3),
      '<',
    );
    const labels = getCompletionLabels(completions);

    assert.ok(labels.includes('UserCard'));
    assert.ok(labels.includes('user-card'));
  });

  test('offers imported component props as attribute completions inside canonical template tags', async () => {
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'kpa-component-props-'));
    const componentPath = path.join(tempDirectory, 'UserCard.kpa');
    const pagePath = path.join(tempDirectory, 'Page.kpa');

    fs.writeFileSync(
      componentPath,
      [
        '[template]',
        '  <div></div>',
        '[/template]',
        '',
        '[ts]',
        '  interface Props {',
        '    title: string;',
        '    count?: number;',
        '  }',
        '[/ts]',
      ].join('\n'),
    );
    fs.writeFileSync(
      pagePath,
      [
        '[template]',
        '  <UserCard ',
        '[/template]',
        '',
        '[ts]',
        "  import UserCard from './UserCard';",
        '[/ts]',
      ].join('\n'),
    );

    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(pagePath));
    await vscode.window.showTextDocument(document);
    await waitForExtensionActivation();

    const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider',
      document.uri,
      new vscode.Position(1, 12),
    );
    const labels = getCompletionLabels(completions);

    assert.ok(labels.includes('title'));
    assert.ok(labels.includes('count'));
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

  test('offers typed member completions inside canonical template expressions', async () => {
    const document = await vscode.workspace.openTextDocument({
      content: [
        '[template]',
        '  <div>{user.}</div>',
        '[/template]',
        '',
        '[ts]',
        '  const user = { name: "Ada", age: 32 };',
        '[/ts]',
      ].join('\n'),
      language: 'kpa',
    });
    await vscode.window.showTextDocument(document);
    await waitForExtensionActivation();

    const offset = document.getText().indexOf('user.') + 'user.'.length;
    const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider',
      document.uri,
      document.positionAt(offset),
      '.',
    );
    const labels = getCompletionLabels(completions);

    assert.ok(labels.includes('name'));
    assert.ok(labels.includes('age'));
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

  test('finds local references across canonical template and script blocks', async () => {
    const document = await vscode.workspace.openTextDocument({
      content: [
        '[template]',
        '  <div>{count}</div>',
        '[/template]',
        '',
        '[ts]',
        '  const count = 1;',
        '  console.log(count);',
        '[/ts]',
      ].join('\n'),
      language: 'kpa',
    });
    await vscode.window.showTextDocument(document);
    await waitForExtensionActivation();

    const offset = document.getText().indexOf('{count}') + 2;
    const references = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeReferenceProvider',
      document.uri,
      document.positionAt(offset),
    );
    const lines = getReferenceLines(references);

    assert.ok(lines.includes(1));
    assert.ok(lines.includes(6));
    assert.ok(lines.includes(5));
  });

  test('renames local symbols across canonical template and script blocks', async () => {
    const document = await vscode.workspace.openTextDocument({
      content: [
        '[template]',
        '  <div>{count}</div>',
        '[/template]',
        '',
        '[ts]',
        '  const count = 1;',
        '  console.log(count);',
        '[/ts]',
      ].join('\n'),
      language: 'kpa',
    });
    await vscode.window.showTextDocument(document);
    await waitForExtensionActivation();

    const offset = document.getText().indexOf('{count}') + 2;
    const edit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
      'vscode.executeDocumentRenameProvider',
      document.uri,
      document.positionAt(offset),
      'totalCount',
    );
    const newTexts = getWorkspaceEditTexts(edit, document);

    assert.strictEqual(newTexts.length, 3);
    assert.ok(newTexts.every((newText) => newText === 'totalCount'));
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

  test('resolves imported .kpa component definitions from canonical template tags', async () => {
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'kpa-component-def-'));
    const componentPath = path.join(tempDirectory, 'UserCard.kpa');
    const pagePath = path.join(tempDirectory, 'Page.kpa');

    fs.writeFileSync(componentPath, '[template]\n  <div></div>\n[/template]\n');
    fs.writeFileSync(
      pagePath,
      [
        '[template]',
        '  <UserCard />',
        '[/template]',
        '',
        '[ts]',
        "  import UserCard from './UserCard';",
        '[/ts]',
      ].join('\n'),
    );

    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(pagePath));
    await vscode.window.showTextDocument(document);
    await waitForExtensionActivation();

    const offset = document.getText().indexOf('UserCard') + 1;
    const definitions = await vscode.commands.executeCommand<
      Array<vscode.Location | vscode.LocationLink>
    >('vscode.executeDefinitionProvider', document.uri, document.positionAt(offset));

    assert.ok(definitions && definitions.length > 0);
    const targetUris = definitions.map((definition) =>
      isLocationLink(definition) ? definition.targetUri.fsPath : definition.uri.fsPath,
    );
    assert.ok(targetUris.includes(componentPath));
  });

  test('finds references for imported .kpa component tags and their import alias', async () => {
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'kpa-component-ref-'));
    const componentPath = path.join(tempDirectory, 'UserCard.kpa');
    const pagePath = path.join(tempDirectory, 'Page.kpa');

    fs.writeFileSync(componentPath, '[template]\n  <div></div>\n[/template]\n');
    fs.writeFileSync(
      pagePath,
      [
        '[template]',
        '  <UserCard />',
        '  <user-card />',
        '[/template]',
        '',
        '[ts]',
        "  import UserCard from './UserCard';",
        '[/ts]',
      ].join('\n'),
    );

    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(pagePath));
    await vscode.window.showTextDocument(document);
    await waitForExtensionActivation();

    const offset = document.getText().indexOf('import UserCard') + 'import '.length + 1;
    const references = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeReferenceProvider',
      document.uri,
      document.positionAt(offset),
    );
    const lines = getReferenceLines(references);

    assert.ok(lines.includes(1));
    assert.ok(lines.includes(2));
    assert.ok(lines.includes(6));
  });

  test('resolves imported symbol definitions from canonical template expressions into external files', async () => {
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'kpa-ext-def-'));
    const depPath = path.join(tempDirectory, 'dep.ts');
    const componentPath = path.join(tempDirectory, 'component.kpa');

    fs.writeFileSync(depPath, 'export const externalCount = 123;\n');
    fs.writeFileSync(
      componentPath,
      [
        '[template]',
        '  <div>{externalCount}</div>',
        '[/template]',
        '',
        '[ts]',
        "  import { externalCount } from './dep';",
        '[/ts]',
      ].join('\n'),
    );

    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(componentPath));
    await vscode.window.showTextDocument(document);
    await waitForExtensionActivation();

    const offset = document.getText().indexOf('externalCount') + 1;
    const definitions = await vscode.commands.executeCommand<
      Array<vscode.Location | vscode.LocationLink>
    >('vscode.executeDefinitionProvider', document.uri, document.positionAt(offset));

    assert.ok(definitions && definitions.length > 0);
    const targetUris = definitions.map((definition) =>
      isLocationLink(definition) ? definition.targetUri.fsPath : definition.uri.fsPath,
    );
    assert.ok(targetUris.includes(depPath));
  });

  test('finds semantic references across imported files from canonical template expressions', async () => {
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'kpa-ext-ref-'));
    const depPath = path.join(tempDirectory, 'dep.ts');
    const componentPath = path.join(tempDirectory, 'component.kpa');

    fs.writeFileSync(depPath, 'export const externalCount = 123;\nconsole.log(externalCount);\n');
    fs.writeFileSync(
      componentPath,
      [
        '[template]',
        '  <div>{externalCount}</div>',
        '[/template]',
        '',
        '[ts]',
        "  import { externalCount } from './dep';",
        '[/ts]',
      ].join('\n'),
    );

    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(componentPath));
    await vscode.window.showTextDocument(document);
    await waitForExtensionActivation();

    const offset = document.getText().indexOf('externalCount') + 1;
    const references = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeReferenceProvider',
      document.uri,
      document.positionAt(offset),
    );

    assert.ok(references && references.length > 0);
    const targetUris = references.map((reference) => reference.uri.fsPath);
    assert.ok(targetUris.includes(componentPath));
    assert.ok(targetUris.includes(depPath));
  });

  test('renames imported template symbols across local template and import usage', async () => {
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'kpa-ext-rename-'));
    const depPath = path.join(tempDirectory, 'dep.ts');
    const componentPath = path.join(tempDirectory, 'component.kpa');

    fs.writeFileSync(depPath, 'export const externalCount = 123;\nconsole.log(externalCount);\n');
    fs.writeFileSync(
      componentPath,
      [
        '[template]',
        '  <div>{externalCount}</div>',
        '[/template]',
        '',
        '[ts]',
        "  import { externalCount } from './dep';",
        '[/ts]',
      ].join('\n'),
    );

    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(componentPath));
    await vscode.window.showTextDocument(document);
    await waitForExtensionActivation();

    const offset = document.getText().indexOf('externalCount') + 1;
    const edit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
      'vscode.executeDocumentRenameProvider',
      document.uri,
      document.positionAt(offset),
      'totalCount',
    );
    const entries = getWorkspaceEditEntries(edit);

    assert.ok(entries.some((entry) => entry.uri.fsPath === componentPath));
    assert.ok(!entries.some((entry) => entry.uri.fsPath === depPath));
    assert.ok(entries.every((entry) => entry.texts.every((text) => text === 'totalCount')));
  });

  test('renames imported .kpa component tags together with their import alias', async () => {
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'kpa-component-rename-'));
    const componentPath = path.join(tempDirectory, 'UserCard.kpa');
    const pagePath = path.join(tempDirectory, 'Page.kpa');

    fs.writeFileSync(componentPath, '[template]\n  <div></div>\n[/template]\n');
    fs.writeFileSync(
      pagePath,
      [
        '[template]',
        '  <UserCard />',
        '  <user-card />',
        '[/template]',
        '',
        '[ts]',
        "  import UserCard from './UserCard';",
        '[/ts]',
      ].join('\n'),
    );

    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(pagePath));
    await vscode.window.showTextDocument(document);
    await waitForExtensionActivation();

    const offset = document.getText().indexOf('UserCard') + 1;
    const edit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
      'vscode.executeDocumentRenameProvider',
      document.uri,
      document.positionAt(offset),
      'ProfileCard',
    );
    const entries = getWorkspaceEditEntries(edit);

    assert.ok(entries.some((entry) => entry.uri.fsPath === pagePath));

    const pageEntry = entries.find((entry) => entry.uri.fsPath === pagePath);
    assert.ok(pageEntry);
    assert.ok(pageEntry.texts.includes('ProfileCard'));
    assert.ok(pageEntry.texts.includes('profile-card'));
  });

  test('offers quick fixes for missing required component props', async () => {
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'kpa-component-prop-fix-'));
    const componentPath = path.join(tempDirectory, 'UserCard.kpa');
    const pagePath = path.join(tempDirectory, 'Page.kpa');

    fs.writeFileSync(
      componentPath,
      [
        '[template]',
        '  <div></div>',
        '[/template]',
        '',
        '[ts]',
        '  interface Props {',
        '    title: string;',
        '  }',
        '[/ts]',
      ].join('\n'),
    );
    fs.writeFileSync(
      pagePath,
      [
        '[template]',
        '  <UserCard />',
        '[/template]',
        '',
        '[ts]',
        "  import UserCard from './UserCard';",
        '[/ts]',
      ].join('\n'),
    );

    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(pagePath));
    await vscode.window.showTextDocument(document);
    await waitForExtensionActivation();

    const diagnostics = await waitForKpaDiagnostics(document, 1);
    const actions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
      'vscode.executeCodeActionProvider',
      document.uri,
      diagnostics[0].range,
    );
    const titles = getCodeActionTitles(actions);

    assert.ok(titles.some((title) => title.includes('Prop [title]')));

    const propAction = actions?.find((action) => {
      if (!isCodeAction(action) || !action.edit || !action.title.includes('Prop [title]')) {
        return false;
      }

      return getWorkspaceEditTexts(action.edit, document).some((text) => text.includes('title={'));
    });
    assert.ok(propAction && isCodeAction(propAction) && propAction.edit);

    const editTexts = getWorkspaceEditTexts(propAction.edit, document);
    assert.ok(editTexts.some((text) => text.includes('title={')));
  });

  test('offers quick fixes to import unresolved workspace components', async () => {
    const tempDirectory = await createWorkspaceTempDir('kpa-component-import-fix');
    const componentPath = path.join(tempDirectory, 'UserCard.kpa');
    const pagePath = path.join(tempDirectory, 'Page.kpa');

    fs.writeFileSync(componentPath, '[template]\n  <div></div>\n[/template]\n');
    fs.writeFileSync(pagePath, '[template]\n  <UserCard />\n[/template]\n');

    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(pagePath));
    await vscode.window.showTextDocument(document);
    await waitForExtensionActivation();

    const diagnostics = await waitForKpaDiagnostics(document, 1);
    const actions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
      'vscode.executeCodeActionProvider',
      document.uri,
      diagnostics[0].range,
    );
    const titles = getCodeActionTitles(actions);

    assert.ok(titles.some((title) => title.includes('Komponente [UserCard] importieren')));

    const importAction = actions?.find((action) =>
      action.title.includes('Komponente [UserCard] importieren'),
    );
    assert.ok(importAction && isCodeAction(importAction) && importAction.edit);

    const editTexts = getWorkspaceEditTexts(importAction.edit, document);
    assert.ok(editTexts.some((text) => text.includes("import UserCard from './UserCard';")));
  });

  test('finds component references across workspace importer documents', async () => {
    const tempDirectory = await createWorkspaceTempDir('kpa-workspace-component-ref');
    const componentPath = path.join(tempDirectory, 'UserCard.kpa');
    const pageAPath = path.join(tempDirectory, 'PageA.kpa');
    const pageBPath = path.join(tempDirectory, 'PageB.kpa');

    fs.writeFileSync(componentPath, '[template]\n  <div></div>\n[/template]\n');
    fs.writeFileSync(
      pageAPath,
      [
        '[template]',
        '  <UserCard />',
        '[/template]',
        '',
        '[ts]',
        "  import UserCard from './UserCard';",
        '[/ts]',
      ].join('\n'),
    );
    fs.writeFileSync(
      pageBPath,
      [
        '[template]',
        '  <user-card />',
        '[/template]',
        '',
        '[ts]',
        "  import UserCard from './UserCard';",
        '[/ts]',
      ].join('\n'),
    );

    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(pageAPath));
    await vscode.window.showTextDocument(document);
    await waitForExtensionActivation();

    const offset = document.getText().indexOf('UserCard') + 1;
    const references = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeReferenceProvider',
      document.uri,
      document.positionAt(offset),
    );
    const referenceUris = getReferenceUris(references);

    assert.ok(referenceUris.includes(pageAPath));
    assert.ok(referenceUris.includes(pageBPath));
  });

  test('renames component imports and template tags across workspace importer documents', async () => {
    const tempDirectory = await createWorkspaceTempDir('kpa-workspace-component-rename');
    const componentPath = path.join(tempDirectory, 'UserCard.kpa');
    const pageAPath = path.join(tempDirectory, 'PageA.kpa');
    const pageBPath = path.join(tempDirectory, 'PageB.kpa');

    fs.writeFileSync(componentPath, '[template]\n  <div></div>\n[/template]\n');
    fs.writeFileSync(
      pageAPath,
      [
        '[template]',
        '  <UserCard />',
        '[/template]',
        '',
        '[ts]',
        "  import UserCard from './UserCard';",
        '[/ts]',
      ].join('\n'),
    );
    fs.writeFileSync(
      pageBPath,
      [
        '[template]',
        '  <user-card />',
        '[/template]',
        '',
        '[ts]',
        "  import UserCard from './UserCard';",
        '[/ts]',
      ].join('\n'),
    );

    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(pageAPath));
    await vscode.window.showTextDocument(document);
    await waitForExtensionActivation();

    const offset = document.getText().indexOf('UserCard') + 1;
    const edit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
      'vscode.executeDocumentRenameProvider',
      document.uri,
      document.positionAt(offset),
      'ProfileCard',
    );
    const entries = getWorkspaceEditEntries(edit);

    assert.ok(entries.some((entry) => entry.uri.fsPath === pageAPath));
    assert.ok(entries.some((entry) => entry.uri.fsPath === pageBPath));
    assert.ok(!entries.some((entry) => entry.uri.fsPath === componentPath));

    const pageBEntry = entries.find((entry) => entry.uri.fsPath === pageBPath);
    assert.ok(pageBEntry);
    assert.ok(pageBEntry.texts.includes('ProfileCard'));
    assert.ok(pageBEntry.texts.includes('profile-card'));
  });

  test('provides workspace symbols for .kpa components and exported script symbols', async () => {
    const tempDirectory = await createWorkspaceTempDir('kpa-workspace-symbols');
    const componentPath = path.join(tempDirectory, 'UserCard.kpa');

    fs.writeFileSync(
      componentPath,
      [
        '[template]',
        '  <div></div>',
        '[/template]',
        '',
        '[ts]',
        '  export const buildUserCard = () => 1;',
        '[/ts]',
      ].join('\n'),
    );

    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(componentPath));
    await vscode.window.showTextDocument(document);
    await waitForExtensionActivation();

    const componentSymbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
      'vscode.executeWorkspaceSymbolProvider',
      'UserCard',
    );
    assert.ok(componentSymbols?.some((symbol) => symbol.name === 'UserCard'));
  });

  test('does not resolve canonical template symbol definitions inside compatibility alias blocks', async () => {
    const document = await vscode.workspace.openTextDocument({
      content: [
        '[html]',
        '  <div>{count}</div>',
        '[/html]',
        '',
        '[ts]',
        '  const count = 1;',
        '[/ts]',
      ].join('\n'),
      language: 'kpa',
    });
    await vscode.window.showTextDocument(document);
    await waitForExtensionActivation();

    const locations = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider',
      document.uri,
      new vscode.Position(1, 9),
    );

    assert.ok(!locations || locations.length === 0);
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

  test('provides hover information for imported .kpa component tags', async () => {
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'kpa-component-hover-'));
    const componentPath = path.join(tempDirectory, 'UserCard.kpa');
    const pagePath = path.join(tempDirectory, 'Page.kpa');

    fs.writeFileSync(
      componentPath,
      [
        '[template]',
        '  <div></div>',
        '[/template]',
        '',
        '[ts]',
        '  interface Props {',
        '    title: string;',
        '  }',
        '  type Emits = {',
        '    save: [id: number];',
        '  };',
        '  interface Slots {',
        '    default?: unknown;',
        '  }',
        '[/ts]',
      ].join('\n'),
    );
    fs.writeFileSync(
      pagePath,
      [
        '[template]',
        '  <UserCard />',
        '[/template]',
        '',
        '[ts]',
        "  import UserCard from './UserCard';",
        '[/ts]',
      ].join('\n'),
    );

    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(pagePath));
    await vscode.window.showTextDocument(document);
    await waitForExtensionActivation();

    const offset = document.getText().indexOf('UserCard') + 1;
    const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
      'vscode.executeHoverProvider',
      document.uri,
      document.positionAt(offset),
    );

    assert.ok(hovers);
    assert.ok(hovers.length > 0);

    const hoverText = getHoverText(hovers);
    assert.ok(hoverText.includes('component UserCard'));
    assert.ok(hoverText.includes('./UserCard'));
    assert.ok(hoverText.includes(componentPath));
    assert.ok(hoverText.includes('Props:'));
    assert.ok(hoverText.includes('title'));
    assert.ok(hoverText.includes('Emits:'));
    assert.ok(hoverText.includes('save'));
    assert.ok(hoverText.includes('Slots:'));
    assert.ok(hoverText.includes('default'));
  });

  test('provides typed hover information for member access inside canonical template expressions', async () => {
    const document = await vscode.workspace.openTextDocument({
      content: [
        '[template]',
        '  <div>{user.name}</div>',
        '[/template]',
        '',
        '[ts]',
        '  const user = { name: "Ada", age: 32 };',
        '[/ts]',
      ].join('\n'),
      language: 'kpa',
    });
    await vscode.window.showTextDocument(document);
    await waitForExtensionActivation();

    const offset = document.getText().indexOf('name') + 1;
    const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
      'vscode.executeHoverProvider',
      document.uri,
      document.positionAt(offset),
    );

    assert.ok(hovers);
    assert.ok(hovers.length > 0);

    const hoverText = getHoverText(hovers);
    assert.ok(hoverText.includes('name'));
    assert.ok(hoverText.includes('string'));
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

  test('publishes warning diagnostics for unresolved PascalCase component tags', async () => {
    const document = await vscode.workspace.openTextDocument({
      content: '[template]\n  <UserCard />\n[/template]',
      language: 'kpa',
    });
    await vscode.window.showTextDocument(document);

    const diagnostics = await waitForKpaDiagnostics(document, 1);

    assert.strictEqual(diagnostics.length, 1);
    assert.ok(
      diagnostics[0].message.includes('Komponente [UserCard] wurde im [template]-Block verwendet'),
    );
  });

  test('publishes warning diagnostics for missing identifiers in compound canonical expressions', async () => {
    const document = await vscode.workspace.openTextDocument({
      content: [
        '[template]',
        '  <div>{count + missing}</div>',
        '[/template]',
        '',
        '[ts]',
        '  const count = 1;',
        '[/ts]',
      ].join('\n'),
      language: 'kpa',
    });
    await vscode.window.showTextDocument(document);

    const diagnostics = await waitForKpaDiagnostics(document, 1);

    assert.strictEqual(diagnostics.length, 1);
    assert.ok(diagnostics[0].message.includes('Lokales Template-Symbol [missing]'));
  });
});
