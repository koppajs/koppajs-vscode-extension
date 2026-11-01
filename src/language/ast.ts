export interface KpaSourcePosition {
  offset: number;
  line: number;
  character: number;
}

export interface KpaLocatedRange {
  start: KpaSourcePosition;
  end: KpaSourcePosition;
}

export interface KpaTagToken {
  name: string;
  isClosing: boolean;
  rawText: string;
  range: KpaLocatedRange;
}

export type KpaBlockKind =
  | 'template'
  | 'script-ts'
  | 'script-js'
  | 'style-css'
  | 'style-scss'
  | 'style-sass'
  | 'alias-html'
  | 'alias-tpl'
  | 'unknown';

export interface KpaBlockNode {
  name: string;
  kind: KpaBlockKind;
  openTag: KpaTagToken;
  closeTag?: KpaTagToken;
  range: KpaLocatedRange;
  contentRange: KpaLocatedRange;
  isClosed: boolean;
}

export interface KpaDocument {
  text: string;
  lineStarts: readonly number[];
  tags: readonly KpaTagToken[];
  blocks: readonly KpaBlockNode[];
}
