'use strict';

// Compatibility with the text-only messages emitted by the pinned shared packages.
// Keep replacements anchored so identifiers, paths and user-authored text stay intact.
const rules = [
  [
    /^Schliessender Block \[(.+)\] gefunden, ohne dass er vorher geoeffnet wurde\.$/s,
    'Closing block [$1] found without a matching opening block.',
  ],
  [
    /^Erwarteter schliessender Block \[(.+)\] wurde nicht gefunden\. Stattdessen \[(.+)\] verwendet\.$/s,
    'Expected closing block [$1] was not found. Found [$2] instead.',
  ],
  [
    /^Der Block \[(.+)\] wurde nicht geschlossen\. Erwartet \[(.+)\]\.$/s,
    'Block [$1] was not closed. Expected [$2].',
  ],
  [
    /^Lokales Template-Symbol \[(.+)\] wurde nicht gefunden\.$/s,
    'Local template symbol [$1] was not found.',
  ],
  [
    /^Komponentenname \[(.*)\] ist ungueltig\. Erwartet wird ein gueltiger Bezeichner oder Kebab-Case\.$/s,
    'Component name [$1] is invalid. Expected a valid identifier or kebab-case.',
  ],
  [
    /^Komponenten-Import \[(.+)\] verweist auf \[(.+)\], konnte aber nicht im Workspace aufgeloest werden\.$/s,
    'Component import [$1] points to [$2] but could not be resolved in the workspace.',
  ],
  [
    /^Komponente \[(.+)\] wurde im \[template\]-Block verwendet, aber nicht als \.kpa-Import gefunden\.$/s,
    'Component [$1] was used in the [template] block but was not found as a .kpa import.',
  ],
  [
    /^Attribut \[(.+)\] ist kein bekanntes Prop von Komponente \[(.+)\]\.$/s,
    'Attribute [$1] is not a known prop of component [$2].',
  ],
  [
    /^Event-Handler \[(.+)\] verweist auf unbekanntes Emit \[(.+)\] von Komponente \[(.+)\]\.$/s,
    'Event handler [$1] references unknown emit [$2] of component [$3].',
  ],
  [
    /^Slot \[(.+)\] ist kein bekannter Slot von Komponente \[(.+)\]\.$/s,
    'Slot [$1] is not a known slot of component [$2].',
  ],
  [
    /^Required Slot \[(.+)\] fehlt an Komponente \[(.+)\]\.$/s,
    'Required slot [$1] is missing on component [$2].',
  ],
  [
    /^Required Prop \[(.+)\] fehlt an Komponente \[(.+)\]\.$/s,
    'Required prop [$1] is missing on component [$2].',
  ],
  [
    /^Template symbol \[(.+)\] ist mehrdeutig und kann nicht sicher umbenannt werden\.$/s,
    'Template symbol [$1] is ambiguous and cannot be renamed safely.',
  ],
  [/^Prop \[(.+)\] fuer \[(.+)\] ergaenzen$/s, 'Add prop [$1] for [$2]'],
  [/^Komponente \[(.+)\] importieren$/s, 'Import component [$1]'],
  [
    /^kpa-check hat (\d+) nicht existierende\(s\) Ziel\(e\) erhalten:\n([\s\S]*)$/,
    'kpa-check received $1 nonexistent target(s):\n$2',
  ],
  [
    /^kpa-check hat eine unbekannte Option erhalten: (.+)$/s,
    'kpa-check received an unknown option: $1',
  ],
  [
    /^kpa-check hat widerspruechliche Steueroptionen erhalten: (.+)$/s,
    'kpa-check received conflicting control options: $1',
  ],
  [/^kpa-check hat keine \.kpa-Dateien gefunden\.$/, 'kpa-check found no .kpa files.'],
  [
    /^kpa-check: (\d+) \.kpa-Datei\(en\) geprueft, keine Diagnostics gefunden\.$/,
    'kpa-check: checked $1 .kpa file(s), no diagnostics found.',
  ],
  [
    /^kpa-check: (\d+) Diagnostic\(s\) in (\d+) \.kpa-Datei\(en\) gefunden\.$/,
    'kpa-check: found $1 diagnostic(s) in $2 .kpa file(s).',
  ],
];

/** @param {string} message @returns {string} */
function toEnglishMessage(message) {
  const propMessage = translatePropMessage(message);
  if (propMessage !== undefined) {
    return propMessage;
  }
  for (const [pattern, replacement] of rules) {
    if (pattern.test(message)) {
      return message.replace(pattern, replacement);
    }
  }
  return message;
}

/** @param {string} message @returns {string | undefined} */
function translatePropMessage(message) {
  const prefix = /^Prop \[([^\]]+)\] an Komponente \[([^\]]+)\] erwartet \[/.exec(message);
  if (!prefix || !message.endsWith('].')) {
    return undefined;
  }
  const typeStart = prefix[0].length;
  let depth = 1;
  let quote;
  for (let cursor = typeStart; cursor < message.length; cursor++) {
    const character = message[cursor];
    if (quote) {
      if (character === '\\') {
        cursor++;
      } else if (character === quote) {
        quote = undefined;
      }
    } else if (character === "'" || character === '"' || character === '`') {
      quote = character;
    } else if (message.startsWith('/*', cursor)) {
      const end = message.indexOf('*/', cursor + 2);
      if (end < 0) {
        return undefined;
      }
      cursor = end + 1;
    } else if (message.startsWith('//', cursor)) {
      const end = message.indexOf('\n', cursor + 2);
      if (end < 0) {
        return undefined;
      }
      cursor = end;
    } else if (character === '[') {
      depth++;
    } else if (character === ']' && --depth === 0) {
      const separator = '], erhalten wurde [';
      if (!message.startsWith(separator, cursor)) {
        return undefined;
      }
      const type = message.slice(typeStart, cursor);
      const value = message.slice(cursor + separator.length, -2);
      return (
        'Prop [' +
        prefix[1] +
        '] on component [' +
        prefix[2] +
        '] expects [' +
        type +
        '], received [' +
        value +
        '].'
      );
    }
  }
  return undefined;
}

module.exports = { toEnglishMessage };
