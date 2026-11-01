export const canonicalTemplateBlock = 'template' as const;
export const compatibilityTemplateBlockAliases = ['html', 'tpl'] as const;

export const supportedKpaBlocks = [
  canonicalTemplateBlock,
  'ts',
  'js',
  'css',
  'sass',
  'scss',
] as const;

export type SupportedKpaBlock = (typeof supportedKpaBlocks)[number];
export type CompatibilityTemplateBlockAlias = (typeof compatibilityTemplateBlockAliases)[number];

export const structuralKpaBlocks = [
  canonicalTemplateBlock,
  ...compatibilityTemplateBlockAliases,
  'ts',
  'js',
  'css',
  'sass',
  'scss',
] as const;

export type StructuralKpaBlock = (typeof structuralKpaBlocks)[number];

export const kpaBlockSnippets: ReadonlyArray<{
  label: SupportedKpaBlock;
  snippet: string;
  documentation: string;
}> = [
  {
    label: canonicalTemplateBlock,
    snippet: '[template]\n\t$0\n[/template]',
    documentation: 'Inserts a Koppa Template block.',
  },
  {
    label: 'ts',
    snippet: '[ts]\n\t$0\n[/ts]',
    documentation: 'Inserts a Koppa TS block.',
  },
  {
    label: 'js',
    snippet: '[js]\n\t$0\n[/js]',
    documentation: 'Inserts a Koppa JS block.',
  },
  {
    label: 'css',
    snippet: '[css]\n\t$0\n[/css]',
    documentation: 'Inserts a Koppa CSS block.',
  },
  {
    label: 'sass',
    snippet: '[sass]\n\t$0\n[/sass]',
    documentation: 'Inserts a Koppa SASS block.',
  },
  {
    label: 'scss',
    snippet: '[scss]\n\t$0\n[/scss]',
    documentation: 'Inserts a Koppa SCSS block.',
  },
];
