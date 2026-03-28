# Manual Smoke Checklist

Use this checklist when changing editor behavior and automated coverage is incomplete.

## Setup

1. Run `npm install`.
2. Run `npm run validate`.
3. Optionally run `npm run kpa:check -- path/to/file-or-folder` against a known `.kpa` target to verify the published CLI package path.
4. Launch the extension in an Extension Development Host.
5. Open `example.kpa` or another representative `.kpa` file.
6. Confirm the language server starts cleanly and semantic editor features respond without stale diagnostics after switching files.

## Checks

1. Confirm `.kpa` files receive syntax highlighting.
2. Confirm top-level block snippets appear outside existing known blocks.
3. Confirm HTML tag completions appear after `<` inside `[template]`.
4. Confirm imported `.kpa` components appear as tag completions after `<` inside canonical `[template]`.
5. Confirm imported component props appear as attribute completions inside an opening tag for a resolved `.kpa` component.
6. Confirm HTML attribute completions appear inside an opening HTML tag within `[template]`.
7. Confirm local template-visible bindings appear as completions inside canonical `{...}` expressions.
8. Confirm typed member completions appear for local template-visible bindings in canonical expressions such as `{user.}`.
9. Confirm hover and go-to-definition work from canonical template expressions to local `[ts]` or `[js]` bindings, and that supported member access shows typed hover information.
10. Confirm hover, go-to-definition, find-references, and local rename work on imported `.kpa` component tags in canonical template markup together with the local import alias.
11. Confirm component hover summarizes extracted props, emits, and slots when the imported file exposes supported contracts.
12. Confirm missing required component props, unknown props, and supported literal type mismatches produce warnings on resolved imported component call sites.
13. Confirm missing required component props offer a quick fix that inserts the prop stub into the opening tag.
14. Confirm unresolved PascalCase component tags can offer an import quick fix when a unique matching component exists.
15. Confirm imported `.kpa` component references and rename can span multiple importer documents in the same reachable project area.
16. Confirm imported TypeScript bindings referenced from canonical template expressions can navigate to external definitions and contribute cross-file reference results.
17. Confirm rename works across canonical template expressions and local `[ts]` or `[js]` usage, and that renaming an imported binding from the template only updates the local import alias plus same-file usages.
18. Confirm missing local bindings in supported canonical template expressions produce warnings, including compound expressions with top-level identifiers.
19. Confirm unresolved PascalCase component tags and broken explicit `.kpa` imports produce warnings.
20. Confirm malformed canonical blocks produce warnings.
21. Confirm document symbols include parsed blocks and local top-level script bindings, and workspace symbols surface `.kpa` components plus exported script bindings.
22. Confirm non-`kpa` files do not receive `kpa` diagnostics.
23. Confirm `[html]` and `[tpl]` do not re-offer top-level block snippets inside the alias block.
24. Confirm `[html]` and `[tpl]` do not receive canonical template local symbol intelligence, definition/reference navigation, or runtime diagnostics.

## Alias Note

`[html]` and `[tpl]` are currently structural compatibility aliases. Smoke-check
them for syntax highlighting and block-snippet suppression, but do not assume
canonical template intelligence or diagnostics parity unless the implementation
changes.
