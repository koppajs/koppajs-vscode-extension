export const kpaDiagnosticCodes = {
  invalidComponentPropType: 'kpa.invalid-component-prop-type',
  missingComponentSlot: 'kpa.missing-component-slot',
  missingComponentProp: 'kpa.missing-component-prop',
  unknownComponentEmit: 'kpa.unknown-component-emit',
  unresolvedComponentImport: 'kpa.unresolved-component-import',
  unresolvedComponentTag: 'kpa.unresolved-component-tag',
  unknownComponentProp: 'kpa.unknown-component-prop',
  unknownComponentSlot: 'kpa.unknown-component-slot',
} as const;

export type KpaDiagnosticCode = (typeof kpaDiagnosticCodes)[keyof typeof kpaDiagnosticCodes];

export interface MissingComponentPropDiagnosticData {
  componentName: string;
  insertOffset: number;
  propName: string;
  propTypeText?: string;
}

export interface UnresolvedComponentTagDiagnosticData {
  componentName: string;
  tagName: string;
}
