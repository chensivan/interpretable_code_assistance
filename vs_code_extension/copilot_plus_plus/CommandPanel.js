const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const jsdom = require("jsdom");

const URL = "http://127.0.0.1:5000"

class CommandPanel {
  static currentPanel = undefined;
  static viewType = "suggestion-panel";
  static userId = "user1";
  static text = "";
  static suggestText = "";
  static filePath = undefined;
  
  static createOrShow(extensionUri) {
    const column = vscode.ViewColumn.Two;
    // If we already have a panel, show it.
    if (CommandPanel.currentPanel) {
      CommandPanel.currentPanel._panel.reveal(column);
      CommandPanel.currentPanel._update();
      return;
    }
    
    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(
      CommandPanel.viewType,
      "Copilot++ Commands",
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        
        // And restrict the webview to only loading content from our extension's `media` directory.
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, "media"),
          vscode.Uri.joinPath(extensionUri, "out/compiled"),
        ],
      }
      ); 
      CommandPanel.currentPanel = new CommandPanel(panel, extensionUri);
    }
    
    static kill() {
      CommandPanel.currentPanel?.dispose();
      CommandPanel.currentPanel = undefined;
      CommandPanel.filePath = undefined;
    }
    
    static revive(panel, extensionUri) {
      //CodePanel.currentPanel = new CodePanel(panel, extensionUri);
    }
    
    constructor(panel, extensionUri) {
      this._panel = panel;
      this._extensionUri = extensionUri;
      
      this._update();
      
      this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }
    
    dispose() {
      CommandPanel.currentPanel = undefined;
      CommandPanel.filePath = undefined;
      
      // Clean up our resources
      this._panel.dispose();
      
      while (this._disposables && this._disposables.length) {
        const x = this._disposables.pop();
        if (x) {
          x.dispose();
        }
      }
    };
    
    async _update() {
      const webview = this._panel.webview;
      
      this._panel.webview.html = await this._getHtmlForWebview(webview);
      //Messages passed from the webview to the extension
      webview.onDidReceiveMessage(async (data) => {
        switch (data.type) {
          case "onClick":{
            //
            console.log(vscode.workspace.textDocuments);
            let openPath = vscode.Uri.file(CommandPanel.filePath);
            vscode.workspace.openTextDocument(openPath).then(doc => {
              vscode.window.showTextDocument(doc, vscode.ViewColumn.One).then(editor => {   
                console.log(editor.selection);
                vscode.commands.executeCommand(data.message);
              });
            });
            vscode.window.showInformationMessage(data.message)
          }
          case "onError": {
            if (!data.value) {
              return;
            }
            vscode.window.showErrorMessage(data.value);
            break;
          } 
        }
      });
    }
    
    
    async  _getHtmlForWebview(webview) {
      //icons
      const stylesResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "reset.css"));
      const commandpanelUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "commandpanel.css"));
      
      const nonce = getNonce();
      
      //const jsFile = fs.readFileSync(path.join(__dirname, "media","webview.js"), "utf8");
      CommandPanel.nonce = nonce;
      console.log(CommandPanel.text);
      //"A todolist with a title and checkboxes with delete button, an add button."
      let result = await getLogByNLP(CommandPanel.text);
      console.log(result);
      var html;
      html = 
      `
      <head>
      <meta charset="UTF-8">
      </head>
      <link href="${commandpanelUri}" rel="stylesheet">
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-gH2yIJqKdNHPEq0n4Mqa/HGKIhSkIHeL5AyhkYV8i59U5AR6csBvApHHNl/vI1Bx" crossorigin="anonymous">
      
      <body>
      <script>
      const vscode = acquireVsCodeApi();
      function clickSuggestion(element, text){
        console.log("onClick");
        console.log(text);
        element.style.background = "#b7bcc9";
        console.log(element);
        //element.classList.add("card-header");
        setTimeout(function(){
          element.style.background = "";
          //element.classList.remove("card-header");
        }, 500);
        vscode.postMessage({
          type: "onClick",
          message: text
        });
      }
      </script>
      <div id="command-panel">
      
      <div class="card"  id="command-list" style="box-shadow: 0px 0px 5px #888888;">
      <ul class="list-group list-group-flush">
      <li class="card-header">
      <h1>Copilot++ Commands</h1>
      </li>
      <li class="list-group-item" onclick="clickSuggestion(this,'visual.insertElement')">
      <div class="command" >
      <h3>Insert Element &#10095;</h3>
      Insert highlighted text to the database (ctrl+alt+shift+i)
      </div>
      </li>
      <li class="list-group-item" onclick="clickSuggestion(this,'cpp.saveData')">
      <div class="command" >
      <h3>Save Data &#10095;</h3>
      Save elements to the database (ctrl+s)
      </div>
      </li>
      <li class="list-group-item" onclick="clickSuggestion(this,'visual.openSuggestions')">
      <div class="command" >
      <h3>Open Suggestions &#10095;</h3>
      Open Suggestion Panel for highlighted text (ctrl+alt+shift+o)
      </div>
      </li>
      
      <li class="list-group-item" onclick="clickSuggestion(this,'visual.openGroups')">
      <div class="command" >
      <h3>Open Groups &#10095;</h3>
      Get Group Suggestions for highlighted text (ctrl+alt+shift+g)
      </div>
      </li>
      </ul>
      </div>
      
      </div>`;
      console.log("return");
      return html;
      
    }
  }
  module.exports = CommandPanel;
  
  function getOptions(data){
    let options = [];
    //console.log(data);
    if(data.tag.innerText && data.innerText_text){
      //get keys of innerText
      let keys = Object.keys(data.innerText_text);
      for(let i = 0; i < keys.length; i++){
        let key = keys[i];
        options.push(key);
      }
    }
    else{
      let attrs = Object.keys(data);
      let attrsTxt = [];
      let tempTxt = [];
      for(let i = 0; i < attrs.length; i++){
        let attr = attrs[i];
        if(attr != "tag" && attr != "innerText_text" && attr != "element_childrens"){
          let results = Object.keys(data[attr]);
          for(let j = 0; j < results.length; j++){
            let best = results[j];
            if(attrsTxt.length <= 0){
              tempTxt.push(attr+" "+best+", ");
            }
            else{
              
              for(let k = 0; k < attrsTxt.length; k++){
                tempTxt.push(attrsTxt[k]+attr+" "+best+", ");
              }
              
            }
          }
          attrsTxt = tempTxt.slice(0);
          tempTxt = [];
          //console.log(attrsTxt);
        }
      }
      //console.log(attrsTxt);
      for(let i = 0; i < attrsTxt.length; i++){
        attrsTxt[i] = attrsTxt[i] ? " with "+attrsTxt[i].substring(0, attrsTxt[i].length-2) : attrsTxt[i];
      }
      //attrsTxt = attrsTxt ? " with "+attrsTxt.substring(0, attrsTxt.length-2) : attrsTxt;
      //console.log("attrsTxt", attrsTxt);
      let keys = Object.keys(data.tag);
      for(let i = 0; i < keys.length; i++){
        let key = keys[i];
        //console.log(key);
        //console.log(key);
        for(let a = 0; a < attrsTxt.length; a++){
          options.push(key+attrsTxt[a]);
        }
      }
    }
    //console.log(options);
    return options;
  }
  
  function getLogByNLP(nlp) {
    return new Promise((resolve, reject) => {
      fetch(URL + "/db/getLogByNLP", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nlp: nlp, userId: CommandPanel.userId }),
      })
      .then((res) => res.json())
      .then((data) => {
        return resolve(data["groups"]);
      })
      .catch((err) => {
        return reject(err);
      });
    });
  }
  
  
  function logGroup(userId, event, label, member, rid){
    fetch(URL+"/db/insertGroup", {
      method: 'POST', 
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({userId: userId, event:event, label:label, member:member, rId:rid})
    })
  }
  
  function getNonce() {
    let text = "";
    const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }