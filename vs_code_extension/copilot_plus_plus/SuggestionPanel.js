const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const jsdom = require("jsdom");

const URL = "http://127.0.0.1:5000"

class SuggestionPanel {
  static currentPanel = undefined;
  static viewType = "suggestion-panel";
  static userId = "user1";
  static text = "";
  static suggestText = "";
  static filePath = undefined;
  
  static createOrShow(extensionUri) {
    const column = vscode.ViewColumn.Beside;
    // If we already have a panel, show it.
    if (SuggestionPanel.currentPanel) {
      SuggestionPanel.currentPanel._panel.reveal(column);
      SuggestionPanel.currentPanel._update();
      return;
    }
    
    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(
      SuggestionPanel.viewType,
      "Suggestions",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        
        // And restrict the webview to only loading content from our extension's `media` directory.
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, "media"),
          vscode.Uri.joinPath(extensionUri, "out/compiled"),
        ],
      }
      ); 
      SuggestionPanel.currentPanel = new SuggestionPanel(panel, extensionUri);
    }
    
    static kill() {
      SuggestionPanel.currentPanel?.dispose();
      SuggestionPanel.currentPanel = undefined;
      SuggestionPanel.filePath = undefined;
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
      SuggestionPanel.currentPanel = undefined;
      SuggestionPanel.filePath = undefined;
      
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
            //replace &space with \n
            if(!data.message){
              return;
            }
            data.message = data.message.replace("&space", "\n");
            console.log(data.message)
            SuggestionPanel.suggestText = data.message;
            vscode.window.showInformationMessage(data.message);
            console.log(SuggestionPanel.filePath)
            let openPath = vscode.Uri.file(SuggestionPanel.filePath);
            console.log(openPath)
            vscode.workspace.openTextDocument(openPath).then(doc => {
              vscode.window.showTextDocument(doc, vscode.ViewColumn.One).then(editor => {   
                console.log(editor.selection);
                const selection = editor.selection;
                
                editor.edit(editBuilder => {
                  editBuilder.insert(selection.active, SuggestionPanel.suggestText);
                });
              });
            });
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
      
      const nonce = getNonce();
      
      //const jsFile = fs.readFileSync(path.join(__dirname, "media","webview.js"), "utf8");
      SuggestionPanel.nonce = nonce;
      //"A todolist with a title and checkboxes with delete button, an add button."
      console.log("Generating webview for " + SuggestionPanel.text);
      let result = await SplitText([SuggestionPanel.text]);
      //console.log(result);
      //loop over result.result
      let text = SuggestionPanel.text+"<br/>";
      for(let i = 0; i < result.result[0].length; i++){
        let item = result.result[0][i];
        console.log(item);
        text += `<h2><input type="checkbox"/>${item.chunk}</h2>`;
        text += `<div style="margin-left: 10px;" item="${item.chunk}" onclick="clickSuggestion(this, '<!--${item.chunk}-->')">${item.chunk}</div><br/>`;
        if(item.probabilities){
          for(let j = 0; j < item.probabilities.length; j++){
            console.log("item.probabilities");
            console.log(item.probabilities[j]);
            let subItem = item.probabilities[j];
            let options = getOptions(subItem);
            //console.log(options);
            /* options.forEach(option => {
              text += `<input type="checkbox"/>${option}`;
            });*/
            if(options){
              
              for(let k = 0; k < options.length; k++){
                console.log(options[k]);
                text += `<div style="margin-left: 10px;" item="${item.chunk}" onclick="clickSuggestion(this, '<!--${item.chunk}-->&space<!--${options[k]}-->')">${options[k]}</div><br/>`;
                //text += `<div style="margin-left: 10px;" onclick="clickSuggestion(this, '<!--${options[k]}-->')>${options[k]}</div><br/>`;
                //console.log(`<div style="margin-left: 10px;" onclick="clickSuggestion(this, '<!--${item.chunk}-->\n<!--${options[k]}-->')>${item.chunk}<br/>${options[k]}</div><br/>`);
              }
            }
          }
          
        }
      }
      
      var html;
      html = 
      `
      <head>
      <meta charset="UTF-8">
      <script class="ignore" src="https://code.jquery.com/jquery-2.2.4.min.js" integrity="sha256-BbhdlvQf/xTY9gja0Dq3HiwQF8LaCRTXxZKRutelT44=" crossorigin="anonymous"></script>
      </head>
      <body>
      <script>
      const vscode = acquireVsCodeApi();
      function clickSuggestion(element, text){
        console.log("onClick");
        console.log(text);
        let item = element.getAttribute("item");
        let allDivs = document.getElementsByTagName("div");
        for(let i = 0; i < allDivs.length; i++){
          let div = allDivs[i];
          if(div.getAttribute("item") == item){
            div.style.backgroundColor = "";
          }
        }
        element.style.backgroundColor = "black";
        vscode.postMessage({
          type: "onClick",
          message: text
        });
      }
      </script>
      <div id="suggestion-panel">
      <h1>Suggestions</h1>
      `+text+`
      </div>`;
      console.log("return");
      return html;
      
    }
  }
  module.exports = SuggestionPanel;
  
  function getOptions(data){
    let options = [];
    console.log(data);
    if(data.tag && data.tag.innerText && data.innerText_text){
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
          let total = 0;
          for(let j = 0; j < results.length; j++){
            let best = results[j];
            console.log(data[attr][best]);
            total += data[attr][best];
            if(attrsTxt.length <= 0){
              tempTxt.push(attr+" "+best+", ");
            }
            else{
              
              for(let k = 0; k < attrsTxt.length; k++){
                tempTxt.push(attrsTxt[k]+attr+" "+best+", ");
              }
              
            }
          }
          // if(total <= 0.7){
          //   if(attrsTxt.length <= 0){
          //     tempTxt.push(", ");
          //   }
          //   else{
          
          //     for(let k = 0; k < attrsTxt.length; k++){
          //       tempTxt.push(attrsTxt[k]+", ");
          //     }
          
          //   }
          // }
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
  
  function SplitText(text) {
    return new Promise((resolve, reject) => {
      fetch(URL + "/split_text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text, userId: SuggestionPanel.userId }),
      })
      .then((res) => res.json())
      .then((data) => {
        return resolve(data);
      })
      .catch((err) => {
        return reject(err);
      });
    });
  }
  
  function getLogByNLP(userId, nlp) {
    return new Promise((resolve, reject) => {
      fetch(URL + "/db/getLogByNLP", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId, nlp: nlp }),
      })
      .then((res) => res.json())
      .then((data) => {
        return resolve(data);
      })
      .catch((err) => {
        return reject(err);
      });
    });
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