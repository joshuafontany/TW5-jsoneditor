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
  this.cb = this.addCallbacks.bind(this);
  this.editor.on("change", this.cb); //Always ignore first call to change callback
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
  this.json = this.getJsonFromAttributes();
  this.options = this.getOptionsFromAttributes();
  // Create root editor
  this.container = this.document.createElement('div');
  this.container.setAttribute("class", "tw-jsoneditor");
  this.editor = new JSONEditor(this.container, this.options);
  // Workaround for what I think is a bug in jsoneditor
  if (_.isEmpty(this.options.schema) && (this.options.startval == 0)) this.editor.setValue(this.options.startval);
  if(this.options.mode !== "edit")
  { //Replace inputs with TW transclusions
    this.rebuildEditorNodes();
  }  
  // Construct the child widgets
  this.makeChildWidgets(this.container);
};

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
} 

/*
Rebuilds the options object
*/
JSONEditorWidget.prototype.getOptionsFromAttributes = function() {
  //Setup a State Tiddler
  this.state = "$:/state/jsoneditor/"+$tw.utils.jsonStringify(this.getVariable("currentTiddler"))+"/"
  this.state += this.getStateQualifier();
  if (!this.wiki.tiddlerExists(this.state)) {
    this.wiki.setTextReference(this.state,"{}",this.getVariable("currentTiddler"));
  }
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
  var stateOptions = stateValid ? JSON.parse(stateString) : {};
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
  //Pre-load values
  options.startval = this.json;
  options = _.merge({}, defaultOptions, options, stateOptions);
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
Diff and save Json on each callback change. (`Field` mode only.)
*/
JSONEditorWidget.prototype.saveJson = function() {
  console.log("Target: "+ event.target.toString()+"\n");
  if(this.target[this.jsonRoot].type !== "field") {
    //TW setTextReference
  }
  else {
    var editorValue = this.editor.getValue();
    this.json = this.json = this.getJsonFromAttributes();
    if (!_.isEqual(this.json, editorValue)) {
      this.wiki.setTextReference(this.jsonRoot, JSON.stringify(this.editor.getValue()), this.currentTiddler);
    }
  }
  
}

JSONEditorWidget.prototype.addCallbacks = function() {
  var self=this;
  this.editor.off("change", this.cb);
  this.editor.on("change", function() {
    self.saveJson(); // autosave changes
  });
  }

/*
Selectively refreshes the widget if needed. Returns true if the widget or any of its children needed re-rendering
*/
JSONEditorWidget.prototype.refresh = function(changedTiddlers) {
  var changedAttributes = this.computeAttributes();
  var jsonEq = null, opEq = null,
  targets = this.setTargets(),
  options = this.getOptionsFromAttributes(),
  json = this.getJsonFromAttributes(),
  triggerChange = false;
  //If the actual widget attributes have been modified, clear the event listeners and recreate the editor
  if (changedTiddlers[this.state] || changedAttributes.param || changedAttributes.schema || changedAttributes.json || changedAttributes.options) {
    var self=this;
    this.editor.off("change");
    this.refreshSelf();
    return true;
  }
  //If the title of the `schema` target tiddler is in `changedTiddlers`,
  //get the new schema and set it on the editor
  if (changedTiddlers[targets[this.schemaRef].title]){
    opEq = _.isEqual(this.options, options);    
    if(!opEq && (changedTiddlers[targets[this.schemaRef].title].destroyed)) {
      this.editor.options = {};
    }
    else {
      this.editor.options = options;
      if (!opEq) triggerChange = true;
    }
  }
  //If the title of the `json` target tiddler is in `changedTiddlers`,
  //get the new json and set it on the editor
  if (changedTiddlers[targets[this.jsonRoot].title]){
    jsonEq = _.isEqual(this.json, json);
    if(!jsonEq && (changedTiddlers[targets[this.jsonRoot].title].destroyed)) {
      this.json = {}; //RESET DEFAULTS HERE 
      this.editor.root.jsoneditor.setValue({});
    }
    else {
      this.editor.root.jsoneditor.setValue(json);
      if (!jsonEq) triggerChange = true;
    }
  }
  if (triggerChange) {
    this.targets = targets;
    this.editor.trigger("change");
  }
    return this.refreshChildren(changedTiddlers);
};

exports.jsoneditor = JSONEditorWidget;

})();

