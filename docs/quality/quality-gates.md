# Quality Gates

These gates describe what should be true before merging non-trivial changes. They are enforced locally through scripts and remotely through CI.

## Required Gates

| Gate            | Requirement                                                                                                                             |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Documentation   | Code, specs, ADRs, and contributor docs do not contradict each other                                                                    |
| Formatting      | `npm run format:check` is expected to pass when dependencies are installed                                                              |
| Build           | `npm run compile` is expected to pass when dependencies are installed                                                                   |
| Lint            | `npm run lint` is expected to pass when dependencies are installed                                                                      |
| Type Safety     | `npm run typecheck` is expected to pass when dependencies are installed                                                                 |
| Tests           | `npm test` passes for behavior changes, or the manual smoke checklist is completed and documented for gaps that cannot yet be automated |
| Architecture    | Structural changes have an ADR                                                                                                          |
| Release Surface | User-visible changes update `README.md` and `CHANGELOG.md` when appropriate                                                             |

## Current Reality

- GitHub Actions enforces `npm run validate` on push and pull request.
- Unit-test coverage is available through `npm run test:coverage`.
- Manual smoke checks remain necessary for syntax-highlighting verification and other editor-surface checks that are expensive to automate.
- Playwright and Stylelint are intentionally absent because the repository has no standalone UI surface and no maintained stylesheet source files.

## Rule

Do not lower an existing quality gate without an ADR or an explicit update to the testing strategy.
