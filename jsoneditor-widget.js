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
  else return {};
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
  if(!this.editor.ready) return;
  var editorValue = this.editor.getValue();
  this.json = this.json = this.getJsonFromAttributes();
  if (!_.isEqual(this.json, editorValue)) {
    this.wiki.setTextReference(this.jsonRoot, JSON.stringify(this.editor.getValue()), this.currentTiddler);
  }  
}

JSONEditorWidget.prototype.saveDirty = function() {
  if(!this.editor.ready) return;
  var dirtyKeys = this.checkDirtyValues();
  var data = this.getJsonFromAttributes();
  var changed = false;
  if(dirtyKeys !== null && Object.keys(dirtyKeys).length > 0) {
    if(dirtyKeys.root == "/" ) {
      this.wiki.setTextReference(this.jsonRoot, $tw.utils.jsonOrderedStringify(this.editor.getValue()));
      this.json = this.editor.getValue();
      return;
    }    
    for (var i in dirtyKeys) {
      if (!dirtyKeys.hasOwnProperty(i)) continue;
      //console.log(i+": "+JSON.stringify(dirtyValues[i])+"\n");
      var editorValue = this.editor.editors[i].getValue(),
      twValue = ($tw.utils.jsonHas(data, dirtyKeys[i])) ? $tw.utils.jsonGet(data, dirtyKeys[i]) : "";
      if (!$tw.utils.jsonHas(data, dirtyKeys[i]) || !_.isEqual(twValue, editorValue)) {
        try {
          $tw.utils.jsonSet(data, dirtyKeys[i], this.editor.editors[i].getValue());
          if (this.editor.editors[i].is_dirty) this.editor.editors[i].is_dirty = false;
        } catch (error) {
          var key;
          if (error.match(/Json Set Error:/g)) key = error.split(/\n/g).split(':')[1];
          if(!key) continue;
          else{
            var array = $tw.utils.jsonGet(data, key);
            $tw.utils.jsonRemove(data, key);
            $tw.utils.jsonSet(data, key, {});
            array.forEach((j) => {
              $tw.utils.jsonSet(data, key+"/"+j, array[j]);
            });
            $tw.utils.jsonSet(data, dirtyKeys[i], this.editor.editors[i].getValue());
            if (this.editor.editors[i].is_dirty) this.editor.editors[i].is_dirty = false;
          }
        }         
      }
    }
    changed = true;
  }
  else {
    var editorValue = this.editor.getValue(),
    jsonKeys = $tw.utils.jsonIndexes(data),
    valueKeys = $tw.utils.jsonIndexes(editorValue),
    diff = _.difference(jsonKeys, valueKeys);
    if(diff) {
      diff.forEach((r) => {
        $tw.utils.jsonRemove(data, r);
     });
    changed = true;
    }
  }
  if(changed) this.wiki.setTextReference(this.jsonRoot, $tw.utils.jsonOrderedStringify(data));
  this.json = data;
  this.editor.setValue(data);
}

JSONEditorWidget.prototype.checkDirtyValues = function() {
  var results = {},
  json = this.getJsonFromAttributes(),
  jsonKeys = $tw.utils.jsonIndexes(json),
  editorValue = this.editor.getValue();
  if (Array.isArray(json) !== Array.isArray(editorValue)) return {root:"/"};
  if(!(typeof editorValue === "object") || editorValue == null) {
    this.editor.setValue({});
    return {root:"/"};
  }
  var valueKeys = $tw.utils.jsonIndexes(editorValue);
  var diff = _.difference(valueKeys, jsonKeys);
  valueKeys.forEach((n) => {
    var name = n.replace(/(\/)/g, ".").replace(/^(\.)/g, "");
    name = "root." + pointer.unescape(name);
    if(this.editor.editors[name].is_dirty) diff.push(n);
  });
  
  $tw.utils.jsonSort(diff).forEach((x) => {
    var name = x.replace(/(\/)/g, ".").replace(/^(\.)/g, "");
    name = "root." + pointer.unescape(name);
    if (!this.editor.editors[name]) return;
    results[name] = x;
   });
   return results || null;
}

JSONEditorWidget.prototype.addBoundCallbacks = function() {
  var self=this;
  this.editor.off("change", this.bcb);
  if(self.targets[self.jsonRoot].type == "field") {
    this.editor.on("change", function() {      
        self.saveJson(); // autosave changes
    });
  }
  else {
    this.editor.on("change", function() {
      self.saveDirty();
    });
  }
}

/*
Selectively refreshes the widget if needed. Returns true if the widget or any of its children needed re-rendering
*/
JSONEditorWidget.prototype.refresh = function(changedTiddlers) {
  var changedAttributes = this.computeAttributes();
  var jsonEq = null, opEq = null,
  options = this.getOptionsFromAttributes(),
  json = this.getJsonFromAttributes();
  //If the actual widget attributes have been modified, clear the event listeners and recreate the editor
  if (changedTiddlers[this.state] || changedAttributes.param || changedAttributes.schema || changedAttributes.json || changedAttributes.options) {
    var self=this;
    this.editor.off("change");
    thisrfeshSelf();
    return true;
  }
  //If the title of the `schema` target tiddler is in `changedTiddlers`,
  //get the new schema and set it on the editor
  if (changedTiddlers[this.targets[this.schemaRef].title]){
    opEq = _.isEqual(this.options, options);    
    if(!opEq) {
      var self=this;
      this.editor.off("change");
      thisrfeshSelf();
      return true;
    }
  }
  //If the title of the `json` target tiddler is in `changedTiddlers`,
  //get the new json and set it on the editor
  if (changedTiddlers[this.targets[this.jsonRoot].title]){
    jsonEq = _.isEqual(this.json, json);
    if(!jsonEq && (changedTiddlers[this.targets[this.jsonRoot].title].destroyed)) {
      this.json = {}; //RESET DEFAULTS HERE 
      this.editor.setValue({});
    }
    else {
      this.josn = json;
      this.editor.setValue(json);
    }
  }
  return thisreshChildren(changedTiddlers);
};

exports.jsoneditor = JSONEditorWidget;

})();

