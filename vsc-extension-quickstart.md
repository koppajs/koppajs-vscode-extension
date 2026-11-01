# Legacy Quickstart Note

This repository no longer follows the generated VS Code extension scaffold.
The original quickstart assumptions about a `Hello World` command, test layout,
and command-driven activation do not apply here.

Use these documents instead:

- [README.md](./README.md) for the repository contract and scope
- [DEVELOPMENT_README.md](./DEVELOPMENT_README.md) for local build, test, and packaging steps
- [CONTRIBUTING.md](./CONTRIBUTING.md) for contributor workflow expectations
- [ARCHITECTURE.md](./ARCHITECTURE.md) for module responsibilities and runtime boundaries

Current repository specifics:

- `src/extension.ts` remains the runtime composition root
- tests live under `src/test/unit/` and `src/test/integration/`
- the extension activates for `.kpa` files through `onLanguage:kpa`
- the user-visible contract is defined in `docs/specs/kpa-editing-core.md`
