/* ------------------------------------------------------------------------------
 * htmlTags.ts
 *
 * Exportiert ein Array mit HTML-Tags, das von extension.ts
 * für Vervollständigungen im [template]-Block verwendet wird.
 * ----------------------------------------------------------------------------*/

export const htmlTags = [
  {
    name: 'a',
    pattern: '<a href="$0"></a>',
    description: 'Definiert einen Hyperlink, der auf eine andere Webseite verweist.',
  },
  {
    name: 'abbr',
    pattern: '<abbr title="$1">$0</abbr>',
    description: 'Kennzeichnet eine Abkürzung oder ein Akronym.',
  },
  {
    name: 'address',
    pattern: '<address>$0</address>',
    description: 'Gibt Kontaktinformationen oder Urheberangaben an.',
  },
  {
    name: 'area',
    pattern: '<area shape="rect" coords="$1" alt="$2" href="$0">',
    description: 'Definiert eine anklickbare Fläche auf einer Image-Map.',
  },
  {
    name: 'article',
    pattern: '<article>$0</article>',
    description: 'Definiert eigenständigen, in sich geschlossenen Inhalt.',
  },
  {
    name: 'aside',
    pattern: '<aside>$0</aside>',
    description: 'Gibt Inhalte an, die indirekt zum Hauptinhalt gehören (z.B. Sidebar).',
  },
  {
    name: 'audio',
    pattern: '<audio controls>\n  <source src="$1" type="$2">\n  $0\n</audio>',
    description: 'Bindet Audioinhalte ein, z. B. Musik oder andere Audiodateien.',
  },
  {
    name: 'b',
    pattern: '<b>$0</b>',
    description: 'Hebt Text ohne besondere Bedeutung fett hervor.',
  },
  {
    name: 'base',
    pattern: '<base href="$1" target="_blank">$0',
    description: 'Legt die Basis-URL für alle relativen URLs fest.',
  },
  {
    name: 'bdi',
    pattern: '<bdi>$0</bdi>',
    description: 'Isoliert Text, dessen Richtung unbekannt oder autark sein soll.',
  },
  {
    name: 'bdo',
    pattern: '<bdo dir="rtl">$0</bdo>',
    description: 'Überschreibt die standardmäßige Textausrichtung.',
  },
  {
    name: 'blockquote',
    pattern: '<blockquote cite="$1">$0</blockquote>',
    description: 'Definiert einen längeren Textabschnitt als Zitat.',
  },
  {
    name: 'body',
    pattern: '<body>$0</body>',
    description: 'Definiert den Hauptinhalt des Dokuments.',
  },
  {
    name: 'br',
    pattern: '<br>',
    description: 'Erzeugt einen Zeilenumbruch.',
  },
  {
    name: 'button',
    pattern: '<button>$0</button>',
    description: 'Definiert einen klickbaren Button.',
  },
  {
    name: 'canvas',
    pattern: '<canvas id="$1" width="300" height="150">$0</canvas>',
    description: 'Ermöglicht dynamisches Zeichnen von 2D-Grafiken per Skript.',
  },
  {
    name: 'caption',
    pattern: '<caption>$0</caption>',
    description: 'Definiert eine Tabellenüberschrift.',
  },
  {
    name: 'cite',
    pattern: '<cite>$0</cite>',
    description: 'Gibt den Titel eines Werks an (z.B. Buchtitel).',
  },
  {
    name: 'code',
    pattern: '<code>$0</code>',
    description: 'Hebt Quellcode oder Programmausdrücke hervor.',
  },
  {
    name: 'col',
    pattern: '<col span="$1" style="$2">$0',
    description: 'Definiert Spalteneigenschaften für eine Tabelle.',
  },
  {
    name: 'colgroup',
    pattern: '<colgroup>$0</colgroup>',
    description: 'Fasst Spalten in einer Tabelle für gemeinsames Styling zusammen.',
  },
  {
    name: 'data',
    pattern: '<data value="$1">$0</data>',
    description: 'Bindet maschinenlesbare Daten ein, die im Text angezeigt werden.',
  },
  {
    name: 'datalist',
    pattern: '<datalist id="$1">$0</datalist>',
    description:
      'Definiert eine Liste vordefinierter Optionen, die mit <input> verknüpft werden kann.',
  },
  {
    name: 'dd',
    pattern: '<dd>$0</dd>',
    description: 'Definiert eine Beschreibung zu einem Begriff in einer Definitionsliste.',
  },
  {
    name: 'del',
    pattern: '<del>$0</del>',
    description: 'Markiert gelöschten (durchgestrichenen) Text.',
  },
  {
    name: 'details',
    pattern: '<details>\n  <summary>$1</summary>\n  $0\n</details>',
    description: 'Erzeugt ein aufklappbares Element mit Zusammenfassung (z.B. FAQ).',
  },
  {
    name: 'dfn',
    pattern: '<dfn>$0</dfn>',
    description: 'Markiert den Begriff, der definiert wird.',
  },
  {
    name: 'dialog',
    pattern: '<dialog open>$0</dialog>',
    description: 'Definiert ein Dialog- oder Popup-Element.',
  },
  {
    name: 'div',
    pattern: '<div>$0</div>',
    description: 'Ein Container-Element ohne spezielle Bedeutung.',
  },
  {
    name: 'dl',
    pattern: '<dl>\n  <dt>$1</dt>\n  <dd>$0</dd>\n</dl>',
    description: 'Definiert eine Definitionsliste mit <dt> und <dd>.',
  },
  {
    name: 'dt',
    pattern: '<dt>$0</dt>',
    description: 'Definiert einen Begriff/Titel in einer Definitionsliste.',
  },
  {
    name: 'em',
    pattern: '<em>$0</em>',
    description: 'Hebt Text hervor (normalerweise kursiv).',
  },
  {
    name: 'embed',
    pattern: '<embed src="$1" type="$2" width="640" height="480">$0',
    description: 'Bettest externe Ressourcen (z.B. Video, Plugin) ein.',
  },
  {
    name: 'fieldset',
    pattern: '<fieldset>$0</fieldset>',
    description: 'Gruppiert zusammengehörige Formularfelder.',
  },
  {
    name: 'figcaption',
    pattern: '<figcaption>$0</figcaption>',
    description: 'Legt eine Beschriftung für ein <figure>-Element fest.',
  },
  {
    name: 'figure',
    pattern: '<figure>\n  $0\n  <figcaption>$1</figcaption>\n</figure>',
    description: 'Gruppiert selbstständigen Inhalt (z.B. Bild + Caption).',
  },
  {
    name: 'footer',
    pattern: '<footer>$0</footer>',
    description: 'Definiert den Fußbereich (Footer) eines Dokuments oder Abschnitts.',
  },
  {
    name: 'form',
    pattern: '<form action="$1" method="post">$0</form>',
    description: 'Erzeugt ein HTML-Formular zur Benutzereingabe.',
  },
  {
    name: 'h1',
    pattern: '<h1>$0</h1>',
    description: 'Größte Überschriftsebene (Überschrift 1).',
  },
  {
    name: 'h2',
    pattern: '<h2>$0</h2>',
    description: 'Überschriftsebene 2.',
  },
  {
    name: 'h3',
    pattern: '<h3>$0</h3>',
    description: 'Überschriftsebene 3.',
  },
  {
    name: 'h4',
    pattern: '<h4>$0</h4>',
    description: 'Überschriftsebene 4.',
  },
  {
    name: 'h5',
    pattern: '<h5>$0</h5>',
    description: 'Überschriftsebene 5.',
  },
  {
    name: 'h6',
    pattern: '<h6>$0</h6>',
    description: 'Kleinste Überschriftsebene 6.',
  },
  {
    name: 'head',
    pattern: '<head>$0</head>',
    description: 'Enthält Metadaten, Skripte, Styles für das Dokument.',
  },
  {
    name: 'header',
    pattern: '<header>$0</header>',
    description: 'Definiert einen Kopfbereich eines Dokuments oder Abschnitts.',
  },
  {
    name: 'hr',
    pattern: '<hr>',
    description: 'Zeigt eine thematische Trennlinie an.',
  },
  {
    name: 'html',
    pattern: '<html lang="en">$0</html>',
    description: 'Wurzel-Element eines HTML-Dokuments.',
  },
  {
    name: 'i',
    pattern: '<i>$0</i>',
    description: 'Hebt Text kursiv hervor, ohne besondere Betonung.',
  },
  {
    name: 'iframe',
    pattern: '<iframe src="$1" width="560" height="315"></iframe>',
    description: 'Bettest ein anderes HTML-Dokument in die Seite ein.',
  },
  {
    name: 'img',
    pattern: '<img src="$1" alt="$0">',
    description: 'Bindet ein Bild in das Dokument ein.',
  },
  {
    name: 'input',
    pattern: '<input type="$1" name="$2" value="$0">',
    description: 'Definiert ein Formularelement.',
  },
  {
    name: 'ins',
    pattern: '<ins>$0</ins>',
    description: 'Markiert Text als hinzugefügt (normalerweise unterstrichen).',
  },
  {
    name: 'kbd',
    pattern: '<kbd>$0</kbd>',
    description: 'Kennzeichnet Tastatureingaben, i.d.R. monospace.',
  },
  {
    name: 'label',
    pattern: '<label for="$1">$0</label>',
    description: 'Beschriftung für ein Formularfeld.',
  },
  {
    name: 'legend',
    pattern: '<legend>$0</legend>',
    description: 'Beschriftet ein <fieldset>.',
  },
  {
    name: 'li',
    pattern: '<li>$0</li>',
    description: 'Listenelement in einer <ul>, <ol> oder <menu>.',
  },
  {
    name: 'link',
    pattern: '<link rel="stylesheet" href="$0">',
    description: 'Verknüpft externe Ressourcen (z. B. CSS).',
  },
  {
    name: 'main',
    pattern: '<main>$0</main>',
    description: 'Hauptinhalt einer Seite (unique pro Dokument).',
  },
  {
    name: 'map',
    pattern: '<map name="$1">$0</map>',
    description: 'Definiert eine Image-Map zusammen mit <area>.',
  },
  {
    name: 'mark',
    pattern: '<mark>$0</mark>',
    description: 'Hervorhebung, i.d.R. durch Hintergrundfarbe gekennzeichnet.',
  },
  {
    name: 'menu',
    pattern: '<menu>$0</menu>',
    description: 'Definiert eine Liste von Befehlen oder Menüeinträgen.',
  },
  {
    name: 'meta',
    pattern: '<meta name="$1" content="$0">',
    description: 'Definiert Metadaten/Informationen im <head>.',
  },
  {
    name: 'meter',
    pattern: '<meter value="$1" min="$2" max="$3">$0</meter>',
    description: 'Zeigt einen Messwert in einem bestimmten Bereich an.',
  },
  {
    name: 'nav',
    pattern: '<nav>$0</nav>',
    description: 'Definiert einen Navigationsbereich mit Links.',
  },
  {
    name: 'noscript',
    pattern: '<noscript>$0</noscript>',
    description: 'Fallback-Inhalt für Browser ohne JavaScript.',
  },
  {
    name: 'object',
    pattern: '<object data="$1" type="$2" width="300" height="200">$0</object>',
    description: 'Bindet ein externes Objekt (z.B. Flash, PDF) ein.',
  },
  {
    name: 'ol',
    pattern: '<ol>\n  <li>$0</li>\n</ol>',
    description: 'Definiert eine geordnete (nummerierte) Liste.',
  },
  {
    name: 'optgroup',
    pattern: '<optgroup label="$1">$0</optgroup>',
    description: 'Fasst <option>-Elemente in einer Gruppe zusammen.',
  },
  {
    name: 'option',
    pattern: '<option value="$1">$0</option>',
    description: 'Definiert eine Auswahloption in einer Dropdown-Liste (<select>).',
  },
  {
    name: 'output',
    pattern: '<output name="$1" for="$2">$0</output>',
    description: 'Zeigt das Ergebnis einer Berechnung oder Nutzeraktion an.',
  },
  {
    name: 'p',
    pattern: '<p>$0</p>',
    description: 'Definiert einen Absatz.',
  },
  {
    name: 'param',
    pattern: '<param name="$1" value="$0">',
    description: 'Liefert Parameter an <object>.',
  },
  {
    name: 'picture',
    pattern: '<picture>\n  <source srcset="$1" media="$2">\n  <img src="$3" alt="$0">\n</picture>',
    description: 'Ermöglicht responsive Bilder, je nach Bildschirm oder Auflösung.',
  },
  {
    name: 'pre',
    pattern: '<pre>$0</pre>',
    description: 'Zeigt vorformatierten Text (Leerzeichen und Zeilenumbrüche bleiben).',
  },
  {
    name: 'progress',
    pattern: '<progress value="$1" max="$2">$0</progress>',
    description: 'Zeigt den Fortschritt einer Aufgabe an.',
  },
  {
    name: 'q',
    pattern: '<q cite="$1">$0</q>',
    description: 'Kennzeichnet ein kurzes Zitat (meist mit Anführungszeichen).',
  },
  {
    name: 'rp',
    pattern: '<rp>$0</rp>',
    description: 'Zeigt Ersatz-Klammern für Browser, die <ruby> nicht unterstützen.',
  },
  {
    name: 'rt',
    pattern: '<rt>$0</rt>',
    description: 'Definiert eine Aussprache-/Lesehilfe im <ruby>-Element.',
  },
  {
    name: 'ruby',
    pattern: '<ruby>$0<rt>$1</rt></ruby>',
    description: 'Zeigt Zeichen mit Anmerkungen, z. B. in ostasiatischen Texten.',
  },
  {
    name: 's',
    pattern: '<s>$0</s>',
    description: 'Kennzeichnet Text als nicht mehr relevant (durchgestrichen).',
  },
  {
    name: 'samp',
    pattern: '<samp>$0</samp>',
    description: 'Hebt Programm- oder Konsolenausgaben hervor (Sample Output).',
  },
  {
    name: 'script',
    pattern: '<script>$0</script>',
    description: 'Bindet clientseitige Skripte, meist JavaScript, ein.',
  },
  {
    name: 'section',
    pattern: '<section>$0</section>',
    description: 'Gruppiert thematisch verwandte Inhalte, z. B. Kapitel.',
  },
  {
    name: 'select',
    pattern: '<select name="$1" id="$2">\n  <option>$0</option>\n</select>',
    description: 'Erzeugt eine Dropdown-Liste.',
  },
  {
    name: 'small',
    pattern: '<small>$0</small>',
    description: 'Zeigt kleineren Text an (Feinabdruck, Nebentext).',
  },
  {
    name: 'source',
    pattern: '<source src="$1" type="$2">',
    description: 'Definiert eine Medienquelle für <audio> oder <video>.',
  },
  {
    name: 'span',
    pattern: '<span>$0</span>',
    description: 'Ein Inline-Container ohne spezielle Bedeutung.',
  },
  {
    name: 'strong',
    pattern: '<strong>$0</strong>',
    description: 'Hebt Inhalt semantisch stark hervor (fetter Text).',
  },
  {
    name: 'style',
    pattern: '<style>$0</style>',
    description: 'Definiert CSS-Stile im Dokument (Inline-Styling).',
  },
  {
    name: 'sub',
    pattern: '<sub>$0</sub>',
    description: 'Definiert tiefgestellten Text (Subscript).',
  },
  {
    name: 'summary',
    pattern: '<summary>$0</summary>',
    description: 'Kurzbeschreibung für das <details>-Element, die anklickbar ist.',
  },
  {
    name: 'sup',
    pattern: '<sup>$0</sup>',
    description: 'Definiert hochgestellten Text (Superscript).',
  },
  {
    name: 'table',
    pattern: '<table>$0</table>',
    description: 'Erzeugt eine Tabelle.',
  },
  {
    name: 'tbody',
    pattern: '<tbody>$0</tbody>',
    description: 'Fasst den Tabellenkörper zusammen.',
  },
  {
    name: 'td',
    pattern: '<td>$0</td>',
    description: 'Definiert eine Zelle in einer Tabellenzeile.',
  },
  {
    name: 'template',
    pattern: '<template>$0</template>',
    description: 'Hält clientseitigen Inhalt vor, der erst per JavaScript gerendert wird.',
  },
  {
    name: 'textarea',
    pattern: '<textarea name="$1" rows="4" cols="50">$0</textarea>',
    description: 'Definiert ein mehrzeiliges Texteingabefeld.',
  },
  {
    name: 'tfoot',
    pattern: '<tfoot>$0</tfoot>',
    description: 'Definiert den Fußbereich einer Tabelle.',
  },
  {
    name: 'th',
    pattern: '<th>$0</th>',
    description: 'Definiert eine Tabellenkopf-Zelle.',
  },
  {
    name: 'thead',
    pattern: '<thead>$0</thead>',
    description: 'Definiert den Kopfbereich einer Tabelle.',
  },
  {
    name: 'time',
    pattern: '<time datetime="$1">$0</time>',
    description: 'Definiert Datum/Uhrzeit, maschinenlesbar über datetime-Attribut.',
  },
  {
    name: 'title',
    pattern: '<title>$0</title>',
    description: 'Definiert den Dokumenttitel (wird im Browser-Tab angezeigt).',
  },
  {
    name: 'tr',
    pattern: '<tr>$0</tr>',
    description: 'Definiert eine Zeile in einer Tabelle.',
  },
  {
    name: 'track',
    pattern: '<track src="$1" kind="$2" srclang="$3" label="$0">',
    description: 'Definiert Untertitel/Metadaten für <audio> oder <video>.',
  },
  {
    name: 'u',
    pattern: '<u>$0</u>',
    description: 'Kennzeichnet unterstrichenen Text (ohne besondere semantische Bedeutung).',
  },
  {
    name: 'ul',
    pattern: '<ul>\n  <li>$0</li>\n</ul>',
    description: 'Erzeugt eine ungeordnete (Aufzählungs-) Liste.',
  },
  {
    name: 'var',
    pattern: '<var>$0</var>',
    description: 'Kennzeichnet eine Variable oder Platzhalter in einem Ausdruck.',
  },
  {
    name: 'video',
    pattern:
      '<video width="640" height="360" controls>\n  <source src="$1" type="$2">\n  $0\n</video>',
    description: 'Bindet ein Video ein, mit Wiedergabesteuerung.',
  },
  {
    name: 'wbr',
    pattern: '<wbr>$0',
    description: 'Zeigt möglichen Zeilenumbruch an (z. B. in langen Wörtern).',
  },
];
