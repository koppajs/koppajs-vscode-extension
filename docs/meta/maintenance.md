# Meta Layer Maintenance

## Continuous Update Rule

Whenever architecture, modules, workflows, or user-visible behavior change, update the meta layer in the same change. Do not defer architecture memory.

## Update Matrix

| Change                                       | Required Meta-Layer Updates                                                                                                         |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| New subsystem or major module move           | `ARCHITECTURE.md`, `docs/architecture/module-boundaries.md`, ADR                                                                    |
| New coding pattern or shared constraint      | `DEVELOPMENT_RULES.md`                                                                                                              |
| New or changed user-visible behavior         | relevant spec in `docs/specs/`, `README.md`, tests/manual smoke checklist                                                           |
| New block or block alias                     | spec, ADR if semantic, grammar docs, providers/diagnostics docs, roadmap if partial rollout                                         |
| New build, lint, packaging, or test workflow | `CONTRIBUTING.md`, `DEVELOPMENT_README.md`, `TESTING_STRATEGY.md`, `docs/quality/quality-gates.md`, `docs/meta/tooling-baseline.md` |
| AI workflow change                           | `AI_CONSTITUTION.md`, `.github/instructions/ai-workflow.md`                                                                         |

## Periodic Audit Procedure

1. Compare repository structure with `ARCHITECTURE.md`.
2. Compare runtime behavior with active specs.
3. Check for docs that describe tools or workflows not present in `package.json` or the repo.
4. Record new structural decisions as ADRs.
5. Add roadmap items for known gaps that are not fixed immediately.

## Definition of Drift

Documentation drift exists when:

- a doc references tools or scripts that are not part of this repo,
- a module boundary in docs does not match actual imports or responsibilities,
- a user-facing behavior is not described by a spec,
- or a major decision exists only in code comments or chat history.

Drift should be fixed before new unrelated work is merged.
