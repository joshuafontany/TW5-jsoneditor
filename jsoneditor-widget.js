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
  var self = this, currentTiddler = this.getVariable("currentTiddler");
  this.parentDomNode = parent;
	this.computeAttributes();
  this.execute();

  // An attribute named 'param' can pass in a valid schema json object (triple quoted for multi-line), or...
  // An attribute named 'schemaRef' contains a textReference from which to retreive
  // the json schema definition. Defaults to '{}' it still works with that degenerate case.
  if ($tw.utils.jsonIsValid(this.schemaObj)) {
    this.schema = this.schemaObj;
  }
  else if (this.schemaRef) {
    var text = this.wiki.getTextReference(this.schemaRef, "{}", currentTiddler);
    if ($tw.utils.jsonIsValid(text, currentTiddler)) this.schema = JSON.parse(text);
    else this.schema = {};
  } else {
      this.schema = {};
  }

  // The textReference in the json attribute indicates where to store the
  // serialized json string represented by the JSONEditor. Preload the JSONEditor
  // form with this json if it already exists
  //var jsons = this.wiki.getTextReference(this.json, null, currentTiddler);
  //if($tw.utils.jsonIsValid(jsons, this.json)) {
  //  this.startval = JSON.parse(jsons);
  //}

  // Create root editor
  var domNode = this.document.createElement("div");

  var options = {
    schema: this.schema,
    theme: this.theme,
    //startval: this.startval,
    wiki: this.wiki
  };
  this.editor = new JSONEditor(domNode, options);
  // Workaround for what I think is a bug in jsoneditor
  if (_.isEmpty(options.schema) && (options.startval == 0)) this.editor.setValue(options.startval);
  
  // Insert element
	parent.insertBefore(domNode,nextSibling);
	this.renderChildren(domNode,null);
	this.domNodes.push(domNode);
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
  this.schemaObj = this.getAttribute("param");
  this.schemaRef = this.getAttribute("schema");
  this.json = this.getAttribute("json", "New Json Tidler");
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
  if (validthemes.indexOf(lib) != -1 ) this.iconlib = lib;
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
  if (validthemes.indexOf(th) != -1 ) this.theme = th;
  // Compose the editor sub elements
	this.list = this.getTiddlerList();
	var members = [],
  self = this;
  $tw.utils.each(this.list,function(title,index) {
    members.push(self.makeItemTemplate(title));
  });
	
	// Construct the child widgets
	this.makeChildWidgets(members);
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

