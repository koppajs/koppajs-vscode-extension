# Manual Smoke Checklist

Use this checklist when changing editor behavior and automated coverage is incomplete.

## Setup

1. Run `npm install`.
2. Run `npm run validate`.
3. Launch the extension in an Extension Development Host.
4. Open `example.kpa` or another representative `.kpa` file.

## Checks

1. Confirm `.kpa` files receive syntax highlighting.
2. Confirm top-level block snippets appear outside existing known blocks.
3. Confirm HTML tag completions appear after `<` inside `[template]`.
4. Confirm HTML attribute completions appear inside an opening HTML tag within `[template]`.
5. Confirm malformed canonical blocks produce warnings.
6. Confirm non-`kpa` files do not receive `kpa` diagnostics.
7. Confirm `[html]` and `[tpl]` do not re-offer top-level block snippets inside the alias block.
8. Confirm `[html]` and `[tpl]` still do not receive canonical template HTML completions or runtime diagnostics.

## Alias Note

`[html]` and `[tpl]` are currently structural compatibility aliases. Smoke-check
them for syntax highlighting and block-snippet suppression, but do not assume
template-completion or diagnostics parity unless the implementation changes.
