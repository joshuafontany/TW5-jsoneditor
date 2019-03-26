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

// Use isEquals from lodash, pointer methods
var _ = require("$:/plugins/@oss/lodash.js");
var pointer = require("$:/plugins/joshuafontany/jsonmangler/modules/libs/json-pointer.js");

// Pull in the meat of the json-editor functionality
var JSONEditor = require("$:/plugins/joshuafontany/jsoneditor/jsoneditor.min.js");
var Widget = require("$:/core/modules/widgets/widget.js").widget;

var JSONEditorWidget = function(parseTreeNode,options) {
  this.initialise(parseTreeNode,options);
  this.options = {};
  this.targets = [];
  this.json = {};
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
  this.parentDomNode = parent;
  this.nextSibling = nextSibling;
  this.currentTiddler = this.getVariable("currentTiddler");
  this.computeAttributes();
  this.execute();
  this.bcb = this.addBoundCallbacks.bind(this);
  this.editor.on("change", this.bcb); //Always ignore first call to change callbacks
  //Other Callbacks
  var elements = this.container.querySelectorAll(".json-editor-btn-collapse");
  elements.forEach((el) =>{
    el.addEventListener("click", function(e) {
      //console.log("saveState:"+self.jsonRoot);
      self.saveState(e); /* autosave state */
    });
  });  
  // Insert element
	parent.insertBefore(this.container,this.nextSibling);
	this.renderChildren(this.container,null);
	this.domNodes.push(this.container);
}

/*
Compute the internal state of the widget
*/
JSONEditorWidget.prototype.execute = function() {
  /* Attributes are:
  /  param = a valid json schema object that takes preference over the schema textReference
  /  schema  = textReference to a schema json (in a tiddler, field, or index)
  /  json = textReference to a json tiddler or an index in a json tiddler, defaults to schema+"/data"
  /  options = an editor config object
  /  options.iconlib = the 'icon library' to use, must be one of validlibs[] below
  /  options.theme = one of the validthemes[] below
  */
  // Initialize widget state
  this.targets = this.setTargets();
  this.options = this.getOptionsFromAttributes();
  this.options.startval = this.getJsonFromAttributes();
  // Create root editor
  this.container = this.document.createElement('div');
  this.container.setAttribute("class", "tw-jsoneditor");
    //Pre-load values
  this.editor = new JSONEditor(this.container, this.options);
  // Workaround for what I think is a bug in jsoneditor
  if (_.isEmpty(this.options.schema) && (this.options.startval == 0)) this.editor.setValue(this.options.startval);
  this.stateObj = this.getState();
  this.wiki.setTextReference(this.state, $tw.utils.jsonOrderedStringify(this.stateObj),this.getVariable("currentTiddler"));
  if(this.options.mode !== "edit")
  { //Replace inputs with TW transclusions
    this.rebuildEditorNodes();
  } 
  // Construct the child widgets
  this.makeChildWidgets(this.container);
};

JSONEditorWidget.prototype.getState = function() {
  var collapsed ={},
  names = Object.keys(this.editor.editors);
  names.forEach((n) => {
    if (this.editor.editors[n].hasOwnProperty("collapsed")){
      var optionsPath;
      if (n == "root") {optionsPath = "options.collapsed"}
      else { optionsPath = n.replace(/\./g, ".properties.").replace(/^root./g, "")+".options.collapsed"; }
      collapsed[optionsPath] = this.editor.editors[n].collapsed;
    }
  });
  return {"mode": this.options.mode || "edit", "schema": collapsed};
}

/*
Sets the target attribute based on the json textReference
*/
JSONEditorWidget.prototype.setTargets = function() {
  this.schemaObj = this.getAttribute("param", "");
  this.schemaRef = this.getAttribute("schema", "New Schema Tiddler");
  this.jsonRoot = this.getAttribute("json", "New Json Tiddler");

  var results = [],
  targets = [];
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
  //Setup a State Tiddler
  this.state = "$:/state/jsoneditor/"+$tw.utils.jsonStringify(this.getVariable("currentTiddler").replace(/^\$\:\//g, "__"))+"/"
  this.state += this.getStateQualifier();
  //Default editor options
  var defaultString = $tw.wiki.getTiddlerText("$:/plugins/joshuafontany/jsoneditor/defaultOptions", "{}"),
  defaultsValid = $tw.utils.jsonIsValid("$:/plugins/joshuafontany/jsoneditor/defaultOptions", defaultString) || false;
  var defaultOptions = defaultsValid ? JSON.parse(defaultString) : {};
  //User editor options
  var optionstring = this.getAttribute("options", "{}"),
  optionsValid = $tw.utils.jsonIsValid(this.currentTiddler, optionstring) || false;
  var options = optionsValid ? JSON.parse(optionstring) : {};
  //State tiddler options
  var stateString = $tw.wiki.getTiddlerText(this.state, "{}"),
  stateValid = $tw.utils.jsonIsValid("$:/plugins/joshuafontany/jsoneditor/defaultOptions", defaultString) || false;
  var stateObj = (stateValid) ? JSON.parse(stateString) : {};
  /* An attribute named 'param' can pass in a valid schema json string
  /  as a triple quoted string, or as translusion, variable, etc.
  /  Otherwise the 'schema' attribute contains a textReference from which
  /  to retreive the json schema definition. Defaults to '{}' as it still
  /  works with that degenerate case. */
  var text = this.wiki.getTextReference(this.schemaRef, "{}", this.currentTiddler),
  schemaValid = $tw.utils.jsonIsValid(this.targets[this.schemaRef].title, text) || false,
  paramValid = (this.schemaObj !== "") ? $tw.utils.jsonIsValid(this.currentTiddler, this.schemaObj) : false;
  if (paramValid) { options.schema = JSON.parse(this.schemaObj); }
  else if (text !== "" && schemaValid)
  { options.schema = JSON.parse(text); }
  if(!options.schema || _.isEmpty(options.schema) || !options.schema.type)
  { options.schema = {}; }
  options.form_name_root = this.jsonRoot;
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
  options = _.merge({}, defaultOptions, options, stateObj);
  return options;
}

/*
Rebuilds the domNodes if the editor is in view mode to allow transcluded content
*/
JSONEditorWidget.prototype.rebuildEditorNodes = function() {
  // If the this.options.mode = `view` hide the input elements,
  // then wikify and insert the value as a node
  /* 
    var itemPath, itemText, parser, editorNode;

    itemText = this.wiki.getTextReference(this.jsonRoot+itemPath, null, this.currentTiddler);
    if (itemText != null && itemText) parser = this.wiki.parseText("text/vnd.tiddlywiki",itemText,{parseAsInline: true});
    if(parser.tree) editorNode.insertBefore(parser.tree, editorNode.children[0]);
   */

}

/*
Diff and save Json on each callback change.
*/
JSONEditorWidget.prototype.saveJson = function() {
  if(!this.editor.ready) return;
  var editorValue = this.editor.getValue();
  var rootObj = (typeof editorValue =="object" && editorValue != null);
  if(this.targets[this.jsonRoot].type == "tiddler" && !rootObj) editorValue = {};
  if (!_.isEqual(this.json, editorValue)) {
    this.wiki.setTextReference(this.jsonRoot, $tw.utils.jsonOrderedStringify(editorValue), this.currentTiddler);
  }  
}

/* SaveState PolyFill
 * Element.closest() polyfill
 * https://developer.mozilla.org/en-US/docs/Web/API/Element/closest#Polyfill
 */
if (!Element.prototype.closest) {
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

/* Save State */
JSONEditorWidget.prototype.saveState = function(e) {
  if(!this.editor.ready) return;
  this.stateObj = this.getState();
  var twState = this.wiki.getTextReference(this.state, {}, this.currentTiddler),
  stateEq = _.isEqual(this.stateObj, JSON.parse(twState));
  if (!stateEq) {
    this.wiki.setTextReference(this.state, $tw.utils.jsonOrderedStringify(this.stateObj), this.currentTiddler);
  }  
  e.preventDefault();
  e.stopPropagation();
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
  var modeEq = true;
  var doRefresh = function () {
    var self=this;
    this.editor.off("change");
    this.refreshSelf();
  }
  if(changedTiddlers[this.state]){
    var twState = this.wiki.getTextReference(this.state, "{}", this.currentTiddler);
    this.stateObj = this.getState();
    modeEq = _.isEqual(this.stateObj.mode, JSON.parse(twState).mode);
  }
  //If the actual widget attributes have been modified, clear the event listeners and recreate the editor
  if (!modeEq || changedAttributes.param || changedAttributes.schema || changedAttributes.json || changedAttributes.options) {
    doRefresh();
    return true;
  }
  //If the title of the `schema` target tiddler is in `changedTiddlers`,
  //rebuild the widget
  if (changedTiddlers[this.targets[this.schemaRef].title]){
    var options = this.getOptionsFromAttributes();
    var opEq = _.isEqual(this.options, options);    
    if(!opEq) {
      doRefresh();
      return true;
    }
  }
  //If the title of the `json` target tiddler is in `changedTiddlers`,
  //get the new json and set it on the editor
  if (changedTiddlers[this.targets[this.jsonRoot].title]){
    var json = this.getJsonFromAttributes();
    var jsonEq = _.isEqual(this.json, json);
    if(!jsonEq && (changedTiddlers[this.targets[this.jsonRoot].title].destroyed)) {
      
    }
    else if (!jsonEq) {
      if (this.options.mode !== "edit") {
        doRefresh();
        return true;
      }
      this.editor.setValue(json);
    }
  }
  return this.refreshChildren(changedTiddlers);
};

exports.jsoneditor = JSONEditorWidget;

})();

