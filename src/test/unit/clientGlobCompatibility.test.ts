import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { compileFunction } from 'node:vm';
import { describe, expect, it } from 'vitest';

const repositoryRequire = createRequire(path.resolve('package.json'));
const clientRequire = createRequire(repositoryRequire.resolve('vscode-languageclient'));
const fileOperationsPath = clientRequire.resolve('./fileOperations.js');
const globPatternPath = clientRequire.resolve('./utils/globPattern.js');

type Resource = { fsPath: string; scheme: string };
type GlobPattern = string | { baseUri: string | { uri: string }; pattern: string };
type OperationPattern = {
  glob: string;
  matches?: 'file' | 'folder';
  options?: { ignoreCase: boolean };
};
type FileOperationFeature = {
  register(data: {
    id: string;
    registerOptions: { filters: { scheme?: string; pattern: OperationPattern }[] };
  }): void;
  filter(
    event: { files: Resource[] },
    prop: (resource: Resource) => Resource,
  ): Promise<{
    files: Resource[];
  }>;
  clear(): void;
};

// Load the installed CommonJS helpers without rewriting their source or mocking minimatch.
// Only the editor API is replaced; every other require resolves from the helper's own path.
function loadClientHelper<T>(filename: string, vscode: object): T {
  const localRequire = createRequire(filename);
  const module = { exports: {} };
  const execute = compileFunction(
    fs.readFileSync(filename, 'utf8'),
    ['require', 'module', 'exports'],
    {
      filename,
    },
  );
  execute((id: string) => (id === 'vscode' ? vscode : localRequire(id)), module, module.exports);
  return module.exports as T;
}

// The relative-pattern helper needs only Uri.parse(), path, with({ path }), and fsPath.
// Keep these URI paths POSIX-like on every host; Windows fsPath inputs are tested separately.
function selectorUri(uri: string) {
  const parsed = new URL(uri);
  const create = (uriPath: string) => ({
    path: uriPath,
    fsPath: uriPath,
    with: (changes: { path: string }) => create(changes.path),
  });
  return create(decodeURIComponent(parsed.pathname));
}

const { matchGlobPattern } = loadClientHelper<{
  matchGlobPattern(pattern: GlobPattern, resource: Resource): boolean;
}>(globPatternPath, { Uri: { parse: selectorUri } });

function resource(fsPath: string, scheme = 'file'): Resource {
  return { fsPath, scheme };
}

async function matchFileOperations(
  pattern: OperationPattern,
  files: Resource[],
  fileType = 1,
  scheme?: string,
): Promise<Resource[]> {
  const { DidCreateFilesFeature } = loadClientHelper<{
    DidCreateFilesFeature: new (client: object) => FileOperationFeature;
  }>(fileOperationsPath, {
    FileType: { File: 1, Directory: 2 },
    workspace: {
      onDidCreateFiles: () => ({ dispose() {} }),
      fs: { stat: async () => ({ type: fileType }) },
    },
  });
  const feature = new DidCreateFilesFeature({
    code2ProtocolConverter: { asDidCreateFilesParams: (value: unknown) => value },
  });
  try {
    feature.register({ id: 'compatibility', registerOptions: { filters: [{ pattern, scheme }] } });
    return (await feature.filter({ files }, (value) => value)).files;
  } finally {
    feature.clear();
  }
}

describe('language client resolved minimatch compatibility', () => {
  it('resolves minimatch from both installed helper locations', () => {
    expect(createRequire(fileOperationsPath).resolve('minimatch')).toBe(
      createRequire(globPatternPath).resolve('minimatch'),
    );
  });

  describe('actual file operation registration and filtering', () => {
    it.each([
      ['dotfile', '/workspace/.view.kpa'],
      ['hidden directory', '/workspace/.components/view.kpa'],
      ['nested file', '/workspace/components/view.kpa'],
      ['Windows separators', 'C:\\workspace\\components\\view.kpa'],
    ])('matches %s with the client dot option and path normalization', async (_, fsPath) => {
      const file = resource(fsPath);
      expect(await matchFileOperations({ glob: '**/*.kpa' }, [file])).toEqual([file]);
    });

    it.each([true, false])('honors ignoreCase=%s', async (ignoreCase) => {
      const file = resource('/workspace/VIEW.KPA');
      expect(
        await matchFileOperations({ glob: '**/*.kpa', options: { ignoreCase } }, [file]),
      ).toEqual(ignoreCase ? [file] : []);
    });

    it('keeps matching case-sensitive when no options are provided', async () => {
      expect(
        await matchFileOperations({ glob: '**/*.kpa' }, [resource('/workspace/VIEW.KPA')]),
      ).toEqual([]);
    });

    it.each([
      ['file', 1, true],
      ['file', 2, false],
      ['folder', 1, false],
      ['folder', 2, true],
    ] as const)('filters %s patterns against file type %s', async (matches, fileType, expected) => {
      const file = resource('/workspace/component');
      expect(
        await matchFileOperations({ glob: '**/component', matches }, [file], fileType),
      ).toEqual(expected ? [file] : []);
    });

    it('retries trailing-slash folder patterns for directories', async () => {
      const directory = resource('C:\\workspace\\components');
      expect(
        await matchFileOperations({ glob: '**/components/', matches: 'folder' }, [directory], 2),
      ).toEqual([directory]);
    });

    it('does not accept a file through the trailing-slash directory retry', async () => {
      expect(
        await matchFileOperations(
          { glob: '**/components/', matches: 'folder' },
          [resource('/workspace/components')],
          1,
        ),
      ).toEqual([]);
    });

    it('preserves scheme filtering and excludes nonmatching paths', async () => {
      const file = resource('/workspace/view.kpa');
      expect(
        await matchFileOperations(
          { glob: '**/*.kpa' },
          [file, resource('/workspace/view.kpa', 'untitled'), resource('/workspace/view.ts')],
          1,
          'file',
        ),
      ).toEqual([file]);
    });

    it('retains brace and extglob matching enabled by the file operation caller', async () => {
      const files = [resource('/workspace/view.kpa'), resource('/workspace/book.ipynb')];
      expect(await matchFileOperations({ glob: '**/*.{kpa,ipynb}' }, files)).toEqual(files);
      expect(await matchFileOperations({ glob: '**/*.@(kpa|ipynb)' }, files)).toEqual(files);
    });

    it.each([
      ['!', true],
      ['!!', false],
      ['!#comment', true],
    ] as const)('preserves leading negation for %j', async (glob, matches) => {
      const file = resource('/workspace/view.kpa');
      expect(await matchFileOperations({ glob }, [file])).toEqual(matches ? [file] : []);
      expect(matchGlobPattern(glob, file)).toBe(matches);
    });

    it('keeps invalid character ranges registered but nonmatching', async () => {
      const file = resource('/workspace/[z-a].kpa');
      expect(await matchFileOperations({ glob: '/workspace/[z-a].kpa' }, [file])).toEqual([]);
      expect(matchGlobPattern('/workspace/[z-a].kpa', file)).toBe(false);
    });

    it('uses minimatch 11 Bash-style negative extglob suffix semantics', async () => {
      const file = resource('/workspace/a.kpa');
      expect(await matchFileOperations({ glob: '**/!(a)*' }, [file])).toEqual([file]);
    });

    it.each([
      ['k', 'K'],
      ['s', 'ſ'],
    ])('uses Unicode case folding for %s when ignoreCase is enabled', async (pattern, letter) => {
      const file = resource(`/workspace/${letter}.kpa`);
      expect(
        await matchFileOperations({ glob: `**/${pattern}.kpa`, options: { ignoreCase: true } }, [
          file,
        ]),
      ).toEqual([file]);
      expect(await matchFileOperations({ glob: `**/${pattern}.kpa` }, [file])).toEqual([]);
    });

    it.each(['', '#comment'])('rejects a pattern with no parsed alternatives: %j', async (glob) => {
      await expect(matchFileOperations({ glob }, [])).rejects.toThrow(`Invalid pattern ${glob}!`);
    });
  });

  describe('actual matchGlobPattern used by diagnostic and notebook selectors', () => {
    it.each(['kpa', 'ipynb'])(
      'matches relative %s selectors with a string base URI',
      (extension) => {
        const pattern = { baseUri: 'file:///workspace', pattern: `**/*.${extension}` };
        expect(matchGlobPattern(pattern, resource(`/workspace/nested/view.${extension}`))).toBe(
          true,
        );
        expect(matchGlobPattern(pattern, resource(`/elsewhere/nested/view.${extension}`))).toBe(
          false,
        );
      },
    );

    it('accepts a workspace-folder base URI object and encoded spaces', () => {
      expect(
        matchGlobPattern(
          { baseUri: { uri: 'file:///my%20workspace' }, pattern: '**/*.kpa' },
          resource('/my workspace/view.kpa'),
        ),
      ).toBe(true);
    });

    it('normalizes Windows separators in the glob against a normalized resource path', () => {
      expect(
        matchGlobPattern('C:\\workspace\\**\\*.kpa', resource('C:/workspace/src/view.kpa')),
      ).toBe(true);
      expect(
        matchGlobPattern('C:\\workspace\\**\\*.kpa', resource('D:/workspace/src/view.kpa')),
      ).toBe(false);
    });

    it.each([
      ['/workspace/view.kpa', true],
      ['/workspace/.view.kpa', false],
      ['/workspace/.hidden/view.kpa', false],
      ['/workspace/VIEW.KPA', false],
    ])('preserves selector defaults for %s', (fsPath, expected) => {
      expect(matchGlobPattern('/workspace/**/*.kpa', resource(fsPath))).toBe(expected);
    });

    it('uses noext rather than enabling file-operation extglobs', () => {
      expect(matchGlobPattern('/workspace/*.@(kpa|ipynb)', resource('/workspace/view.kpa'))).toBe(
        false,
      );
      expect(
        matchGlobPattern('/workspace/*.@(kpa|ipynb)', resource('/workspace/view.@(kpa|ipynb)')),
      ).toBe(true);
      expect(matchGlobPattern('/workspace/*.{kpa,ipynb}', resource('/workspace/book.ipynb'))).toBe(
        true,
      );
    });

    it.each(['', '#comment'])('returns false for empty parsed alternatives in %j', (pattern) => {
      expect(matchGlobPattern(pattern, resource('/workspace/view.kpa'))).toBe(false);
    });

    it('returns false for an invalid relative base URI', () => {
      expect(
        matchGlobPattern(
          { baseUri: 'not a URI', pattern: '**/*.kpa' },
          resource('/workspace/view.kpa'),
        ),
      ).toBe(false);
    });

    it('keeps unmatched brackets literal rather than treating them as registration errors', async () => {
      const file = resource('/workspace/[literal.kpa');
      expect(matchGlobPattern('/workspace/[literal.kpa', file)).toBe(true);
      expect(await matchFileOperations({ glob: '/workspace/[literal.kpa' }, [file])).toEqual([
        file,
      ]);
    });
  });
});
