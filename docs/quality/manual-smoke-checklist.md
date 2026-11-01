# Manual Smoke Checklist

Use this checklist when changing editor behavior and automated coverage is incomplete.

## Setup

1. Run `npm install`.
2. Run `npm run validate`. This includes `release:check`, which recursively replaces `.local/release`, rebuilds `dist/`, compiles tests into `out/`, and can populate the `.vscode-test/` editor/test-host cache. Preserve anything needed from `.local/release` first.
3. Optionally run `npm run kpa:check -- path/to/file-or-folder` against a known `.kpa` target to verify the published CLI package path.
4. Launch the extension in an Extension Development Host and open `src/test/fixtures/ecosystem/counter-page.kpa` for the current runtime checks below.
5. Confirm the language server starts cleanly and editor features respond without stale diagnostics after switching files. Activation also registers local providers; a running server does not mean every feature is LSP-only.

## English Presentation

1. Request HTML tag/attribute completions and inspect their descriptions. Confirm English text and unchanged snippets, including when the VS Code display language is not English.
2. Create a missing binding, malformed block and unresolved component. Confirm English warnings; open available prop/import/slot/emit quick fixes and confirm English titles. Apply a slot/emit fix and confirm the warning clears.
3. Run `npm run kpa:check -- path/to/file.kpa`, then repeat with `--json`. Confirm English messages and unchanged paths, diagnostic codes, locations and exit status. User-authored non-English text must stay unchanged.

## Current Runtime Interpolations: `{{...}}`

The ecosystem fixture returns `state`, `props`, `methods`, and `events` from its `[js]` controller. Use that explicit-return contract, not a bare local declaration, for these checks:

1. Confirm `{{title}}` and `{{formatCount(count)}}` receive binding intelligence from the shared server.
2. Request completion inside `{{...}}` (also while typing incomplete `{{ti`) and confirm returned `title`, `count`, and `formatCount` are available. A private controller local such as `const privateValue = 1;` must not appear as a template binding.
3. Replace `{{title}}` with `{{missing}}` and confirm a warning appears. Restore `{{title}}` and confirm it clears without a false local missing-binding warning.
4. Check hover and navigation for supported returned bindings. HTML tag/attribute completions must stay suppressed inside runtime expressions.

The automated integration regression “uses the shared runtime contract for double-brace diagnostics and completions” covers returned-binding diagnostics/completions and private-local exclusion. It does not by itself prove every navigation scenario above.

## Markup, Components, Structure, and Symbols

1. Confirm `.kpa` syntax highlighting and top-level block snippets outside known blocks.
2. Confirm HTML tags after `<`, imported `.kpa` component tags, HTML attributes in opening tags, and supported component-prop completions inside canonical `[template]`.
3. Confirm hover and go-to-definition on imported component tags, including extracted props/emits/slots when supported contracts exist.
4. Confirm component references and rename span reachable importer documents, updating script aliases and PascalCase/kebab-case tags without renaming the component source file.
5. Confirm call-site warnings for missing required props/slots, unknown props/emits, and supported type mismatches. Missing props can offer an insertion quick fix; unresolved tags can offer an import fix when a candidate is unambiguous. The local provider accepts a sole or uniquely best-ranked candidate, not a tie. For a required named/default slot, apply the stub fix and confirm the warning clears with existing content preserved, including self-closing and empty paired tags. For an unknown emit binding, apply explicit attribute removal and confirm unrelated attributes, controller code and body content remain unchanged.
6. Confirm unresolved PascalCase tags, broken explicit `.kpa` imports, and malformed canonical blocks warn. Warnings are not limited to block structure.
7. Confirm document symbols include blocks and local script bindings, workspace symbols include components/exported script bindings, and non-`kpa` documents do not receive `kpa` diagnostics.

## Legacy Editor Compatibility: `{...}`

Use a separate scratch KPA document with `[template]` markup such as `<p>{user.name}</p>` and `[ts]` declarations such as `const user = { name: 'Ada' };`. These are legacy editor tests, not examples of current runtime authoring:

1. Confirm local top-level bindings complete inside `{...}`; `{user.}` can offer typed members, and `{user.name}` can show typed hover.
2. Confirm local hover/definition/references/rename work across legacy expressions and local script usage. Imported TypeScript bindings can resolve external definitions/references; their rename stays on the local import alias and same-file usages.
3. Confirm `{missing}` and supported compound expressions with unknown top-level identifiers produce local missing-binding warnings. Property names and nested callback bindings must not be reported as missing top-level locals.
4. Confirm HTML completions stay suppressed inside legacy expressions. The client suppresses server completions in this context, leaving the local adapter responsible.

Local legacy missing-binding warnings from `src/diagnostics.ts` are an explicit exception to shared CLI diagnostic parity. Do not expect `kpa:check` to reproduce them.

## Alias Note

`[html]` and `[tpl]` are structural compatibility aliases. Confirm highlighting and suppression of top-level block snippets, but do not expect canonical template expression intelligence, navigation, or runtime diagnostics there. Keep these alias checks separate from both interpolation contracts.
