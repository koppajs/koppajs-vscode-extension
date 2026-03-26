/* ------------------------------------------------------------------------------
 * htmlAttributes.ts
 *
 * Exportiert ein Array von häufig genutzten HTML-Attributen, die in <tag ...>
 * vorgeschlagen werden sollen.
 * ----------------------------------------------------------------------------*/

export const htmlAttributes = [
  // Allgemeine Attribute (bereits vorhanden)
  {
    label: 'class',
    snippet: 'class="$0"',
    documentation: 'Definiert eine oder mehrere Klassen für ein Element (CSS-Styling).',
  },
  {
    label: 'id',
    snippet: 'id="$0"',
    documentation: 'Definiert eine eindeutige Kennung (ID) für ein Element.',
  },
  {
    label: 'style',
    snippet: 'style="$0"',
    documentation: 'Definiert Inline-CSS-Stile für ein Element.',
  },
  {
    label: 'title',
    snippet: 'title="$0"',
    documentation: 'Zeigt einen Tooltip, wenn man mit der Maus über das Element fährt.',
  },
  {
    label: 'src',
    snippet: 'src="$0"',
    documentation: 'Definiert die URL einer Ressource (z.B. <img>, <script>, <iframe>).',
  },
  {
    label: 'alt',
    snippet: 'alt="$0"',
    documentation: 'Alternativtext (wird angezeigt, falls das Bild nicht geladen werden kann).',
  },
  {
    label: 'href',
    snippet: 'href="$0"',
    documentation: 'Definiert die Ziel-URL (z. B. bei <a>, <link>).',
  },
  {
    label: 'type',
    snippet: 'type="$0"',
    documentation: 'Legt den Typ eines Elements fest (z. B. <button type="button">).',
  },
  {
    label: 'name',
    snippet: 'name="$0"',
    documentation: 'Definiert den Namen eines Elements (häufig in Formularen oder <map>).',
  },
  {
    label: 'value',
    snippet: 'value="$0"',
    documentation: 'Der Wert eines Formular-Elements (<input>, <option>, etc.).',
  },
  {
    label: 'placeholder',
    snippet: 'placeholder="$0"',
    documentation: 'Hilfetext, der in einem leeren Eingabefeld angezeigt wird.',
  },
  {
    label: 'disabled',
    snippet: 'disabled',
    documentation: 'Deaktiviert ein Eingabefeld, Button etc. (nicht anklickbar).',
  },
  {
    label: 'readonly',
    snippet: 'readonly',
    documentation: 'Macht ein Eingabefeld nur lesbar, aber nicht änderbar.',
  },
  {
    label: 'required',
    snippet: 'required',
    documentation: 'Markiert ein Feld als Pflichtfeld im Formular.',
  },
  {
    label: 'checked',
    snippet: 'checked',
    documentation: 'Aktiviert vorab ein Kontrollkästchen oder einen Radiobutton.',
  },
  {
    label: 'selected',
    snippet: 'selected',
    documentation: 'Wählt eine <option> als Standardwert in einem <select> aus.',
  },
  {
    label: 'multiple',
    snippet: 'multiple',
    documentation: 'Erlaubt Mehrfachauswahl bei <select> oder <input type="file">.',
  },
  {
    label: 'autocomplete',
    snippet: 'autocomplete="$0"',
    documentation: 'Legt fest, ob und wie der Browser Eingaben automatisch vervollständigt.',
  },
  {
    label: 'autofocus',
    snippet: 'autofocus',
    documentation: 'Gibt dem Element direkt beim Laden der Seite den Fokus.',
  },
  {
    label: 'min',
    snippet: 'min="$0"',
    documentation: 'Kleinster möglicher Wert (z. B. für <input type="number">).',
  },
  {
    label: 'max',
    snippet: 'max="$0"',
    documentation: 'Größter möglicher Wert.',
  },
  {
    label: 'step',
    snippet: 'step="$0"',
    documentation: 'Größe der Wertänderung pro Schritt (bei Zahlen-Eingaben).',
  },
  {
    label: 'pattern',
    snippet: 'pattern="$0"',
    documentation: 'RegEx, der Eingaben in <input> validiert.',
  },
  {
    label: 'accept',
    snippet: 'accept="$0"',
    documentation: 'Legt Dateitypen für <input type="file"> fest (z. B. "image/*").',
  },
  {
    label: 'method',
    snippet: 'method="$0"',
    documentation: 'HTTP-Methode (GET oder POST) für ein Formular.',
  },
  {
    label: 'action',
    snippet: 'action="$0"',
    documentation: 'URL, an die das Formular gesendet wird.',
  },
  {
    label: 'enctype',
    snippet: 'enctype="$0"',
    documentation: 'Datenformat für das Senden eines Formulars (z.B. multipart/form-data).',
  },
  {
    label: 'aria-label',
    snippet: 'aria-label="$0"',
    documentation: 'Beschreibender Text für Screenreader (Barrierefreiheit).',
  },
  {
    label: 'aria-hidden',
    snippet: 'aria-hidden="$0"',
    documentation:
      'Kennzeichnet, ob das Element assistiven Technologien verborgen ist (true/false).',
  },
  {
    label: 'role',
    snippet: 'role="$0"',
    documentation: 'Gibt eine semantische Rolle für das Element an.',
  },
  {
    label: 'tabindex',
    snippet: 'tabindex="$0"',
    documentation: 'Position in der Tabulator-Reihenfolge für Tastaturbedienung.',
  },
  {
    label: 'data-$1',
    snippet: 'data-${1:attribute}="$0"',
    documentation: 'Benutzerdefiniertes Datensatz-Attribut (z. B. data-info="...").',
  },

  // ---------------------------------------
  //          EVENT-HANDLER
  // ---------------------------------------

  // Maus-Events
  {
    label: 'onclick',
    snippet: 'onclick="$0"',
    documentation: 'Wird ausgelöst, wenn auf ein Element geklickt wird.',
  },
  {
    label: 'ondblclick',
    snippet: 'ondblclick="$0"',
    documentation: 'Wird bei einem Doppelklick auf das Element ausgelöst.',
  },
  {
    label: 'onmousedown',
    snippet: 'onmousedown="$0"',
    documentation: 'Feuert, wenn eine Maustaste gedrückt wird.',
  },
  {
    label: 'onmouseup',
    snippet: 'onmouseup="$0"',
    documentation: 'Feuert, wenn eine Maustaste losgelassen wird.',
  },
  {
    label: 'onmousemove',
    snippet: 'onmousemove="$0"',
    documentation: 'Feuert kontinuierlich bei Mausbewegungen über ein Element.',
  },
  {
    label: 'onmouseover',
    snippet: 'onmouseover="$0"',
    documentation: 'Feuert, wenn der Mauszeiger über das Element geht.',
  },
  {
    label: 'onmouseout',
    snippet: 'onmouseout="$0"',
    documentation: 'Feuert, wenn der Mauszeiger das Element verlässt.',
  },
  {
    label: 'onwheel',
    snippet: 'onwheel="$0"',
    documentation: 'Feuert, wenn sich das Mausrad oder ein ähnliches Eingabegerät bewegt.',
  },
  // Tastatur-Events
  {
    label: 'onkeydown',
    snippet: 'onkeydown="$0"',
    documentation: 'Wird ausgelöst, wenn eine Taste gedrückt wird.',
  },
  {
    label: 'onkeypress',
    snippet: 'onkeypress="$0"',
    documentation: 'Feuert, wenn eine Taste gedrückt wurde und ein Zeichencode generiert wird.',
  },
  {
    label: 'onkeyup',
    snippet: 'onkeyup="$0"',
    documentation: 'Feuert, wenn eine Taste losgelassen wird.',
  },

  // Fokus-Events
  {
    label: 'onfocus',
    snippet: 'onfocus="$0"',
    documentation: 'Wird aufgerufen, wenn das Element den Fokus erhält.',
  },
  {
    label: 'onblur',
    snippet: 'onblur="$0"',
    documentation: 'Feuert, wenn das Element den Fokus verliert.',
  },

  // Clipboard-Events
  {
    label: 'oncopy',
    snippet: 'oncopy="$0"',
    documentation: 'Wird ausgelöst, wenn Text in die Zwischenablage kopiert wird.',
  },
  {
    label: 'oncut',
    snippet: 'oncut="$0"',
    documentation: 'Wird ausgelöst, wenn Text ausgeschnitten wird.',
  },
  {
    label: 'onpaste',
    snippet: 'onpaste="$0"',
    documentation: 'Wird ausgelöst, wenn Inhalte in das Element eingefügt werden.',
  },

  // Drag&Drop-Events
  {
    label: 'ondrag',
    snippet: 'ondrag="$0"',
    documentation: 'Feuert kontinuierlich, während ein Element gezogen wird.',
  },
  {
    label: 'ondragstart',
    snippet: 'ondragstart="$0"',
    documentation: 'Startet, wenn der Benutzer beginnt, ein Element zu ziehen.',
  },
  {
    label: 'ondragenter',
    snippet: 'ondragenter="$0"',
    documentation: 'Ausgelöst, wenn ein Element in einen Drop-Bereich kommt.',
  },
  {
    label: 'ondragover',
    snippet: 'ondragover="$0"',
    documentation:
      'Feuert kontinuierlich, während ein Element über einem Drop-Bereich gezogen wird.',
  },
  {
    label: 'ondragleave',
    snippet: 'ondragleave="$0"',
    documentation: 'Feuert, wenn ein Element den Drop-Bereich verlässt.',
  },
  {
    label: 'ondragend',
    snippet: 'ondragend="$0"',
    documentation: 'Feuert, wenn das Ziehen (Drag) eines Elements beendet ist.',
  },
  {
    label: 'ondrop',
    snippet: 'ondrop="$0"',
    documentation: 'Wird aufgerufen, wenn das gezogene Element fallen gelassen wird (Drop).',
  },

  // Form-Events
  {
    label: 'onchange',
    snippet: 'onchange="$0"',
    documentation: 'Ausgelöst, wenn sich der Wert eines Elements ändert (z. B. <select>, <input>).',
  },
  {
    label: 'oninput',
    snippet: 'oninput="$0"',
    documentation:
      'Wird ausgelöst, sobald sich der Wert eines Elements ändert, während der Eingabe.',
  },
  {
    label: 'oninvalid',
    snippet: 'oninvalid="$0"',
    documentation: 'Feuert, wenn ein Formularfeld ungültig ist.',
  },
  {
    label: 'onreset',
    snippet: 'onreset="$0"',
    documentation: 'Wird aufgerufen, wenn ein Formular zurückgesetzt wird (<form onreset>).',
  },
  {
    label: 'onsearch',
    snippet: 'onsearch="$0"',
    documentation:
      'Ausgelöst, wenn in einem Suchfeld (<input type="search">) die Suche bestätigt wird.',
  },
  {
    label: 'onselect',
    snippet: 'onselect="$0"',
    documentation: 'Feuert, wenn der Benutzer Text in einem Eingabefeld markiert.',
  },
  {
    label: 'onsubmit',
    snippet: 'onsubmit="$0"',
    documentation: 'Wird ausgelöst, wenn ein Formular gesendet wird.',
  },

  // Sonstige Events (Page, Media etc.)
  {
    label: 'onscroll',
    snippet: 'onscroll="$0"',
    documentation: 'Feuert, wenn ein Element gescrollt wird.',
  },
  {
    label: 'onresize',
    snippet: 'onresize="$0"',
    documentation: 'Ausgelöst, wenn die Größe des Fensters/eines Elements geändert wird.',
  },
  {
    label: 'onload',
    snippet: 'onload="$0"',
    documentation:
      'Wird aufgerufen, wenn ein Element (z. B. <body>, <iframe>, <img>) vollständig geladen ist.',
  },
  {
    label: 'onerror',
    snippet: 'onerror="$0"',
    documentation:
      'Feuert, wenn ein Fehler während des Ladens auftritt (z. B. Bild nicht gefunden).',
  },
  {
    label: 'onbeforeunload',
    snippet: 'onbeforeunload="$0"',
    documentation: 'Ausgelöst, bevor die Seite verlassen wird (z. B. Warnung bei Änderungen).',
  },
  {
    label: 'onhashchange',
    snippet: 'onhashchange="$0"',
    documentation: 'Feuert, wenn sich der Teil der URL nach dem # ändert.',
  },
  {
    label: 'onpopstate',
    snippet: 'onpopstate="$0"',
    documentation: 'Wird aufgerufen, wenn das aktive Verlaufseintrag (History-API) wechselt.',
  },
  {
    label: 'oncanplay',
    snippet: 'oncanplay="$0"',
    documentation: 'Media-Event, wenn genug Daten geladen sind, um Medien abspielen zu können.',
  },
  {
    label: 'onplay',
    snippet: 'onplay="$0"',
    documentation: 'Wird aufgerufen, wenn die Wiedergabe eines Videos/Audios beginnt.',
  },
  {
    label: 'onpause',
    snippet: 'onpause="$0"',
    documentation: 'Wird ausgelöst, wenn ein Video/Audio pausiert wird.',
  },
  {
    label: 'onended',
    snippet: 'onended="$0"',
    documentation: 'Media-Event, wenn ein Video/Audio zu Ende ist.',
  },
  {
    label: 'onvolumechange',
    snippet: 'onvolumechange="$0"',
    documentation: 'Feuert, wenn sich die Lautstärke oder Stummschaltung ändert.',
  },
];
