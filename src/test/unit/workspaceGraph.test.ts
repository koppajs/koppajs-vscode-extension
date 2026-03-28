import fs from 'fs';
import os from 'os';
import path from 'path';
import { KpaWorkspaceGraph } from '@koppajs/koppajs-language-core';
import { describe, expect, it } from 'vitest';

describe('workspace graph', () => {
  it('invalidates dependent importer files when a component file changes', () => {
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'kpa-workspace-graph-'));
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

    const workspaceGraph = new KpaWorkspaceGraph({ rootPaths: [tempDirectory] });

    expect(
      workspaceGraph
        .collectComponentUsagesForResolvedFile(componentPath)
        .map((usage) => usage.filePath),
    ).toEqual([pagePath]);
    const affectedPaths = workspaceGraph.invalidatePath(componentPath);

    expect(affectedPaths).toContain(componentPath);
    expect(affectedPaths).toContain(pagePath);
  });
});
