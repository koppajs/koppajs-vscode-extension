# ADR 0006: Use Guarded Dependency Security Adaptations

## Context

The current upstream tool/client releases still require vulnerable transitive major versions. Waiting for upstream leaves 18 audit entries after the initial serializer fix. Glob 14.0.3, minimatch 11.0.3 and diff 8.0.3 provide published security fixes within the supported Node runtime, but their parent packages have not adopted those majors.

A bare minimatch override is unsafe: client 11.0.0 calls the removed `Minimatch.makeRe()` method in two helper files. Real client contract tests expose this failure. The client uses the result only as a boolean before calling `match()`; it never consumes the compiled RegExp. The new engine has no equivalent regex compilation step.

## Decision

- Use version-scoped overrides for the inventoried parents, not global overrides or forced direct-package downgrades. Pin the affected direct consumers to the exact reviewed versions.
- Install minimatch 11.0.3, glob 14.0.3, Mocha diff 8.0.3 and the existing Mocha serializer 7.1.4.
- Run `scripts/prepare-languageclient.mjs` during root postinstall. Adapt only the two client boolean checks from `!matcher.makeRe()` to `matcher.set.length === 0`. Empty/comment patterns remain rejected. All matching, options and path normalization remain in the actual client and minimatch implementation.
- Verify client and resolved matcher versions and both original file SHA-256 hashes before writing. Accept repeated application; reject unknown or partially modified sources. The script does not restore the removed API or implement a regex shim.
- Accept and document minimatch 11's Bash-style negative extglob suffix behavior and Unicode case folding for case-insensitive filters. Protect these choices with explicit tests rather than claiming full minimatch 10 semantic equivalence.
- Require security regression tests, real consumer compatibility tests, clean installation, both audit scopes, a valid npm dependency tree, full validation and coverage for this remediation.

## Consequences

- Production bundles contain the patched matcher instead of depending on a limited reachability argument for vulnerable code.
- Installation now has an explicit, repository-owned preparation step. An install with `--ignore-scripts` must run `node scripts/prepare-languageclient.mjs` before building.
- Upstream client/source changes stop preparation until maintainers review or remove the adaptation. Remove the patch and related overrides when an upstream client supports patched minimatch without it.
- The repository owns two source-level checks, not a language-client fork. It must not grow this adaptation into custom matching or LSP behavior.
- A zero audit count describes the current advisory database, not an assurance that every attacker-controlled pattern has bounded cost or that untrusted test code is safe.

## Alternatives Considered

- Retain findings based on current exposure: insufficient for the requested full remediation and still ships the affected implementation.
- Force all majors globally: hides consumer-specific API breaks and unnecessarily changes future dependency edges.
- Reintroduce `makeRe()` or preserve the old regex engine: defeats the new engine's design and adds a larger, harder-to-verify compatibility surface.
- Maintain a local patched minimatch 10 fork: adds a complete package maintenance burden while npm continues to flag the old version; no upstream backport is published.
- Replace the whole test runner or downgrade client/ESLint: unnecessary for the affected APIs and risks the current LSP/tooling contract.
