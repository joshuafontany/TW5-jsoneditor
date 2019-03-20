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
  var domNode = this.execute();
  this.cb = this.addSaveJsonCallback.bind(this);
  this.editor.on("change", this.cb); //Always ignore first call to change callback
  // Insert element
	parent.insertBefore(domNode,this.nextSibling);
	this.renderChildren(domNode,null);  // Only render if there are widgets
	this.domNodes.push(domNode);
}

/*
Compute the internal state of the widget
*/
JSONEditorWidget.prototype.execute = function() {
  /* Attributes are:
  /  param = a valid json schema object that takes preference over the schema textReference
  /  schema  = textReference to a schema json (in a tiddler, field, or index)
  /  json = textReference to a json tiddler or an index in a json tiddler, defaults to schema+"/data"
  /  iconlib = the 'icon library' to use, must be one of validlibs[] below
  /  theme = one of the validthemes[] below
  */
  this.targets = this.setTargets();
  this.json = this.getJsonFromAttributes();
  this.options = this.getOptionsFromAttributes();
  // Create root editor
  var container = this.document.createElement('div');
  container.setAttribute("class", "tw-jsoneditor");
  this.editor = new JSONEditor(container, this.options);
  // Workaround for what I think is a bug in jsoneditor
  if (_.isEmpty(this.options.schema) && (this.options.startval == 0)) this.editor.setValue(this.options.startval);
  if(this.targets[1].type !== "field") 
  { //Replace inputs with TW widgets
    this.rebuildEditorNodes(container);
  }  
   // Construct the child widgets
  this.makeChildWidgets(container);
  return container;
};

/*
Sets the target attribute based on the json textReference
*/
JSONEditorWidget.prototype.setTargets = function() {
  this.schemaObj = this.getAttribute("param", "");
  this.schemaRef = this.getAttribute("schema", "New Schema Tiddler");
  this.jsonRoot = this.getAttribute("json", "New Json Tiddler");

  var sources = [],
  results = [],
  targets = [];
  sources[0] = this.schemaRef;
  sources[1] = this.jsonRoot;
  results[0] = $tw.utils.parseTextReference(sources[0]);
  results[1] = $tw.utils.parseTextReference(sources[1]);
  var objKeys = Object.keys(results);
  objKeys.forEach(function(i) {
    var result = results[i];
    if (result.field) { 
      targets[i] = {type: "field"};
    }
    else if (result.index) targets[i] = {type: "index"};
    else targets[i] = {type: "tiddler"};
    targets[i].title = result.title;
    targets[i].field = result.field || "";
    targets[i].index = result.index || "";
  }, this);
  return targets;
}

/*
Rebuilds the options object
*/
JSONEditorWidget.prototype.getOptionsFromAttributes = function() {
  var optionstring = this.getAttribute("options", "{}"),
  optionsValid = $tw.utils.jsonIsValid(this.currentTiddler, optionstring) || false;
  var options = optionsValid ? JSON.parse(optionstring) : {};
  /* An attribute named 'param' can pass in a valid schema json string
  /  as a triple quoted string, or as translusion, variable, etc.
  /  Otherwise the 'schema' attribute contains a textReference from which
  /  to retreive the json schema definition. Defaults to '{}' as it still
  /  works with that degenerate case.
  */
  var text = this.wiki.getTextReference(this.schemaRef, "{}", this.currentTiddler),
  schemaValid = $tw.utils.jsonIsValid(this.targets[0].title, text) || false,
  paramValid = (this.schemaObj && this.schemaObj !== "") ? $tw.utils.jsonIsValid(this.currentTiddler, this.schemaObj) : false;
  if (paramValid) {
    options.schema = JSON.parse(this.schemaObj);
  }
  else if (this.schemaRef && schemaValid)
  { options.schema = JSON.parse(text); }
  if(!options.schema || _.isEmpty(options.schema) || !options.schema.type) options.schema = {};
  //Test to see if the jsonRoot is a tiddler title or a reference to a field or index
  options.target = this.targets[1];
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
  //Pre-load values
  options.startval = this.json; //(this.targets[1].type == "field") ? this.json : null;
  return options;
}

/*
Rebuilds the json object from source
*/
JSONEditorWidget.prototype.getJsonFromAttributes = function() {
  var jsonstring = this.wiki.getTextReference(this.jsonRoot, "{}", this.currentTiddler);
  //If jsonRoot contains invalid json, alert
  if($tw.utils.jsonIsValid(this.targets[1].title, jsonstring) && jsonstring !== ""){
    return JSON.parse(jsonstring);
  }
} 

/*
Rebuilds the domNode if the target is a json tiddler or index
*/
JSONEditorWidget.prototype.rebuildEditorNodes = function(domNode) {
//
domNode.insertBefore(this.document.createTextNode("**I should have widgets!**"), null);
return domNode;
}

/*
Diff and save Json and Schema on each callback change.
*/
JSONEditorWidget.prototype.saveJson = function() {
  var editorValue = this.editor.getValue();
  //var editorSchema = this.editor.;
  if (!_.isEqual(this.json, editorValue)) {
    this.wiki.setTextReference(this.jsonRoot, JSON.stringify(this.editor.getValue()), this.currentTiddler);
  }
  // if (!_.isEqual(this.options.schema, editorSchema)) {
  //   this.wiki.setTextReference(this.schemaRef, JSON.stringify(this.editor.????), this.currentTiddler);
  // }
}
JSONEditorWidget.prototype.addSaveJsonCallback = function() {
  var self=this;
  this.editor.off("change", this.cb);
  this.editor.on("change", function() {
    self.saveJson();
  }); // autosave changes
}

/*
Selectively refreshes the widget if needed. Returns true if the widget or any of its children needed re-rendering
*/
JSONEditorWidget.prototype.refresh = function(changedTiddlers) {
  var changedAttributes = this.computeAttributes();
  var targets = this.setTargets(),
  options = this.getOptionsFromAttributes(),
  json = this.getJsonFromAttributes();
  if (changedAttributes.param || changedAttributes.schema || changedAttributes.json || changedAttributes.options) {
    var self=this;
    this.editor.off("change");
    this.refreshSelf();
    return true;
  }
  else if (changedTiddlers[targets[0].title] || changedTiddlers[targets[1].title]){
    var jsonEq = _.isEqual(this.json, json),
    opEq = _.isEqual(this.options, options);
    if(!jsonEq) {this.json = json; this.editor.root.jsoneditor.setValue(json);}
    if(!opEq) this.editor.options = options;
    if (!jsonEq || !opEq) this.editor.trigger("change");
  }
  if (this.targets[1].type !== "field"){
    return this.refreshChildren(changedTiddlers);
  }
};

exports.jsoneditor = JSONEditorWidget;

})();

