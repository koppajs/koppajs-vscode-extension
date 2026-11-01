# Release Process for `koppajs-vscode-extension`

This document describes the repository-specific release workflow for
`koppajs-vscode-extension`.

The project uses a manual, tag-driven release process.
Only tagged versions are official releases.

The effective flow is:

1. Finalize the release content on `develop`
2. Create a `release/*` branch from that state
3. Merge the release branch into `main`
4. Tag the release commit on `main` as `vX.Y.Z`
5. Push `main` and then push the tag
6. Let GitHub Actions validate the repository, attach the `.vsix` to a GitHub release, and publish to the Visual Studio Marketplace
7. Merge the updated `main` back into `develop`

## Release Model

This repository does not use automated versioning tools such as Changesets or
semantic-release.

The release is controlled by:

- the version in `package.json`
- the release entry in `CHANGELOG.md`
- the merge of the release-ready state into `main`
- the Git tag in the form `vX.Y.Z`
- the GitHub Actions workflows in `.github/workflows/`
- the generated `.vsix` payload validated by `npm run release:check`

Important consequences:

- a merge to `main` alone does not publish anything
- a tag push is the technical release trigger
- the tag version must exactly match `package.json`
- the tag must point to a commit that is already on `main`
- the workflow fetches `main` without truncating ancestry, including when main
  advances beyond the tagged commit
- the published artifact is the validated `.vsix`, not the raw repository tree
- after a successful release, `main` should be merged back into `develop`

Do not tag `develop`.
Do not tag the `release/*` branch.
Tag only the release commit that is already on `main`.

## Preconditions

Before cutting a release, ensure all of the following are true:

- the intended release scope is already complete on `develop`
- `package.json.name` is exactly `koppajs-vscode-extension`
- `package.json.version` contains the target version
- `CHANGELOG.md` contains the corresponding release notes
- `package-lock.json` is up to date
- the release content has been reviewed
- the Marketplace publisher `koppajs` has a Trusted Publishing policy matching this GitHub repository and `release.yml`

Tooling expectations for local verification:

- Node.js `^22.22.1 || ^24.0.0 || >=26.0.0`
- npm 10 or newer

The hosted release workflow uses the maintainer default from `.nvmrc`, which
currently stays on Node 22.22.1.

## Marketplace Authentication

Marketplace publishing uses GitHub Actions OIDC Trusted Publishing, not a stored PAT. In the [publisher management page](https://marketplace.visualstudio.com/manage), open publisher `koppajs`, select **Trusted Publishing**, and create a policy with:

| Field            | Value                                                  |
| ---------------- | ------------------------------------------------------ |
| Repository owner | `koppajs`                                              |
| Repository       | `koppajs-vscode-extension`                             |
| Workflow         | `release.yml` (filename only)                          |
| Environment      | Empty; this workflow does not use a GitHub environment |

The publishing job grants `contents: write` for GitHub release operations and `id-token: write` for OIDC. The final step runs `vsce publish --packagePath .local/release/*.vsix --oidc`, publishing the validated artifact without rebuilding it. The built-in `github.token` remains scoped to GitHub release commands; it is not used for Marketplace authentication. No `VSCE_PAT` secret or Azure DevOps organization is required for this authentication path.

Keep the policy aligned if the repository, workflow filename or environment changes. For private repositories, run the configured workflow within 48 hours after policy creation, as required by Microsoft. An active policy alone does not prove successful token exchange; confirm the Marketplace publish step during an authorized release run.

See [the official publishing guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#publish-with-github-actions-and-trusted-publishing) and [the release publishing spec](docs/specs/release-publishing.md).

## Local Validation Before Branching

Before creating the release branch, validate the exact release candidate
locally.

Recommended commands:

```bash
npm ci
xvfb-run -a npm run validate
```

Why this matters:

- the release workflow runs the same validation gate again in CI
- failing locally is cheaper than failing after tagging
- `npm run release:check` verifies that the extension packages cleanly into a
  `.vsix`, then runs the editor integration suite against the minified release bundles

### Archive and Release-Host Contract

`npm run release:check` delegates the entire sequence to `scripts/check-release-package.mjs`: package with `vsce`, inspect the actual VSIX ZIP, run `npm run test:integration:release`, then repeat archive/workspace verification. The host invocation belongs inside the script between the archive checks, not in an external `&&` chain. ZIP reading reuses `yauzl` already installed by `@vscode/vsce`; no dependencies are added or changed.

Required archive entries and metadata:

- `extension/dist/extension.js` and `extension/dist/language-server.js`
- `extension/dist/package.json` with `type: "commonjs"`
- `extension/package.json` with `main: "./dist/extension.js"` and the ESM root `type: "module"`

Reject `.diffuno`, `node_modules`, `src`, `out`, `test`, `tests`, and `scripts` directories, source files such as `.ts`/`.tsx`, and source maps (`.map`). A non-empty archive or a packaging file list alone does not satisfy this contract.

Compare workspace `dist/extension.js`, `dist/language-server.js`, and `dist/package.json` byte-for-byte with their archived counterparts before and after the release-host tests. Do not replace these minified artifacts with development builds during the sequence.

The release tests still use the workspace Extension Development Host; they neither install nor load the VSIX. Byte equality connects the host's workspace artifacts to the archive, but does not establish clean-install behavior, independence from workspace files, or Marketplace installation success.

The generated release artifact is written to:

- `.local/release/<name>-<version>.vsix`

## Step-by-Step Release Workflow

### 1. Finalize the release on `develop`

Ensure `develop` already contains the exact release content.

Typical release preparation includes:

- updating `package.json` from the previous version to the next release version
- moving the relevant notes into the final section in `CHANGELOG.md`
- committing any last release fixes

Do not create the tag at this stage.

### 2. Create the `release/*` branch

Create a release branch from the validated `develop` state.

Example:

```bash
git checkout -b release/X.Y.Z
```

### 3. Merge the release branch into `main`

Merge `release/*` into `main` using the repository's normal process.

The critical requirement is:

- `main` must contain the final release commit before tagging

### 4. Tag the release commit on `main`

After the release branch has been merged, create the Git tag on the release
commit that is now on `main`.

Example:

```bash
git checkout main
git pull
git tag vX.Y.Z
```

The tag format is mandatory:

- `vX.Y.Z` is valid
- `X.Y.Z` is not valid for this workflow

### 5. Push `main` and the tag

Push the merged `main` branch and then the tag.

Example:

```bash
git push origin main
git push origin vX.Y.Z
```

The release workflow is triggered by the tag push.
Without the tag push, no official release happens.

### 6. Wait for the release workflow to finish

First verify that:

- the GitHub Actions release workflow passed
- the GitHub Release was created
- the `.vsix` artifact was uploaded to the GitHub Release
- the Visual Studio Marketplace publish step completed successfully

### 7. Merge `main` back into `develop`

After the release has been successfully published, merge the updated `main`
back into `develop`.
