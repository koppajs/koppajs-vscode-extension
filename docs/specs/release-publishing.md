# Spec: Release Publishing

## Status

Active

## Summary

The existing tag-driven release workflow publishes its validated VSIX to Visual Studio Marketplace using GitHub Actions OIDC Trusted Publishing, without a stored Marketplace PAT.

## Description

This spec owns the validated artifact and authentication boundary of `.github/workflows/release.yml`. Branching, versioning and the release sequence remain defined in `RELEASE.md`.

## Inputs

- A pushed `vX.Y.Z` tag whose commit is already on `main`
- A package version matching the tag
- A Marketplace Trusted Publishing policy for publisher `koppajs`, repository owner `koppajs`, repository `koppajs-vscode-extension`, workflow `release.yml`, with no environment

## Outputs

- A GitHub release containing the validated VSIX
- The same VSIX published to Visual Studio Marketplace

## Behavior

1. Fetch `main` without a shallow-depth boundary so tags on earlier main commits
   remain verifiable even when main advances. Verify tag ancestry, install dependencies and run the existing full validation gate.
2. Verify the package/tag version match, then create the GitHub release and upload the VSIX.
3. Publish `.local/release/*.vsix` with `vsce publish --packagePath ... --oidc`.
4. Grant `contents: write` and `id-token: write` on the publishing job. The former supports GitHub release creation; the latter requests the short-lived OIDC credential.

### Local Artifact Validation

`npm run release:check` packages with vsce and reads the generated VSIX as a ZIP, not just a file listing. It requires non-empty `extension/dist/extension.js`, `extension/dist/language-server.js`, `extension/dist/package.json` and `extension/package.json`. The extension manifest retains `main: "./dist/extension.js"` and root `type: "module"`; the dist marker must declare `type: "commonjs"`.

The manifest must declare `icon: "assets/icon.png"`. The archive must contain
that original KoppaJS PNG asset and preserve its workspace bytes. Missing,
empty, or changed icons fail the release check.

The three dist files must be byte-identical to the workspace files before and after `test:integration:release`. The archive must also remain unchanged during the host run. The host loads the workspace extension, not an installed VSIX; these comparisons connect its tested runtime bytes to the archive but do not prove VSIX installation behavior.

Archive entries must exclude `.diffuno`, `node_modules`, `src`, `out`, `test`, `tests`, `__tests__`, and `scripts` directories, TypeScript/JSX sources, JavaScript test/spec files, source maps and the development-only `dist/kpa-check.js`. Unsafe paths and case-colliding duplicate names fail validation. Required JSON must parse. The ZIP reader comes from the installed vsce dependency tree; no second archive dependency is added.

## Constraints

- Keep the tag-only trigger, workflow filename and lack of a GitHub environment aligned with the Marketplace policy.
- Do not pass `VSCE_PAT`, `--pat`, or a PAT fallback to Marketplace publishing.
- GitHub release operations retain the built-in `github.token`; it is not a Marketplace credential.
- Do not request or store a Marketplace token before building. The publish command obtains its credential when needed.

## Edge Cases

- Missing or mismatched Marketplace policy or OIDC permissions must fail publication, not fall back to a secret.
- A local test cannot prove the GitHub-to-Marketplace token exchange.
- For private repositories, Microsoft requires the configured workflow to run within 48 hours of policy creation for activation.

## Acceptance Criteria

- `releaseWorkflow.test.ts` parses the actual YAML and verifies permissions, OIDC-only publishing, artifact selection, release gates and tag-only triggering.
- `releaseArchive.test.ts` uses small generated ZIP fixtures to verify required runtime files, CommonJS/manifest contracts, byte drift, forbidden payloads, malformed JSON, corrupt archives and duplicate names.
- `npm run release:check` passes archive validation and release-host tests without rebuilding development bundles between comparisons.
- The installed vsce CLI supports `--oidc`.
- Documentation describes the exact policy identity and no longer requires a Marketplace PAT.
- Live acceptance requires an explicitly authorized release run and a successful Marketplace publish step.

## Evolution

- `evolution_phase`: release-authentication
- `completeness_level`: workflow-and-local-contract-tests
- `known_gaps`: live OIDC token exchange requires an authorized GitHub Actions release run
- `deferred_complexity`: none; no new release trigger or retry mechanism is introduced
- `technical_debt_items`: keep Marketplace policy identity aligned with future workflow or environment changes
