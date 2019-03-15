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
	this.computeAttributes();
  this.execute();  
  // An attribute named 'schema' contains TextReference from which to retreive
  // the json schema definition. Defaults to '{}' since JSONEditor still works
  // with that degenerate case.
  if (this.schemaRef) {
    this.schema = JSON.parse(this.wiki.getTextReference(this.schemaRef, "{}", this.getVariable("currentTiddler")));
  } else {
      this.schema = {};
  }
  // The TextReference in the jsonOutput attribute indicates where to store the
  // serialized json string represented by the JSONEditor. Preload the JSONEditor
  // form with this json if it already exists
  var jsons = this.wiki.getTextReference(this.jsonOutput, null, this.getVariable("currentTiddler"));
  if(jsons) {
    this.startval = JSON.parse(jsons);
  }

  // Create element
  var options = {schema: this.schema, theme: this.theme, startval: this.startval};
  var domNode = this.document.createElement("div");
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
  this.schemaRef = this.getAttribute("schema");
  this.jsonOutput = this.getAttribute("jsonOutput", "!!json-output");
  // Allow the theme to be specified
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
  if (validthemes.indexOf(th) != -1 ) {
    this.theme = th;
  }
	// Make child widgets
	this.makeChildWidgets();
};

/*
Selectively refreshes the widget if needed. Returns true if the widget or any of its children needed re-rendering
*/
JSONEditorWidget.prototype.refresh = function(changedTiddlers) {
  var changedAttributes = this.computeAttributes();
	if(changedAttributes.schema || changedAttributes.theme || changedAttributes.jsonOutput) {
		this.refreshSelf();
		return true;
	}
	return this.refreshChildren(changedTiddlers);
};

exports.jsoneditor = JSONEditorWidget;

})();

