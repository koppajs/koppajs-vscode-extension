/* ------------------------------------------------------------------------------
 * htmlTags.ts
 *
 * Exports an array of HTML tags used by extension.ts
 * for completions in the [template] block.
 * ----------------------------------------------------------------------------*/

export const htmlTags = [
  {
    name: 'a',
    pattern: '<a href="$0"></a>',
    description: 'Defines a hyperlink to another web page.',
  },
  {
    name: 'abbr',
    pattern: '<abbr title="$1">$0</abbr>',
    description: 'Marks an abbreviation or acronym.',
  },
  {
    name: 'address',
    pattern: '<address>$0</address>',
    description: 'Specifies contact or authorship information.',
  },
  {
    name: 'area',
    pattern: '<area shape="rect" coords="$1" alt="$2" href="$0">',
    description: 'Defines a clickable area on an image map.',
  },
  {
    name: 'article',
    pattern: '<article>$0</article>',
    description: 'Defines independent, self-contained content.',
  },
  {
    name: 'aside',
    pattern: '<aside>$0</aside>',
    description: 'Specifies content indirectly related to the main content (e.g. a sidebar).',
  },
  {
    name: 'audio',
    pattern: '<audio controls>\n  <source src="$1" type="$2">\n  $0\n</audio>',
    description: 'Embeds audio content, such as music or other audio files.',
  },
  {
    name: 'b',
    pattern: '<b>$0</b>',
    description: 'Highlights text in bold without special importance.',
  },
  {
    name: 'base',
    pattern: '<base href="$1" target="_blank">$0',
    description: 'Sets the base URL for all relative URLs.',
  },
  {
    name: 'bdi',
    pattern: '<bdi>$0</bdi>',
    description: 'Isolates text whose direction is unknown or should be independent.',
  },
  {
    name: 'bdo',
    pattern: '<bdo dir="rtl">$0</bdo>',
    description: 'Overrides the default text direction.',
  },
  {
    name: 'blockquote',
    pattern: '<blockquote cite="$1">$0</blockquote>',
    description: 'Defines a longer passage of text as a quotation.',
  },
  {
    name: 'body',
    pattern: '<body>$0</body>',
    description: 'Defines the main content of the document.',
  },
  {
    name: 'br',
    pattern: '<br>',
    description: 'Creates a line break.',
  },
  {
    name: 'button',
    pattern: '<button>$0</button>',
    description: 'Defines a clickable button.',
  },
  {
    name: 'canvas',
    pattern: '<canvas id="$1" width="300" height="150">$0</canvas>',
    description: 'Allows dynamic drawing of 2D graphics using scripts.',
  },
  {
    name: 'caption',
    pattern: '<caption>$0</caption>',
    description: 'Defines a table caption.',
  },
  {
    name: 'cite',
    pattern: '<cite>$0</cite>',
    description: 'Specifies the title of a work (e.g. a book title).',
  },
  {
    name: 'code',
    pattern: '<code>$0</code>',
    description: 'Highlights source code or programming expressions.',
  },
  {
    name: 'col',
    pattern: '<col span="$1" style="$2">$0',
    description: 'Defines column properties for a table.',
  },
  {
    name: 'colgroup',
    pattern: '<colgroup>$0</colgroup>',
    description: 'Groups table columns for shared styling.',
  },
  {
    name: 'data',
    pattern: '<data value="$1">$0</data>',
    description: 'Embeds machine-readable data displayed in the text.',
  },
  {
    name: 'datalist',
    pattern: '<datalist id="$1">$0</datalist>',
    description: 'Defines a list of predefined options that can be linked to <input>.',
  },
  {
    name: 'dd',
    pattern: '<dd>$0</dd>',
    description: 'Defines a description of a term in a definition list.',
  },
  {
    name: 'del',
    pattern: '<del>$0</del>',
    description: 'Marks deleted (struck-through) text.',
  },
  {
    name: 'details',
    pattern: '<details>\n  <summary>$1</summary>\n  $0\n</details>',
    description: 'Creates an expandable element with a summary (e.g. an FAQ).',
  },
  {
    name: 'dfn',
    pattern: '<dfn>$0</dfn>',
    description: 'Marks the term being defined.',
  },
  {
    name: 'dialog',
    pattern: '<dialog open>$0</dialog>',
    description: 'Defines a dialog or popup element.',
  },
  {
    name: 'div',
    pattern: '<div>$0</div>',
    description: 'A container element without special meaning.',
  },
  {
    name: 'dl',
    pattern: '<dl>\n  <dt>$1</dt>\n  <dd>$0</dd>\n</dl>',
    description: 'Defines a definition list with <dt> and <dd>.',
  },
  {
    name: 'dt',
    pattern: '<dt>$0</dt>',
    description: 'Defines a term or title in a definition list.',
  },
  {
    name: 'em',
    pattern: '<em>$0</em>',
    description: 'Emphasizes text (usually in italics).',
  },
  {
    name: 'embed',
    pattern: '<embed src="$1" type="$2" width="640" height="480">$0',
    description: 'Embeds external resources (e.g. a video or plugin).',
  },
  {
    name: 'fieldset',
    pattern: '<fieldset>$0</fieldset>',
    description: 'Groups related form fields.',
  },
  {
    name: 'figcaption',
    pattern: '<figcaption>$0</figcaption>',
    description: 'Sets a caption for a <figure> element.',
  },
  {
    name: 'figure',
    pattern: '<figure>\n  $0\n  <figcaption>$1</figcaption>\n</figure>',
    description: 'Groups self-contained content (e.g. an image and caption).',
  },
  {
    name: 'footer',
    pattern: '<footer>$0</footer>',
    description: 'Defines the footer of a document or section.',
  },
  {
    name: 'form',
    pattern: '<form action="$1" method="post">$0</form>',
    description: 'Creates an HTML form for user input.',
  },
  {
    name: 'h1',
    pattern: '<h1>$0</h1>',
    description: 'The highest heading level (heading 1).',
  },
  {
    name: 'h2',
    pattern: '<h2>$0</h2>',
    description: 'Heading level 2.',
  },
  {
    name: 'h3',
    pattern: '<h3>$0</h3>',
    description: 'Heading level 3.',
  },
  {
    name: 'h4',
    pattern: '<h4>$0</h4>',
    description: 'Heading level 4.',
  },
  {
    name: 'h5',
    pattern: '<h5>$0</h5>',
    description: 'Heading level 5.',
  },
  {
    name: 'h6',
    pattern: '<h6>$0</h6>',
    description: 'The lowest heading level (heading 6).',
  },
  {
    name: 'head',
    pattern: '<head>$0</head>',
    description: 'Contains metadata, scripts, and styles for the document.',
  },
  {
    name: 'header',
    pattern: '<header>$0</header>',
    description: 'Defines a header for a document or section.',
  },
  {
    name: 'hr',
    pattern: '<hr>',
    description: 'Displays a thematic separator.',
  },
  {
    name: 'html',
    pattern: '<html lang="en">$0</html>',
    description: 'The root element of an HTML document.',
  },
  {
    name: 'i',
    pattern: '<i>$0</i>',
    description: 'Highlights text in italics without special emphasis.',
  },
  {
    name: 'iframe',
    pattern: '<iframe src="$1" width="560" height="315"></iframe>',
    description: 'Embeds another HTML document in the page.',
  },
  {
    name: 'img',
    pattern: '<img src="$1" alt="$0">',
    description: 'Embeds an image in the document.',
  },
  {
    name: 'input',
    pattern: '<input type="$1" name="$2" value="$0">',
    description: 'Defines a form element.',
  },
  {
    name: 'ins',
    pattern: '<ins>$0</ins>',
    description: 'Marks text as inserted (usually underlined).',
  },
  {
    name: 'kbd',
    pattern: '<kbd>$0</kbd>',
    description: 'Marks keyboard input, usually in a monospace font.',
  },
  {
    name: 'label',
    pattern: '<label for="$1">$0</label>',
    description: 'A label for a form field.',
  },
  {
    name: 'legend',
    pattern: '<legend>$0</legend>',
    description: 'Provides a caption for a <fieldset>.',
  },
  {
    name: 'li',
    pattern: '<li>$0</li>',
    description: 'A list item in a <ul>, <ol>, or <menu>.',
  },
  {
    name: 'link',
    pattern: '<link rel="stylesheet" href="$0">',
    description: 'Links external resources (e.g. CSS).',
  },
  {
    name: 'main',
    pattern: '<main>$0</main>',
    description: 'The main content of a page (unique per document).',
  },
  {
    name: 'map',
    pattern: '<map name="$1">$0</map>',
    description: 'Defines an image map together with <area>.',
  },
  {
    name: 'mark',
    pattern: '<mark>$0</mark>',
    description: 'Highlights text, usually with a background color.',
  },
  {
    name: 'menu',
    pattern: '<menu>$0</menu>',
    description: 'Defines a list of commands or menu items.',
  },
  {
    name: 'meta',
    pattern: '<meta name="$1" content="$0">',
    description: 'Defines metadata or information in <head>.',
  },
  {
    name: 'meter',
    pattern: '<meter value="$1" min="$2" max="$3">$0</meter>',
    description: 'Displays a measurement within a specified range.',
  },
  {
    name: 'nav',
    pattern: '<nav>$0</nav>',
    description: 'Defines a navigation area with links.',
  },
  {
    name: 'noscript',
    pattern: '<noscript>$0</noscript>',
    description: 'Fallback content for browsers without JavaScript.',
  },
  {
    name: 'object',
    pattern: '<object data="$1" type="$2" width="300" height="200">$0</object>',
    description: 'Embeds an external object (e.g. Flash or PDF).',
  },
  {
    name: 'ol',
    pattern: '<ol>\n  <li>$0</li>\n</ol>',
    description: 'Defines an ordered (numbered) list.',
  },
  {
    name: 'optgroup',
    pattern: '<optgroup label="$1">$0</optgroup>',
    description: 'Groups <option> elements together.',
  },
  {
    name: 'option',
    pattern: '<option value="$1">$0</option>',
    description: 'Defines an option in a dropdown list (<select>).',
  },
  {
    name: 'output',
    pattern: '<output name="$1" for="$2">$0</output>',
    description: 'Displays the result of a calculation or user action.',
  },
  {
    name: 'p',
    pattern: '<p>$0</p>',
    description: 'Defines a paragraph.',
  },
  {
    name: 'param',
    pattern: '<param name="$1" value="$0">',
    description: 'Supplies parameters to <object>.',
  },
  {
    name: 'picture',
    pattern: '<picture>\n  <source srcset="$1" media="$2">\n  <img src="$3" alt="$0">\n</picture>',
    description: 'Allows responsive images based on the screen or resolution.',
  },
  {
    name: 'pre',
    pattern: '<pre>$0</pre>',
    description: 'Displays preformatted text (preserving spaces and line breaks).',
  },
  {
    name: 'progress',
    pattern: '<progress value="$1" max="$2">$0</progress>',
    description: 'Displays the progress of a task.',
  },
  {
    name: 'q',
    pattern: '<q cite="$1">$0</q>',
    description: 'Marks a short quotation (usually with quotation marks).',
  },
  {
    name: 'rp',
    pattern: '<rp>$0</rp>',
    description: 'Displays fallback parentheses for browsers that do not support <ruby>.',
  },
  {
    name: 'rt',
    pattern: '<rt>$0</rt>',
    description: 'Defines a pronunciation or reading aid in a <ruby> element.',
  },
  {
    name: 'ruby',
    pattern: '<ruby>$0<rt>$1</rt></ruby>',
    description: 'Displays characters with annotations, e.g. in East Asian text.',
  },
  {
    name: 's',
    pattern: '<s>$0</s>',
    description: 'Marks text as no longer relevant (struck through).',
  },
  {
    name: 'samp',
    pattern: '<samp>$0</samp>',
    description: 'Highlights program or console output (sample output).',
  },
  {
    name: 'script',
    pattern: '<script>$0</script>',
    description: 'Embeds client-side scripts, usually JavaScript.',
  },
  {
    name: 'section',
    pattern: '<section>$0</section>',
    description: 'Groups thematically related content, such as chapters.',
  },
  {
    name: 'select',
    pattern: '<select name="$1" id="$2">\n  <option>$0</option>\n</select>',
    description: 'Creates a dropdown list.',
  },
  {
    name: 'small',
    pattern: '<small>$0</small>',
    description: 'Displays smaller text (fine print or side notes).',
  },
  {
    name: 'source',
    pattern: '<source src="$1" type="$2">',
    description: 'Defines a media source for <audio> or <video>.',
  },
  {
    name: 'span',
    pattern: '<span>$0</span>',
    description: 'An inline container without special meaning.',
  },
  {
    name: 'strong',
    pattern: '<strong>$0</strong>',
    description: 'Strongly emphasizes content semantically (bold text).',
  },
  {
    name: 'style',
    pattern: '<style>$0</style>',
    description: 'Defines CSS styles in the document (inline styling).',
  },
  {
    name: 'sub',
    pattern: '<sub>$0</sub>',
    description: 'Defines subscript text.',
  },
  {
    name: 'summary',
    pattern: '<summary>$0</summary>',
    description: 'A clickable short description for a <details> element.',
  },
  {
    name: 'sup',
    pattern: '<sup>$0</sup>',
    description: 'Defines superscript text.',
  },
  {
    name: 'table',
    pattern: '<table>$0</table>',
    description: 'Creates a table.',
  },
  {
    name: 'tbody',
    pattern: '<tbody>$0</tbody>',
    description: 'Groups the table body.',
  },
  {
    name: 'td',
    pattern: '<td>$0</td>',
    description: 'Defines a cell in a table row.',
  },
  {
    name: 'template',
    pattern: '<template>$0</template>',
    description: 'Holds client-side content that is rendered later using JavaScript.',
  },
  {
    name: 'textarea',
    pattern: '<textarea name="$1" rows="4" cols="50">$0</textarea>',
    description: 'Defines a multiline text input field.',
  },
  {
    name: 'tfoot',
    pattern: '<tfoot>$0</tfoot>',
    description: 'Defines the footer of a table.',
  },
  {
    name: 'th',
    pattern: '<th>$0</th>',
    description: 'Defines a table header cell.',
  },
  {
    name: 'thead',
    pattern: '<thead>$0</thead>',
    description: 'Defines the header of a table.',
  },
  {
    name: 'time',
    pattern: '<time datetime="$1">$0</time>',
    description: 'Defines a date or time, machine-readable through the datetime attribute.',
  },
  {
    name: 'title',
    pattern: '<title>$0</title>',
    description: 'Defines the document title (displayed in the browser tab).',
  },
  {
    name: 'tr',
    pattern: '<tr>$0</tr>',
    description: 'Defines a row in a table.',
  },
  {
    name: 'track',
    pattern: '<track src="$1" kind="$2" srclang="$3" label="$0">',
    description: 'Defines subtitles or metadata for <audio> or <video>.',
  },
  {
    name: 'u',
    pattern: '<u>$0</u>',
    description: 'Marks underlined text (without special semantic meaning).',
  },
  {
    name: 'ul',
    pattern: '<ul>\n  <li>$0</li>\n</ul>',
    description: 'Creates an unordered (bulleted) list.',
  },
  {
    name: 'var',
    pattern: '<var>$0</var>',
    description: 'Marks a variable or placeholder in an expression.',
  },
  {
    name: 'video',
    pattern:
      '<video width="640" height="360" controls>\n  <source src="$1" type="$2">\n  $0\n</video>',
    description: 'Embeds a video with playback controls.',
  },
  {
    name: 'wbr',
    pattern: '<wbr>$0',
    description: 'Indicates a possible line break (e.g. in long words).',
  },
];
