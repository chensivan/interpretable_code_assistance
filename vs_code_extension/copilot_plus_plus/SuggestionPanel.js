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
      const stylesResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "suggestionpanel.css"));
      
      const nonce = getNonce();
      
      //const jsFile = fs.readFileSync(path.join(__dirname, "media","webview.js"), "utf8");
      SuggestionPanel.nonce = nonce;
      //"A todolist with a title and checkboxes with delete button, an add button."
      console.log("Generating webview for " + SuggestionPanel.text);
      let result = await SplitText([SuggestionPanel.text]);
      console.log(result);
      let text = "";
      if(result.result[0].length > 0){
     
      //loop over result.result
      text = "<table class='table' ><thead><tr>";//SuggestionPanel.text+"<br/>";
      let fulltext = SuggestionPanel.text;
      let tablestrings = [];
      let prefix = fulltext.substring(0, fulltext.indexOf(result.result[0][0].chunk));
      if(prefix.length > 0){
        tablestrings.push({label: prefix, data: null});
        text += "<th class='normal-th' scope='col'>" + prefix + "</th>";
      }
      console.log("prefix: "+prefix);
      fulltext = fulltext.substring(prefix.length);
      console.log("fulltext: "+fulltext);
      for(let i = 0; i < result.result[0].length; i++){
        text += "<th scope='col'>"+result.result[0][i].chunk+"</th>";
        tablestrings.push({label: result.result[0][i].chunk, data: result.result[0][i]});
        fulltext = fulltext.substring(result.result[0][i].chunk.length);

        let suffix = fulltext.substring(fulltext.indexOf(result.result[0][i].chunk));
        if(i < result.result[0].length-1){
          suffix = fulltext.substring(fulltext.indexOf(result.result[0][i].chunk), fulltext.indexOf(result.result[0][i+1].chunk));
        }
        if(suffix){
          tablestrings.push({label: suffix, data:null});
          text += "<th class='normal-th' scope='col'>"+suffix+"</th>";
          fulltext = fulltext.substring(suffix.length);
        }
      }
      text += "</tr></thead>  <tbody><tr>";
      for(let i = 0; i < tablestrings.length; i++){
        let item = tablestrings[i];
        if(item.data){
          console.log(item.data);
          text += `<td>
          <ul class="list-group">
          <li class="list-group-item">
          <div style="margin-left: 10px;" item="${item.label}" onclick="clickSuggestion(this, '<!-- ${item.label} -->')">${item.label}</div>
          </li>`;
          if(item.data.probabilities){
            console.log(item.data.probabilities);
            let probabilities = item.data.probabilities;
            let tags = Object.keys(probabilities);
            for(let j = 0; j < tags.length; j++){
              console.log("tags: "+tags[j]);
              console.log(probabilities[tags[j]]);
              let tagProbability = probabilities[tags[j]];
              let options = getOptions(tagProbability, tags[j]);
              console.log(options);
              /* options.forEach(option => {
                text += `<input type="checkbox"/>${option}`;
              });*/
              if(options){
                
                for(let k = 0; k < options.length; k++){
                  console.log(options[k]);
                  //<!-- ${item.label} -->&space
                  text += `
                  <li class="list-group-item">
                  <div style="margin-left: 10px;" item="${item.label}" onclick="clickSuggestion(this, '<!-- ${options[k]} -->')">${options[k]}</div>
                  </li>
                  `;
                 }
             }
            }
            
          }
          text += "</ul></td>";
        }
        else{
          text += `<td></td>`;
        }
      }
      text += "</tr></tbody></table>";
    }
    
      
      var html;
      html = 
      `
      <head>
      <meta charset="UTF-8">
      <script class="ignore" src="https://code.jquery.com/jquery-2.2.4.min.js" integrity="sha256-BbhdlvQf/xTY9gja0Dq3HiwQF8LaCRTXxZKRutelT44=" crossorigin="anonymous"></script>
      </head>
      <link href="${stylesResetUri}" rel="stylesheet">
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-gH2yIJqKdNHPEq0n4Mqa/HGKIhSkIHeL5AyhkYV8i59U5AR6csBvApHHNl/vI1Bx" crossorigin="anonymous">
      
      <body>
      <script>
      const vscode = acquireVsCodeApi();
      function clickSuggestion(element, text){
        console.log("onClick");
        console.log(text);
        let item = element.getAttribute("item");
        element.parentElement.style.background = "#b7bcc9";
        console.log(element);
        setTimeout(function(){
          element.parentElement.style.background = "";
        }, 500);
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
  
  function getOptions(data, tag){
    let options = [];
    console.log(data);
    let attrs = Object.keys(data);
    let attrsTxt = [];
    let tempTxt = [];
      for(let i = 0; i < attrs.length; i++){
        let attr = attrs[i];
        if(attr != "tag"){
          let values = Object.keys(data[attr]);
          let total = 0;
          for(let j = 0; j < values.length; j++){
            let value = values[j];
            console.log(data[attr][value]);
            total += data[attr][value];
            if(attrsTxt.length <= 0){
              tempTxt.push(attr+" "+value+", ");
            }
            else{
              
              for(let k = 0; k < attrsTxt.length; k++){
                tempTxt.push(attrsTxt[k]+attr+" "+value+", ");
              }
              
            }
          }
          attrsTxt = tempTxt.slice(0);
          tempTxt = [];
        }
      }
      for(let i = 0; i < attrsTxt.length; i++){
        attrsTxt[i] = attrsTxt[i] ? " with "+attrsTxt[i].substring(0, attrsTxt[i].length-2) : attrsTxt[i];
        options.push(tag+attrsTxt[i]);
      }
      // let keys = Object.keys(data.tag);
      // for(let i = 0; i < keys.length; i++){
      //   let key = keys[i];
      //   for(let a = 0; a < attrsTxt.length; a++){
      //     options.push(key+attrsTxt[a]);
      //   }
      // }
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