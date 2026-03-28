import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { KpaWorkspaceIndex } from '../../language/workspaceIndex';

describe('workspace index', () => {
  it('finds component files, workspace symbols, and diagnostics across a workspace root', () => {
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'kpa-workspace-index-'));
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
        '  export const buildUserCard = () => 1;',
        '[/ts]',
      ].join('\n'),
    );
    fs.writeFileSync(
      pagePath,
      [
        '[template]',
        '  <UserCard />',
        '  <div>{missing}</div>',
        '[/template]',
        '',
        '[ts]',
        "  import UserCard from './UserCard';",
        '[/ts]',
      ].join('\n'),
    );

    const workspaceIndex = new KpaWorkspaceIndex({ rootPaths: [tempDirectory] });

    expect([...workspaceIndex.getKpaFilePaths()].sort()).toEqual([componentPath, pagePath].sort());
    expect(workspaceIndex.findComponentFilePathsByName('UserCard')).toEqual([componentPath]);
    expect(
      workspaceIndex.collectWorkspaceSymbols('buildUserCard').map((symbol) => symbol.name),
    ).toEqual(['buildUserCard']);
    expect(
      workspaceIndex
        .collectComponentUsagesForResolvedFile(componentPath)
        .flatMap((entry) => entry.usages)
        .map((usage) => usage.component.name),
    ).toEqual(['UserCard']);
    expect(
      workspaceIndex
        .collectDiagnosticsForPaths([tempDirectory])
        .flatMap((entry) => entry.diagnostics)
        .some((diagnostic) => diagnostic.message.includes('Lokales Template-Symbol [missing]')),
    ).toBe(true);
  });
});
