/* ------------------------------------------------------------------------------
 * htmlAttributes.ts
 *
 * Exports an array of commonly used HTML attributes to suggest
 * inside <tag ...>.
 * ----------------------------------------------------------------------------*/

export const htmlAttributes = [
  // General attributes (already present)
  {
    label: 'class',
    snippet: 'class="$0"',
    documentation: 'Defines one or more classes for an element (CSS styling).',
  },
  {
    label: 'id',
    snippet: 'id="$0"',
    documentation: 'Defines a unique identifier (ID) for an element.',
  },
  {
    label: 'style',
    snippet: 'style="$0"',
    documentation: 'Defines inline CSS styles for an element.',
  },
  {
    label: 'title',
    snippet: 'title="$0"',
    documentation: 'Displays a tooltip when the pointer hovers over the element.',
  },
  {
    label: 'src',
    snippet: 'src="$0"',
    documentation: 'Defines the URL of a resource (e.g. <img>, <script>, <iframe>).',
  },
  {
    label: 'alt',
    snippet: 'alt="$0"',
    documentation: 'Alternative text (displayed if the image cannot be loaded).',
  },
  {
    label: 'href',
    snippet: 'href="$0"',
    documentation: 'Defines the target URL (e.g. for <a>, <link>).',
  },
  {
    label: 'type',
    snippet: 'type="$0"',
    documentation: 'Sets the type of an element (e.g. <button type="button">).',
  },
  {
    label: 'name',
    snippet: 'name="$0"',
    documentation: 'Defines the name of an element (often in forms or <map>).',
  },
  {
    label: 'value',
    snippet: 'value="$0"',
    documentation: 'The value of a form element (<input>, <option>, etc.).',
  },
  {
    label: 'placeholder',
    snippet: 'placeholder="$0"',
    documentation: 'Hint text displayed in an empty input field.',
  },
  {
    label: 'disabled',
    snippet: 'disabled',
    documentation: 'Disables an input field, button, etc. (not clickable).',
  },
  {
    label: 'readonly',
    snippet: 'readonly',
    documentation: 'Makes an input field read-only, preventing changes.',
  },
  {
    label: 'required',
    snippet: 'required',
    documentation: 'Marks a field as required in a form.',
  },
  {
    label: 'checked',
    snippet: 'checked',
    documentation: 'Preselects a checkbox or radio button.',
  },
  {
    label: 'selected',
    snippet: 'selected',
    documentation: 'Selects an <option> as the default value in a <select>.',
  },
  {
    label: 'multiple',
    snippet: 'multiple',
    documentation: 'Allows multiple selections in <select> or <input type="file">.',
  },
  {
    label: 'autocomplete',
    snippet: 'autocomplete="$0"',
    documentation: 'Specifies whether and how the browser automatically completes input.',
  },
  {
    label: 'autofocus',
    snippet: 'autofocus',
    documentation: 'Gives the element focus when the page loads.',
  },
  {
    label: 'min',
    snippet: 'min="$0"',
    documentation: 'The minimum allowed value (e.g. for <input type="number">).',
  },
  {
    label: 'max',
    snippet: 'max="$0"',
    documentation: 'The maximum allowed value.',
  },
  {
    label: 'step',
    snippet: 'step="$0"',
    documentation: 'The amount by which a value changes per step (for numeric inputs).',
  },
  {
    label: 'pattern',
    snippet: 'pattern="$0"',
    documentation: 'A regular expression that validates input in <input>.',
  },
  {
    label: 'accept',
    snippet: 'accept="$0"',
    documentation: 'Specifies file types for <input type="file"> (e.g. "image/*").',
  },
  {
    label: 'method',
    snippet: 'method="$0"',
    documentation: 'The HTTP method (GET or POST) for a form.',
  },
  {
    label: 'action',
    snippet: 'action="$0"',
    documentation: 'The URL to which the form is submitted.',
  },
  {
    label: 'enctype',
    snippet: 'enctype="$0"',
    documentation: 'The data format used to submit a form (e.g. multipart/form-data).',
  },
  {
    label: 'aria-label',
    snippet: 'aria-label="$0"',
    documentation: 'Descriptive text for screen readers (accessibility).',
  },
  {
    label: 'aria-hidden',
    snippet: 'aria-hidden="$0"',
    documentation:
      'Indicates whether the element is hidden from assistive technologies (true/false).',
  },
  {
    label: 'role',
    snippet: 'role="$0"',
    documentation: 'Specifies a semantic role for the element.',
  },
  {
    label: 'tabindex',
    snippet: 'tabindex="$0"',
    documentation: 'The position in the tab order for keyboard navigation.',
  },
  {
    label: 'data-$1',
    snippet: 'data-${1:attribute}="$0"',
    documentation: 'A custom data attribute (e.g. data-info="...").',
  },

  // ---------------------------------------
  //          EVENT HANDLERS
  // ---------------------------------------

  // Mouse events
  {
    label: 'onclick',
    snippet: 'onclick="$0"',
    documentation: 'Fires when an element is clicked.',
  },
  {
    label: 'ondblclick',
    snippet: 'ondblclick="$0"',
    documentation: 'Fires when the element is double-clicked.',
  },
  {
    label: 'onmousedown',
    snippet: 'onmousedown="$0"',
    documentation: 'Fires when a mouse button is pressed.',
  },
  {
    label: 'onmouseup',
    snippet: 'onmouseup="$0"',
    documentation: 'Fires when a mouse button is released.',
  },
  {
    label: 'onmousemove',
    snippet: 'onmousemove="$0"',
    documentation: 'Fires continuously as the pointer moves over an element.',
  },
  {
    label: 'onmouseover',
    snippet: 'onmouseover="$0"',
    documentation: 'Fires when the pointer moves over the element.',
  },
  {
    label: 'onmouseout',
    snippet: 'onmouseout="$0"',
    documentation: 'Fires when the pointer leaves the element.',
  },
  {
    label: 'onwheel',
    snippet: 'onwheel="$0"',
    documentation: 'Fires when the mouse wheel or a similar input device moves.',
  },
  // Keyboard events
  {
    label: 'onkeydown',
    snippet: 'onkeydown="$0"',
    documentation: 'Fires when a key is pressed.',
  },
  {
    label: 'onkeypress',
    snippet: 'onkeypress="$0"',
    documentation: 'Fires when a key is pressed and a character code is generated.',
  },
  {
    label: 'onkeyup',
    snippet: 'onkeyup="$0"',
    documentation: 'Fires when a key is released.',
  },

  // Focus events
  {
    label: 'onfocus',
    snippet: 'onfocus="$0"',
    documentation: 'Fires when the element receives focus.',
  },
  {
    label: 'onblur',
    snippet: 'onblur="$0"',
    documentation: 'Fires when the element loses focus.',
  },

  // Clipboard events
  {
    label: 'oncopy',
    snippet: 'oncopy="$0"',
    documentation: 'Fires when text is copied to the clipboard.',
  },
  {
    label: 'oncut',
    snippet: 'oncut="$0"',
    documentation: 'Fires when text is cut.',
  },
  {
    label: 'onpaste',
    snippet: 'onpaste="$0"',
    documentation: 'Fires when content is pasted into the element.',
  },

  // Drag-and-drop events
  {
    label: 'ondrag',
    snippet: 'ondrag="$0"',
    documentation: 'Fires continuously while an element is dragged.',
  },
  {
    label: 'ondragstart',
    snippet: 'ondragstart="$0"',
    documentation: 'Starts when the user begins dragging an element.',
  },
  {
    label: 'ondragenter',
    snippet: 'ondragenter="$0"',
    documentation: 'Fires when an element enters a drop area.',
  },
  {
    label: 'ondragover',
    snippet: 'ondragover="$0"',
    documentation: 'Fires continuously while an element is dragged over a drop area.',
  },
  {
    label: 'ondragleave',
    snippet: 'ondragleave="$0"',
    documentation: 'Fires when an element leaves the drop area.',
  },
  {
    label: 'ondragend',
    snippet: 'ondragend="$0"',
    documentation: 'Fires when dragging an element ends.',
  },
  {
    label: 'ondrop',
    snippet: 'ondrop="$0"',
    documentation: 'Fires when the dragged element is dropped.',
  },

  // Form events
  {
    label: 'onchange',
    snippet: 'onchange="$0"',
    documentation: 'Fires when the value of an element changes (e.g. <select>, <input>).',
  },
  {
    label: 'oninput',
    snippet: 'oninput="$0"',
    documentation: 'Fires as soon as the value of an element changes during input.',
  },
  {
    label: 'oninvalid',
    snippet: 'oninvalid="$0"',
    documentation: 'Fires when a form field is invalid.',
  },
  {
    label: 'onreset',
    snippet: 'onreset="$0"',
    documentation: 'Fires when a form is reset (<form onreset>).',
  },
  {
    label: 'onsearch',
    snippet: 'onsearch="$0"',
    documentation: 'Fires when a search is confirmed in a search field (<input type="search">).',
  },
  {
    label: 'onselect',
    snippet: 'onselect="$0"',
    documentation: 'Fires when the user selects text in an input field.',
  },
  {
    label: 'onsubmit',
    snippet: 'onsubmit="$0"',
    documentation: 'Fires when a form is submitted.',
  },

  // Other events (page, media, etc.)
  {
    label: 'onscroll',
    snippet: 'onscroll="$0"',
    documentation: 'Fires when an element is scrolled.',
  },
  {
    label: 'onresize',
    snippet: 'onresize="$0"',
    documentation: 'Fires when a window or element is resized.',
  },
  {
    label: 'onload',
    snippet: 'onload="$0"',
    documentation: 'Fires when an element (e.g. <body>, <iframe>, <img>) has fully loaded.',
  },
  {
    label: 'onerror',
    snippet: 'onerror="$0"',
    documentation: 'Fires when an error occurs during loading (e.g. image not found).',
  },
  {
    label: 'onbeforeunload',
    snippet: 'onbeforeunload="$0"',
    documentation: 'Fires before leaving the page (e.g. a warning about changes).',
  },
  {
    label: 'onhashchange',
    snippet: 'onhashchange="$0"',
    documentation: 'Fires when the part of the URL after # changes.',
  },
  {
    label: 'onpopstate',
    snippet: 'onpopstate="$0"',
    documentation: 'Fires when the active history entry (History API) changes.',
  },
  {
    label: 'oncanplay',
    snippet: 'oncanplay="$0"',
    documentation: 'A media event that fires when enough data has loaded to play the media.',
  },
  {
    label: 'onplay',
    snippet: 'onplay="$0"',
    documentation: 'Fires when video or audio playback starts.',
  },
  {
    label: 'onpause',
    snippet: 'onpause="$0"',
    documentation: 'Fires when video or audio playback is paused.',
  },
  {
    label: 'onended',
    snippet: 'onended="$0"',
    documentation: 'A media event that fires when a video or audio ends.',
  },
  {
    label: 'onvolumechange',
    snippet: 'onvolumechange="$0"',
    documentation: 'Fires when the volume or mute setting changes.',
  },
];
