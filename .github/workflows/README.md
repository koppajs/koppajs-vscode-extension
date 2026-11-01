# Workflow Expectations

This repository defines hosted GitHub Actions workflows for CI and releases.
They should enforce the same quality gates described in `TESTING_STRATEGY.md`,
`docs/meta/tooling-baseline.md`, and `docs/quality/`.

## Current Baseline Jobs

- CI runs on pull requests to `develop` and `main`, and on pushes to `develop`
  and `main`
- CI validates the repository with `xvfb-run -a npm run validate` on Node.js 22.22.1,
  24, and 26
- release tags rerun `xvfb-run -a npm run validate` on the maintainer default
  from `.nvmrc`, verify the tag commit is already on `main`, verify the tag
  version, create a GitHub release, upload the `.vsix`, and publish it to the
  Visual Studio Marketplace through OIDC Trusted Publishing (no Marketplace PAT).
- `release.yml` grants `contents: write` and `id-token: write` only on its publishing
  job. The policy must match `koppajs/koppajs-vscode-extension`, workflow filename
  `release.yml`, and an empty environment. See `RELEASE.md` for setup and
  `docs/specs/release-publishing.md` for the authentication contract.

`npm run validate` includes documentation checks, formatting, linting,
typechecking, the CLI diagnostics smoke test, VS Code integration tests, and a
packaging check that builds the release `.vsix` and runs the editor suite against
its minified bundles. The ecosystem production-build and CLI fixture check is
also part of the test gate.

## Governance Rule

If hosted workflow behavior changes, update:

- `TESTING_STRATEGY.md`
- `docs/meta/tooling-baseline.md`
- `docs/quality/quality-gates.md`
- `RELEASE.md`
