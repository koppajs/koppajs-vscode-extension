# ADR 0007: Use Marketplace Trusted Publishing

## Context

The release workflow used a stored Marketplace PAT. The publisher now has a Trusted Publishing policy for `koppajs/koppajs-vscode-extension`, workflow `release.yml`, without a GitHub environment. The installed vsce supports GitHub Actions OIDC authentication.

## Decision

Use `vsce publish --packagePath .local/release/*.vsix --oidc`. Grant `contents: write` and `id-token: write` only on the existing publishing job. Remove the Marketplace PAT input without adding a fallback. Keep the tag-only trigger, ancestry/version checks, validation and artifact flow unchanged.

## Consequences

- No long-lived Marketplace credential is stored in GitHub Secrets.
- Workflow filename, repository identity and environment must stay aligned with the publisher policy.
- Local contract tests verify configuration, not the live token exchange. Live acceptance requires a separately authorized release run.
- The built-in GitHub token remains necessary for creating the GitHub release and uploading its VSIX.

## Alternatives Considered

- Retain PAT authentication: adds secret rotation and expiry management despite the supported federated path.
- Add a second publishing workflow: duplicates release ownership and requires a different policy identity.
- Trigger a release just to test authentication: causes an external publication and is not part of a local configuration change.
