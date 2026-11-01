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

- GitHub Actions enforces `xvfb-run -a npm run validate` on pull requests to `develop` and `main`, and on pushes to `develop` and `main`.
- `npm run release:check` delegates to `scripts/check-release-package.mjs`, which packages with `vsce`, reads the actual ZIP using `yauzl` already installed by vsce, and runs `test:integration:release` inside the script between archive checks, not in an external `&&` chain. No dependency change is required.
- The archive must contain `extension/dist/extension.js`, `extension/dist/language-server.js`, and `extension/dist/package.json` with `type: "commonjs"`; `extension/package.json` must retain `main: "./dist/extension.js"` and `type: "module"`. Reject `.diffuno`, `node_modules`, `src`, `out`, `test`, `tests`, and `scripts` directories, source files such as `.ts`/`.tsx`, and `.map` files.
- Workspace `dist/extension.js`, `dist/language-server.js`, and `dist/package.json` must match their archived bytes before and after the host tests. Do not replace minified bundles with development output. The workspace Extension Development Host does not install or load the VSIX; byte equality links tested artifacts to the archive, not to a verified installation or an isolated runtime.
- Release tags rerun the same validation gate on the maintainer default from `.nvmrc`, upload the validated `.vsix` to the GitHub release, and publish it to the Visual Studio Marketplace with OIDC Trusted Publishing. The unit suite checks the workflow contract; live authentication requires an authorized release run.
- Unit-test coverage is available through `npm run test:coverage`, using matching Vitest 5 and coverage-provider versions with Vite 8.
- `npm run test:ecosystem` is part of `npm test` and checks a Vite production build plus CLI diagnostics with the pinned KoppaJS ecosystem. It does not test browser navigation.
- ESLint 10 loads the tracked `eslint.config.mjs`; generated output and local test-host artifacts remain excluded.
- Install postinstall prepares the exact client/minimatch API adaptation; the unit suite checks its guards, security regressions and real consumer compatibility. Dependency updates additionally require both `npm audit` scopes and `npm ls --all`; these networked audit commands are separate from `npm run validate`.
- Manual smoke checks remain necessary for syntax-highlighting verification and other editor-surface checks that are expensive to automate.
- Playwright and Stylelint are intentionally absent because the repository has no standalone UI surface and no maintained stylesheet source files.

## Rule

Do not lower an existing quality gate without an ADR or an explicit update to the testing strategy.
