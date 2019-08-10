<h2 class="tc-title">
  Read Me
</h2>
<div class="tc-tiddler-body tc-reveal">
  <h1 class="">Json Editor for <a class="tc-tiddlylink tc-tiddlylink-missing" href="https://tiddlywiki.com/" target="_blank">TiddlyWiki5</a>,
    Version 0.0.6</h1>
    <p>Requires <i>TiddlyWiki 5.1.20</i></p>
  <p>Automatically generate html forms in Tiddlywiki from JSON Schema files using:</p>
  <p><a class="tc-tiddlylink-external" href="https://github.com/json-editor/json-editor" rel="noopener noreferrer"
      target="_blank">Json-Editor for Javascript</a></p>
  <p><a class="tc-tiddlylink-external" href="https://github.com/joshuafontany/TW5-jsoneditor" rel="noopener noreferrer"
      target="_blank">Plugin source code</a> (Forked from <a class="tc-tiddlylink-external" href="https://github.com/btheado/jsoneditor"
      rel="noopener noreferrer" target="_blank">jsoneditor</a>)</p>
  <h1 class="">Introduction</h1>
  <p>The jsoneditor widget generates and displays an HTML form constructed from the given <a class="tc-tiddlylink-external"
      href="http://json-schema.org/" rel="noopener noreferrer" target="_blank">JSON Schema</a>. It does this by
    wrapping a <a class="tc-tiddlylink tc-tiddlylink-missing" href="#TiddlyWiki">TiddlyWiki</a> widget around the <a
      class="tc-tiddlylink-external" href="https://github.com/json-editor/json-editor" rel="noopener noreferrer" target="_blank">json-editor</a>
    package. None of the optional requirements (css frameworks, icons, etc.) of json-editor are included in this
    plugin except for Bootstrap4 and FontAwesome5.</p>
  <p>The schema must be in <a class="tc-tiddlylink-external" href="http://json-schema.org/draft-04/json-schema-core.html"
      rel="noopener noreferrer" target="_blank">JSON Schema format</a> and can reside in:</p>
  <ul>
    <li>the text of any json tiddler</li>
    <li>any index in any json tiddler</li>
    <li>any field from any tiddler (using the text field by default)</li>
  </ul>
  <h1 class="">Installation</h1>
  
<div><p>Go to the example wiki: https://joshuafontany.github.io/TW5-jsoneditor/</p><p>Drag and drop the following tiddlers into your own wiki:</p><ul><li><b>$:/plugin/joshuafontany/jsoneditor</b></li><li><b>$:/plugin/@oss/bootstrap4</b></li><li><b>$:/plugin/TheDiveO/FontAwesome</b></li><li><b>$:/plugin/joshuafontany/jsonmangler</b></li><li><b>$:/plugin/ebalster/modloader</b></li><li><b>$:/plugin/matabele/action-maketid</b></li></ul><p>Alternately clone this repository into your TiddlyWiki5 root into a `plugins/joshuafontany/jsoneditor` folder, and drag and drop the other tiddlers. If you want a "minified" version the Releases page has extractable packages for node.js served wikis. Place these in your TiddlyWiki5 root folder and unzip them by selecting `Extract Here` (7zip) or `Extract to here` (Winzip).</p></div>


<h2>Using Json Editor</h2>

<p>Examples are found in the `Using Json Editor` tiddler in the demo wiki:</p>
<p>https://joshuafontany.github.io/TW5-jsoneditor/</p>
<p>This plugin is a work in progress; please report any issues on GitHub: https://github.com/joshuafontany/TW5-jsoneditor/issues</p>
<p>If you find this useful and would care to donate, please use my PayPal: https://paypal.me/JoshuaFontany</p>
