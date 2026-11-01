# Repository Documentation Contract

- Status: Approved
- Owner: repository maintainers

## Scope

This spec defines the required shape of the governed root documents in this repository.

The goal is twofold:

- official KoppaJS repositories should look recognizably related
- every repository must remain self-describing without requiring cross-repo context

## Governed Files

The governed root files are:

- `README.md`
- `CHANGELOG.md`
- `CODE_OF_CONDUCT.md`
- `CONTRIBUTING.md`

Changes to the structure of those files require updating this spec, the local validator script, and any contributor-facing workflow docs in the same change.

## README Contract

`README.md` must:

- start with the `readme-top` anchor
- render the shared KoppaJS logo and centered title block
- include a badge row that matches the repository surface
- include a Table of Contents block
- end with `Architecture & Governance`, `Community & Contribution`, and `License` sections
- reference the local documentation contract spec in the governance section

Repo-specific content is allowed in the middle sections as long as the branded header and closing governance sections stay consistent.

## CHANGELOG Contract

`CHANGELOG.md` must:

- use the title `# Change Log`
- explain that tagged releases represent official milestones
- include an `## [Unreleased]` section
- record intentional release notes or repository milestones in descending order

The changelog does not need to record every internal edit, but it must record release-facing contract changes.

## CODE_OF_CONDUCT Contract

`CODE_OF_CONDUCT.md` must use the shared KoppaJS community wording and keep these sections in order:

- `Introduction`
- `Our Pledge`
- `Our Standards`
- `Responsibilities of Maintainers`
- `Enforcement`
- `Scope`
- `Attribution`

## CONTRIBUTING Contract

`CONTRIBUTING.md` must use the shared KoppaJS contributor framing and keep these sections in order:

- `Philosophy`
- `Repository Governance`
- `Documentation Contract`
- `Requirements`
- `Development Workflow`
- `Code Style & Quality`
- `Commit Conventions`
- `Testing Guidelines`
- `Scripts`
- `Releasing`
- `Need Help?`

Repository-specific notes may appear inside the shared sections, but the section order and intent stay fixed.

## Validation & Enforcement

The repository must provide a local validator at `scripts/check-doc-contract.mjs`.

The validator runs through:

```bash
npm run check:docs
```

The local `pre-commit` hook must run the same command before allowing the commit to proceed.

## Acceptance Criteria

A documentation update satisfies this contract only when:

- the governed files keep the required branded structure
- repository-specific guidance remains accurate
- this spec still matches the validator behavior
- the local `check:docs` command passes
