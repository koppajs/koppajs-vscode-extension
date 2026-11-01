# ADR 0002: Centralize Runtime Registration in the Extension Entrypoint

## Status

Accepted

## Context

The extension runtime is composed of several features: completion providers, diagnostics, and event listeners. Without a single composition root, registration logic would become harder to trace and activation behavior would fragment across modules.

## Decision

Keep `src/extension.ts` as the single runtime entrypoint and composition root. Feature modules should export registration functions or focused services, but they should not self-register at import time.

## Consequences

- Activation behavior remains easy to audit.
- Feature modules stay reusable and less stateful.
- Architectural ownership is clearer for future changes.
- Large entrypoint growth must be managed by extracting helpers without moving ownership.

## Alternatives Considered

- Let each provider self-register on import. Rejected because it hides runtime behavior.
- Introduce an inversion-of-control container. Rejected as unnecessary complexity for the current extension size.
