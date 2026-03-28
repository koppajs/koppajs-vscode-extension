import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { resolveWorkspaceImportPath } from '../../language/projectConfig';

describe('project config resolution', () => {
  it('resolves .kpa imports through tsconfig path aliases', () => {
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'kpa-project-config-'));
    const projectDirectory = path.join(tempDirectory, 'app');
    const componentDirectory = path.join(projectDirectory, 'src', 'components');
    const sourcePath = path.join(projectDirectory, 'src', 'pages', 'Page.kpa');

    fs.mkdirSync(componentDirectory, { recursive: true });
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
    fs.writeFileSync(
      path.join(projectDirectory, 'tsconfig.json'),
      JSON.stringify(
        {
          compilerOptions: {
            baseUrl: '.',
            paths: {
              '@components/*': ['src/components/*'],
            },
          },
        },
        null,
        2,
      ),
    );
    fs.writeFileSync(path.join(componentDirectory, 'UserCard.kpa'), '[template][/template]\n');

    expect(resolveWorkspaceImportPath('@components/UserCard', sourcePath, ['.kpa'])).toBe(
      path.join(componentDirectory, 'UserCard.kpa'),
    );
  });
});
