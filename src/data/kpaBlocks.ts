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
    documentation: 'Fuegt einen Koppa Template-Block ein.',
  },
  {
    label: 'ts',
    snippet: '[ts]\n\t$0\n[/ts]',
    documentation: 'Fuegt einen Koppa TS-Block ein.',
  },
  {
    label: 'js',
    snippet: '[js]\n\t$0\n[/js]',
    documentation: 'Fuegt einen Koppa JS-Block ein.',
  },
  {
    label: 'css',
    snippet: '[css]\n\t$0\n[/css]',
    documentation: 'Fuegt einen Koppa CSS-Block ein.',
  },
  {
    label: 'sass',
    snippet: '[sass]\n\t$0\n[/sass]',
    documentation: 'Fuegt einen Koppa SASS-Block ein.',
  },
  {
    label: 'scss',
    snippet: '[scss]\n\t$0\n[/scss]',
    documentation: 'Fuegt einen Koppa SCSS-Block ein.',
  },
];
