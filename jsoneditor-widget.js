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

// Too lazy to write my own isEquals or find another way, so use one from lodash
var _ = require("$:/plugins/@oss/lodash.js");

// Pull in the meat of the functionality
var JSONEditor = require("$:/plugins/joshuafontany/jsoneditor/jsoneditor.js");
var Widget = require("$:/core/modules/widgets/widget.js").widget;

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
  this.parentDomNode = parent;
  this.currentTiddler = this.getVariable("currentTiddler");
  this.options = {};
  this.domNode = $tw.utils.domMaker('div', {
    document: this.document,
    class: 'tw-jsoneditor'
  });
  this.computeAttributes();
  this.execute();

  // Insert element
	parent.insertBefore(this.domNode,nextSibling);
	this.renderChildren(this.domNode,null);
	this.domNodes.push(this.domNode);
}

/*
Compute the internal state of the widget
*/
JSONEditorWidget.prototype.execute = function() {
  /* Attributes are:
  /  json = textReference to a json tiddler or an index in a json tiddler
  /  schema  = textReference to a schema json (in a tiddler, field, or index)
  /  param = a valid json schema object that takes preference over the schema textReference
  /  iconlib = the 'icon library' to use, must be one of validlibs[] below
  /  theme = one of the validthemes[] below
  /*/
  this.jsonRoot = this.getAttribute("json", "New Json Tiddler");
  this.schemaRef = this.getAttribute("schema", this.jsonRoot);
  this.schemaObj = this.getAttribute("param");
  // An attribute named 'param' can pass in a valid schema json object
  // (triple quoted for multi-line), or as translusion, variable, etc.
  // Otherwise 'schemaRef' contains a textReference from which to retreive
  // the json schema definition. Defaults to '{}' it still works with that degenerate case.
  var text = this.wiki.getTextReference(this.schemaRef, "{}", this.currentTiddler),
  schemaValid = $tw.utils.jsonIsValid(text, this.schemaRef) || false,
  paramValid = $tw.utils.jsonIsValid(this.schemaObj, this.currentTiddler) || false;
  if ((!this.schemaObj || this.schemaObj === "") && paramValid) {
    this.options.schema = this.schemaObj;
  }
  else if (this.schemaRef && schemaValid)
  { this.options.schema = JSON.parse(text); }
  else { this.options.schema = {}; }
  //Test to see if the jsonRoot is a tiddler title or a reference to a field or index
  var result = $tw.utils.parseTextReference(this.jsonRoot);
  if(!$tw.wiki.tiddlerExists(result.title)) {
    $tw.wiki.setTextReference(this.jsonRoot, "{}");
  }
  if (result.field) { //If json target is a field, pre-load values
      this.options.startval = this.json;
      this.target = "field";
  }
  else if (result.index) this.target = "index";
  else this.target = "tiddler";
  this.options.target = this.target;
  this.options.form_name_root = this.jsonRoot;
  
  //If jsonRoot contains invalid json, alert
  var jsonstring = $tw.wiki.getTextReference(this.jsonRoot, "{}", this.currentTiddler);
  if($tw.utils.jsonIsValid(result.title, jsonstring)) {
    this.json = JSON.parse(jsonstring);
  }
  else {
    this.makeChildWidgets(["''Error: invalid json attribute''"]);
    return; 
  }
  // iconlib and theme
  var lib = this.getAttribute("iconlib");
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
  if (validlibs.indexOf(lib) != -1 ) this.options.iconlib = lib;
  var th = this.getAttribute("theme");
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
  if (validthemes.indexOf(th) != -1 ) this.options.theme = th;
  // Create root editor
  this.options.parent = this;
  this.editor = new JSONEditor(this.domNode, this.options);
  // Workaround for what I think is a bug in jsoneditor
  if (_.isEmpty(this.options.schema) && (this.options.startval == 0)) this.editor.setValue(this.options.startval);
	// Construct the child widgets
	this.makeChildWidgets(this.editor.jsoneditor.root_container);
};

/*
Selectively refreshes the widget if needed. Returns true if the widget or any of its children needed re-rendering
*/
JSONEditorWidget.prototype.refresh = function(changedTiddlers) {
  var changedAttributes = this.computeAttributes();
  if(changedAttributes.schema || changedAttributes.theme || changedAttributes.json || changedAttributes.param) {
		this.refreshSelf();
		return true;
	}
	return this.refreshChildren(changedTiddlers);
};

exports.jsoneditor = JSONEditorWidget;

})();

