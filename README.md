# VS Code Koppa Extension

Diese Extension bietet erweiterte Unterstützung für `.kpa`-Dateien in Visual Studio Code.  
Sie stellt u. a. folgendes bereit:

- **Syntax-Highlighting** für `.kpa`-Dateien mit [html], [css], [scss], [sass], [ts] und [js] Blöcken.  
- **Autovervollständigung** (Snippets) für HTML-Tags, -Attribute und Koppa-Blöcke.  
- **Grundlegende Fehlererkennung** (Diagnostics) für unvollständig oder falsch geschlossene Blöcke.  

## Features

1. **Syntax Highlighting**  
   - Dein `.kpa`-Datei-Inhalt wird ähnlich wie `.vue` oder `.svelte` behandelt.  
   - Abschnitte wie `[html] ... [/html]` oder `[ts] ... [/ts]` werden aufgeteilt und korrekt als HTML bzw. TypeScript erkannt.

2. **Snippets**  
   - In `[template]` oder `[html]`-Blöcken erhältst du Vorschläge für gängige HTML-Tags und -Attribute.  
   - Außerhalb von Blöcken werden dir neue Koppa-Blöcke (z. B. `[ts]`, `[js]`, `[css]`, `[scss]`) vorgeschlagen.

3. **Diagnose von Block-Struktur**  
   - Die Extension warnt, wenn du `[template]` öffnest, aber kein `[/template]` hast, oder wenn du fälschlich `[template]` mit `[/js]` schließt.

## Installation

1. **Aus dem VS Code Marketplace**  
   - (Wenn veröffentlicht) Suche nach `VS Code Koppa Extension` und installiere die Extension.  

2. **Manuell (lokal)**  
   - Lade dir das `.vsix`-Paket aus dem Release oder erstelle es selbst (siehe [DEVELOPER_README.md](./DEVELOPER_README.md)).  
   - In VS Code:  
     - Öffne die **Extensions**-Ansicht (`Strg+Shift+X` / `Cmd+Shift+X`).  
     - Klicke oben rechts auf die drei Punkte und wähle **"Install from VSIX..."**.  
     - Wähle das `.vsix`-Paket.  

## Usage

- Öffne einfach eine Datei mit der Endung `.kpa`, oder lege eine neue `.kpa`-Datei an.  
- Die Extension aktiviert sich automatisch und bietet dir Syntax-Highlighting und Snippets an.  

### Beispielstruktur einer `.kpa`-Datei

```plaintext
[html]
  <div>
    <p>Hello Koppa!</p>
  </div>
[/html]

[ts]
  const msg: string = "Hello TypeScript in Koppa!";
  console.log(msg);
[/ts]

[css]
  div {
    color: red;
  }
[/css]
