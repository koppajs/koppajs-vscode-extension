import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repositoryRequire = createRequire(path.resolve('package.json'));
const cliRequire = createRequire(repositoryRequire.resolve('@vscode/test-cli'));
const mochaRequire = createRequire(cliRequire.resolve('mocha'));
const { load } = mochaRequire('js-yaml') as { load: (source: string) => unknown };
const source = fs.readFileSync('.github/workflows/release.yml', 'utf8');
const workflow = load(source) as {
  on: { push: { tags: string[] } };
  permissions?: Record<string, string>;
  jobs: {
    publish: {
      permissions?: Record<string, string>;
      environment?: unknown;
      steps: { name: string; run?: string; env?: Record<string, string> }[];
    };
  };
};
const publish = workflow.jobs.publish;
const publishingSteps = publish.steps.filter((step) => step.run?.includes('vsce publish'));

describe('release workflow trusted publishing contract', () => {
  it('grants OIDC and GitHub release permissions only on the publishing job', () => {
    expect(workflow.permissions).toBeUndefined();
    expect(publish.permissions).toEqual({ contents: 'write', 'id-token': 'write' });
  });

  it('publishes the validated VSIX explicitly through OIDC', () => {
    expect(publishingSteps).toHaveLength(1);
    expect(publishingSteps[0].run?.trim()).toBe(
      'npm exec -- vsce publish --packagePath .local/release/*.vsix --oidc',
    );
  });

  it('does not configure PAT credentials or a different policy environment', () => {
    expect(source).not.toContain('VSCE_PAT');
    expect(source).not.toMatch(/--pat\b/);
    expect(publishingSteps[0].env).toBeUndefined();
    expect(publish.environment).toBeUndefined();
  });

  it('keeps publishing gated by tag ancestry, validation, version and artifact upload', () => {
    const names = publish.steps.map((step) => step.name);
    const required = [
      'Verify tag commit is on main',
      'Install dependencies',
      'Validate repository',
      'Verify tag matches package version',
      'Create GitHub release',
      'Upload VSIX artifact to GitHub release',
      'Publish extension to Visual Studio Marketplace',
    ];
    const indices = required.map((name) => names.indexOf(name));
    expect(indices.every((index) => index >= 0)).toBe(true);
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
    expect(publish.steps.find((step) => step.name === 'Validate repository')?.run).toBe(
      'xvfb-run -a npm run validate',
    );
  });

  it('fetches main without truncating ancestry before validating release tags', () => {
    const fetch = publish.steps.find((step) => step.name === 'Fetch main branch');
    expect(fetch?.run).toBe('git fetch origin main');
  });

  it('retains the tag-only trigger matching the existing release process', () => {
    expect(workflow.on).toEqual({ push: { tags: ['v*.*.*'] } });
  });
});
