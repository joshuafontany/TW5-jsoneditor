/*\
title: $:/plugins/joshuafontany/jsoneditor/jsoneditor-widget.js
type: application/javascript
module-type: widget

JSON Editor widget

\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

// Pull in the meat of the json-editor functionality
var JSONEditor = require("$:/plugins/joshuafontany/jsoneditor/jsoneditor.js");
var Widget = require("$:/core/modules/widgets/widget.js").widget;

/* SaveState .closest() PolyFill
 * Element.closest() polyfill
 * https://developer.mozilla.org/en-US/docs/Web/API/Element/closest#Polyfill
 */
if ($tw.browser && !Element.prototype.closest) {
	if (!Element.prototype.matches) {
		Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
	}
	Element.prototype.closest = function (s) {
		var el = this;
		var ancestor = this;
		if (!document.documentElement.contains(el)) return null;
		do {
			if (ancestor.matches(s)) return ancestor;
			ancestor = ancestor.parentElement;
		} while (ancestor !== null);
		return null;
	};
}

var JSONEditorWidget = function(parseTreeNode,options) {
  this.initialise(parseTreeNode,options);
};

/*
Inherit from the base widget class
*/
JSONEditorWidget.prototype = new Widget();

/*
Render this widget into the DOM
*/
JSONEditorWidget.prototype.render = function(parent,nextSibling) {
  var self = this;
  this.options = {};
  this.targets = {};
  this.parentDomNode = parent;
  this.nextSibling = nextSibling;
  this.currentTiddler = this.getVariable("currentTiddler");
  this.computeAttributes();
  this.execute();
  if(this.editor.ready) {this.saveState();}
  // Insert element
	parent.insertBefore(this.domNode,this.nextSibling);
  //this.renderChildren(parent,nextSibling);
	this.domNodes.push(this.domNode);
}

/*
Compute the internal state of the widget
*/
JSONEditorWidget.prototype.execute = function() {
  /* Attributes are described in the Read Me. */
  // Initialize widget state
  if(!this.state){
    //Setup a State Tiddler Title
    this.state = "$:/state/jsoneditor/"+$tw.utils.jsonStringify(this.getVariable("currentTiddler").replace(/^\$\:\//g, "__"))+"/"
    this.state += this.getStateQualifier(); 
  }
  this.paramStr = this.getAttribute("param", "{}");
  this.schemaRef = this.getAttribute("schema", "");
  this.jsonRoot = this.getAttribute("json", "New Json Tiddler");

  this.targets = this.setTargets();
  this.options = this.getOptionsFromAttributes();
  this.options.startval = this.getJsonFromAttributes();
  if(this.options.show_all == true){
    this.options.startval = $tw.utils.jsonMerge({}, $tw.utils.jsonSchemaInstance(this.options.schema),this.options.startval);
  }
  // Create root editor
  this.domNode = this.document.createElement('div');
  this.domNode.setAttribute("class", "tw-jsoneditor");
  if(this.editor) this.editor.destroy();
  this.editor = new JSONEditor(this.domNode, this.options);
  //Handle state and mode
  this.rebuildEditorNodes();
  //Callbacks
  var self = this;
  this.bcb = this.addBoundCallbacks.bind(this);
  this.editor.on("change", this.bcb); //Always ignore first call to change callbacks
  var elements = this.domNode.querySelectorAll(".json-editor-btn-collapse");
  elements.forEach((el) =>{
    el.addEventListener("click", function(e) {
      //console.log("saveState:"+self.jsonRoot);
      self.saveState(e); /* autosave state */
    });
  });
};

/*
Sets the target attribute based on the schema and json textReferences
*/
JSONEditorWidget.prototype.setTargets = function() {
  var results = {},
  targets = {};
  results[this.schemaRef] = $tw.utils.parseTextReference(this.schemaRef);
  results[this.jsonRoot] = $tw.utils.parseTextReference(this.jsonRoot);
  var objKeys = Object.keys(results);
  objKeys.forEach(function(i) {
    if (results[i].field) { 
      targets[i] = {type: "field"};
    }
    else if (results[i].index) targets[i] = {type: "index"};
    else targets[i] = {type: "tiddler"};
    targets[i].title = results[i].title;
    targets[i].field = results[i].field || "";
    targets[i].index = results[i].index || "";
  }, this);
  return targets;
}

/*
Rebuilds the source json object from the `jsonRoot`
*/
JSONEditorWidget.prototype.getJsonFromAttributes = function() {
  var jsonstring = this.wiki.getTextReference(this.jsonRoot, "{}", this.currentTiddler);
  //If jsonRoot contains invalid json, alert
  if($tw.utils.jsonIsValid(this.targets[this.jsonRoot].title, jsonstring) && jsonstring !== ""){
    return JSON.parse(jsonstring);
  }
  else return {};
} 

/*
Rebuilds the options object
*/
JSONEditorWidget.prototype.getOptionsFromAttributes = function() {
  //Default editor options
  var defaultString = $tw.wiki.getTiddlerText("$:/plugins/joshuafontany/jsoneditor/defaultOptions", "{}"),
  defaultsValid = $tw.utils.jsonIsValid("$:/plugins/joshuafontany/jsoneditor/defaultOptions", defaultString) || false;
  var defaultOptions = defaultsValid ? JSON.parse(defaultString) : {};
  //User editor options
  var optionstring = this.getAttribute("options", "{}"),
  optionsValid = $tw.utils.jsonIsValid(this.currentTiddler, optionstring) || false;
  var options = optionsValid ? JSON.parse(optionstring) : {};
  /* An attribute named 'param' can pass in a valid schema json string
  /  as a triple quoted string, or as translusion, variable, etc.
  /  Anything declared in `param` overwrites any value found in `schema`.
  /  Otherwise the 'schema' attribute contains a textReference from which
  /  to retreive the json schema definition. Defaults to '{}' as it still
  /  works with that degenerate case. */
  var paramObj = {}, schemaObj = {};
  var text = this.wiki.getTextReference(this.schemaRef, "{}", this.currentTiddler),
  schemaValid = $tw.utils.jsonIsValid(this.targets[this.schemaRef].title, text) || false,
  paramValid = $tw.utils.jsonIsValid(this.currentTiddler, this.paramStr);
  if (paramValid) { paramObj = JSON.parse(this.paramStr); }
  if (schemaValid) { schemaObj = JSON.parse(text); }
  options.schema = $tw.utils.jsonMerge({}, schemaObj, paramObj);
  options.form_name_root = this.jsonRoot;
  //Merge
  options = $tw.utils.jsonMerge({}, defaultOptions, options);
  //State tiddler options
  var stateString = $tw.wiki.getTiddlerText(this.state, '{"collapsed":[]}'),
  stateValid = $tw.utils.jsonIsValid(this.state, stateString);
  this.stateObj = (stateValid) ? JSON.parse(stateString) : { collapsed:[]};
  if(this.stateObj.mode) options.mode = this.stateObj.mode;
  if(this.stateObj.enabled) options.enabled = this.stateObj.enabled;
  if (options.mode == "view" || options.enabled == false) {
    options.disable_array_add = true,
    options.disable_array_delete = true,
    options.disable_array_reorder = true,
    options.enable_array_copy = false,
    options.disable_edit_json = true,
    options.disable_properties = true;
  }
  // iconlib and theme
  var lib = options.iconlib;
  var validlibs = [
    "bootstrap2",
    "bootstrap3",
    "foundation2",
    "foundation3",
    "jqueryui",
    "fontawesome3",
    "fontawesome4",
    "fontawesome5",
    "materialicons"
  ];
  options.iconlib = (validlibs.indexOf(lib) != -1 ) ? lib : "";
  var th = options.theme;
  var validthemes = [
    "barebones",
    "html",
    "bootstrap2",
    "bootstrap3",
    "bootstrap4",
    "foundation3",
    "foundation4",
    "foundation5",
    "foundation6",
    "jqueryui",
    "materialize"];
  options.theme = (validthemes.indexOf(th) != -1 ) ? th : "";
  // handle schema editor mode
  if(options.mode == "preview"){
    // Preview mode for a Schema Editor
    options.no_additional_properties = true;
    this.jsonRoot = "$:/temp/json-preview/"+this.getStateQualifier();
    //refresh targets
    this.targets = this.setTargets();
  }
  if(options.mode == "design"){
    if(this.schemaRef == "") {
      this.schemaRef = "$:/plugins/joshuafontany/jsoneditor/devMetaSchema4";
      this.targets = this.setTargets();
      var text = this.wiki.getTextReference(this.schemaRef, "{}", this.currentTiddler);
      var metaSchema = JSON.parse(text);
      options.schema = $tw.utils.jsonMerge(options.schema, metaSchema);
    }
    // Add extra validation logic for integer schemas that use the `range` format.
    // For integer schemas that use the `range` format we require that minimum and maximum properties are set, too.
    var range_integer_validator = function(schema, value, path) {
      if (typeof value == "undefined" || value === null){
        return [{path: path, property: 'maximum', message:'Value undefined'}];
      }
      var errors = [];
      if(value.type === 'integer' && value.format === 'range') {
          if(typeof value.minimum === 'undefined' || typeof value.maximum === 'undefined') {
              errors.push({
                  path: path,
                  property: 'format',
                  message: 'The range format requires that you specify both minimum and maximum properties, too.'
              });
          }
      }
      return errors;
    };

    // Check that if minimum and maximum are specified, minimum <= maximum
    var min_max_consistence_validator = function(schema, value, path) {
      if (typeof value == "undefined" || value === null){
        return [{path: path, property: 'maximum', message:'Value undefined'}];
      }
      var errors = [];
      if(value.type === 'integer' || value.type === 'number') {
          if(typeof value.minimum !== 'undefined' && typeof value.minimum !== 'undefined' && value.minimum > value.maximum) {
              errors.push({
                  path: path,
                  property: 'maximum',
                  message: 'The maximum value must be greater than or equal than the minimum value.'
              });
          }
      }
      return errors;
    };

    options.custom_validators = [ range_integer_validator, min_max_consistence_validator ];
    //options.schema = JSON.parse(Meta.jsonMetaSchema);
    options.enabled = true;
    options.compact = false;
    options.disable_array_add = false;
    options.disable_array_delete = false;
    options.disable_array_reorder = false;
    options.enable_array_copy = true;
    options.disable_collapse = false;
    options.disable_edit_json = false;
    options.disable_properties = false;
    options.array_controls_top = true;
    options.show_all = false;
    options.required_by_default = false;
  }
  return options;
}

/*
Rebuilds the domNodes if the editor is in view mode to allow transcluded content
Resets the collapsed states from this.stateObj.collapsed
*/
JSONEditorWidget.prototype.rebuildViewEditorNodes = function (){
  var isHiddenInput = function(node) {
    // Input matches type?
    var viewTypes = ["text","textarea", "tel", "url", "number", "email"];
    var nodeType = node.getAttribute("type");
    if(( node.tagName.toLowerCase() == "input" && viewTypes.indexOf(nodeType) != -1 ) || node.tagName == "textarea" ) {
      return true;
    }
    return false;
  };
  var self = this, currentValue = this.editor.root.getValue();
  var inputNodes = this.editor.element.querySelectorAll('.tw-jsoneditor div.form-group .form-control');
  inputNodes.forEach(function(node) {
    if(node.nodeType == 1) {
      if(isHiddenInput(node)) {
        node.setAttribute("hidden", true);
        var itemName = node.getAttribute("name");
        if(typeof itemName == typeof null || typeof itemName === "undefined") return;
        var itemPath = itemName.replace(self.jsonRoot+"[", "/").replace(/\]\[/g, '/').replace(/\]/g, '');
        var itemText = $tw.utils.jsonGet(currentValue, itemPath);
        /* Render the widget into the fakeDom */
        var parsed = $tw.wiki.parseText("text/vnd.tiddlywiki", itemText, {});
        var widgetTree = self.makeChildWidget(parsed.tree[0] || [], {variables: self.variables});
        widgetTree.parentWidget = self;
                /* Create a parent dom node for the content */
        var container = self.document.createElement("div");
        widgetTree.render(container, null);
        //var div = self.document.createElement("div");
        container.setAttribute("name", node.getAttribute("name"));
        container.className = "tc-jsoneditor-view";
        //div.innerHTML = container.innerHTML;
        /* Insert rendered nodes into the editor's domTree @ here*/
        var oldDiv = node.parentNode.querySelector(".tc-jsoneditor-view");
        if (oldDiv) oldDiv.parentNode.replaceChild(container, oldDiv);
        else node.parentNode.insertBefore(container, node.nextSibling);
        /* push the widgetTree to this.children for the refresh mechanism*/
        self.children.push(widgetTree);
      }
    }
  });
 }

JSONEditorWidget.prototype.rebuildEditorNodes = function() {
  var self = this;
  if(this.options.mode == "view") {
    this.rebuildViewEditorNodes();
  }
  else if(this.options.mode == "design") { 
    // Add a save button / button template
    var filename = 'schema.json';
    var saveButtonLabel = 'Save';
    var button = this.editor.root.getButton(saveButtonLabel, 'save', saveButtonLabel);
    var button_holder = this.editor.root.theme.getHeaderButtonHolder();
    button_holder.appendChild(button);
    this.editor.root.header.parentNode.insertBefore(button_holder, this.editor.root.header.nextSibling);

    var jsonEditor = this.editor;
    button.addEventListener('click', function(e) {
        e.preventDefault();
        var contents = jsonEditor.getValue();
        var blob = new Blob([JSON.stringify(contents, null, 2)], {
            type: "application/json;charset=utf-8"
        });

        if(window.navigator && window.navigator.msSaveOrOpenBlob) {
            window.navigator.msSaveOrOpenBlob(blob, filename);
        }
        else {
            var a = document.createElement('a');
            a.download = filename;
            a.href = URL.createObjectURL(blob);
            a.dataset.downloadurl = ['text/plain', a.download, a.href].join(':');

            a.dispatchEvent(new MouseEvent('click', {
                'view': window,
                'bubbles': true,
                'cancelable': false
            }));
        }
    }, false);
  }
  //Reset the collapsed states
  if(this.stateObj.hasOwnProperty("collapsed")) {
    var keys = Object.keys(this.stateObj.collapsed);
    if(keys.length > 0) keys.forEach((e) =>{
      var editor = this.editor.editors[e];
      if(!!editor && editor.hasOwnProperty("collapsed")){
        if(editor.collapsed !== this.stateObj.collapsed[e]){
          editor.toggle_button.click();
        }
      }
    });
  }
  var editorEnabled = this.editor.root.isEnabled();
  if((this.options.enabled == false) && editorEnabled) {
    this.editor.disable();
    this.editor.trigger("change");
  }
  if((this.options.enabled == true) && !editorEnabled) {
    this.editor.enable();
    this.editor.trigger("change");
  }
  //Handle edit/view toggle
  if((this.options.mode == "view" || this.options.mode == "edit") && this.options.view_toggle == true){
     // Add a view-edit button / button template
     var toggleButtonLabel = (this.options.mode == "view") ? 'Edit' : 'View';
     var button = this.editor.root.getButton(toggleButtonLabel, 'save', toggleButtonLabel);

     var button_holder = this.editor.root.theme.getHeaderButtonHolder();
     button_holder.appendChild(button);
     this.editor.root.header.parentNode.insertBefore(button_holder, this.editor.root.header.nextSibling);
 
     var jsonEditor = this.editor;
     button.addEventListener('click', function(e) {
        e.preventDefault();
        self.options.mode = (self.options.mode == "view") ? 'edit' : 'view';
        self.saveState();
        //reset to trigger dirty state refresh
        self.options.mode = (self.options.mode == "view") ? 'edit' : 'view';
     }, false);
  }
}

/*
Diff and save Json on each callback change.
*/
JSONEditorWidget.prototype.saveJson = function() {
  if(!this.editor.ready) return;
  var editorValue = this.editor.getValue(),
  json = this.getJsonFromAttributes();
  var rootObj = (typeof editorValue =="object" && editorValue != null);
  if(this.targets[this.jsonRoot].type == "tiddler" && !rootObj) editorValue = {};
  if (!$tw.utils.jsonIsEqual(json, editorValue)) {
    this.wiki.setTextReference(this.jsonRoot, $tw.utils.jsonOrderedStringify(editorValue), this.currentTiddler);
  }  
}

/* Save State */
JSONEditorWidget.prototype.saveState = function(e) {
  if(!this.editor.ready) return;
  this.stateObj = this.getState();
  var twState = this.wiki.getTextReference(this.state, "{}", this.currentTiddler),
  stateEq = $tw.utils.jsonIsEqual(this.stateObj, JSON.parse(twState));
  if (!stateEq) {
    this.wiki.setTextReference(this.state, $tw.utils.jsonOrderedStringify(this.stateObj), this.currentTiddler);
  } 
  if(e){
    e.preventDefault();
    e.stopPropagation();
  }
}

JSONEditorWidget.prototype.getState = function() {
  var results = {mode: this.options.mode || "edit", collapsed: {}},
  names = Object.keys(this.editor.editors);
  names.forEach((n) => {
    if(this.editor.editors[n] && this.editor.editors[n].hasOwnProperty("collapsed")) {
      results.collapsed[n] = this.editor.editors[n].collapsed;
    }
  });
  return results;
}

JSONEditorWidget.prototype.addBoundCallbacks = function() {
  var self=this;
  this.editor.off("change", this.bcb);
  this.editor.on("change", function() {      
    self.saveJson(); // autosave changes
  });
}

/*
Selectively refreshes the widget if needed. Returns true if the widget or any of its children needed re-rendering
*/
JSONEditorWidget.prototype.refresh = function(changedTiddlers) {
  var changedAttributes = this.computeAttributes();
  var modeEq = true, enabledEq = true;
  var self = this;
  var doRefresh = function () {
    self.editor.off("change");
    self.refreshSelf();
    return true;
  }
  if(changedTiddlers[this.state]){
    var twState = this.wiki.getTextReference(this.state, "{}", this.currentTiddler);
    this.stateObj = this.getState();
    modeEq = $tw.utils.jsonIsEqual(this.stateObj.mode, JSON.parse(twState).mode);
    enabledEq = $tw.utils.jsonIsEqual(this.stateObj.enabled, JSON.parse(twState).enabled);
  }
  //If the actual widget attributes have been modified, clear the event listeners and recreate the editor
  if (!modeEq || !modeEq || changedAttributes.param || changedAttributes.schema || changedAttributes.json || changedAttributes.options) {
    doRefresh();
  }
  //If the title of the `schema` target tiddler is in `changedTiddlers`,
  //rebuild the widget
  if (changedTiddlers[this.targets[this.schemaRef].title]){
    var options = this.getOptionsFromAttributes();
    options.startval = this.options.startval;
    var opEq = $tw.utils.jsonIsEqual(this.options, options);
    //console.log($tw.utils.jsonDiff(this.options, options)); 
    if(!opEq) {
      doRefresh();
    }
  }
  //If the title of the `json` target tiddler is in `changedTiddlers`,
  //get the new json and set it on the editor
  if (changedTiddlers[this.targets[this.jsonRoot].title]){
    var json = this.getJsonFromAttributes(),
    editorValue = this.editor.getValue();
    var jsonEq = $tw.utils.jsonIsEqual(editorValue, json);
    if(!jsonEq) {
      if (this.options.mode =="design") doRefresh();
      this.editor.root.setValue(json, true);
      if (this.options.mode =="view") this.rebuildViewEditorNodes();
    }
  }
  return this.refreshChildren(changedTiddlers);
};

exports.jsoneditor = JSONEditorWidget;

})();

