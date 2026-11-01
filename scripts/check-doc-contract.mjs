import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const checks = [
  {
    file: 'README.md',
    snippets: [
      '<a id="readme-top"></a>',
      'https://public-assets-1b57ca06-687a-4142-a525-0635f7649a5c.s3.eu-central-1.amazonaws.com/koppajs/koppajs-logo-text-900x226.png',
      '<summary>Table of Contents</summary>',
      '## Architecture & Governance',
      '## Community & Contribution',
      '## License',
    ],
  },
  {
    file: 'CHANGELOG.md',
    snippets: ['# Change Log', '## [Unreleased]'],
  },
  {
    file: 'CODE_OF_CONDUCT.md',
    snippets: [
      '<a id="coc-top"></a>',
      '## Introduction',
      '## Our Pledge',
      '## Our Standards',
      '## Responsibilities of Maintainers',
      '## Enforcement',
      '## Scope',
      '## Attribution',
    ],
  },
  {
    file: 'CONTRIBUTING.md',
    snippets: [
      '<a id="contributing-top"></a>',
      '## Philosophy',
      '## Repository Governance',
      '## Documentation Contract',
      '## Requirements',
      '## Development Workflow',
      '## Code Style & Quality',
      '## Commit Conventions',
      '## Testing Guidelines',
      '## Scripts',
      '## Releasing',
      '## Need Help?',
    ],
  },
  {
    file: 'docs/specs/repository-documentation-contract.md',
    snippets: [
      '# Repository Documentation Contract',
      '## Scope',
      '## Governed Files',
      '## README Contract',
      '## CHANGELOG Contract',
      '## CODE_OF_CONDUCT Contract',
      '## CONTRIBUTING Contract',
      '## Validation & Enforcement',
      '## Acceptance Criteria',
    ],
  },
  {
    file: 'docs/specs/README.md',
    snippets: ['# Specifications', 'repository-documentation-contract.md'],
  },
  {
    file: 'DEVELOPMENT_RULES.md',
    snippets: [
      'repository-documentation-contract.md',
      'README.md',
      'CHANGELOG.md',
      'CODE_OF_CONDUCT.md',
      'CONTRIBUTING.md',
    ],
  },
  {
    file: 'package.json',
    snippets: ['check:docs', 'scripts/check-doc-contract.mjs'],
  },
  {
    file: '.husky/pre-commit',
    snippets: ['check:docs'],
  },
];

let failed = false;

for (const check of checks) {
  const absolutePath = path.join(root, check.file);
  if (!existsSync(absolutePath)) {
    console.error(`Missing required file: ${check.file}`);
    failed = true;
    continue;
  }

  const content = readFileSync(absolutePath, 'utf8');
  for (const snippet of check.snippets) {
    if (!content.includes(snippet)) {
      console.error(`Contract violation in ${check.file}: missing snippet -> ${snippet}`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log('Documentation contract check passed.');
