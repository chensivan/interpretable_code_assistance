const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const jsdom = require("jsdom");

const URL = "http://127.0.0.1:5000"

class GroupPanel {
  static currentPanel = undefined;
  static viewType = "suggestion-panel";
  static userId = "user1";
  static text = "";
  static suggestText = "";
  
  static createOrShow(extensionUri) {
    const column = vscode.ViewColumn.Beside;
    // If we already have a panel, show it.
    if (GroupPanel.currentPanel) {
      GroupPanel.currentPanel._panel.reveal(column);
      GroupPanel.currentPanel._update();
      return;
    }
    
    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(
      GroupPanel.viewType,
      "Groups",
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
      GroupPanel.currentPanel = new GroupPanel(panel, extensionUri);
    }
    
    static kill() {
      GroupPanel.currentPanel?.dispose();
      GroupPanel.currentPanel = undefined;
      GroupPanel.filePath = undefined;
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
      GroupPanel.currentPanel = undefined;
      GroupPanel.filePath = undefined;
      
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
            data.message = data.message.replace("&space", "\n");
            GroupPanel.suggestText = data.message;
            vscode.window.showInformationMessage(data.message);
          }
          case "findElement":{
            console.log("findElement");
            let openPath = vscode.Uri.file(GroupPanel.filePath);
            vscode.workspace.openTextDocument(openPath).then(doc => {
              vscode.window.showTextDocument(doc, vscode.ViewColumn.One).then(editor => {   
                console.log(editor.selection);
                let selection = editor.selection;
                if(!selection || selection.isEmpty){
                  vscode.window.showErrorMessage("Please select a element");
                  return;
                }
                let selectionRange = new vscode.Range(selection.start.line, selection.start.character, selection.end.line, selection.end.character);
                let highlighted = editor.document.getText(selectionRange);
                let regex = /<!--\s*rid[ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789]*\s*-->/g;
                let matches = highlighted.match(regex);
                if (!matches || matches.length > 1) {
                  vscode.window.showErrorMessage("Please select a single element");
                  // GroupPanel.currentPanel._panel.webview.postMessage(
                  //   { command: 'addElement', 
                  //   element: highlighted,
                  //   rid: undefined
                  // });
                }
                else{
                  let rid = matches[0].substr(7, matches[0].length - 10);
                  getLogByRID(GroupPanel.userId, rid).then(log => {
                    console.log(log);
                    if(log.length == 0){
                      vscode.window.showErrorMessage("No log found for this element");
                    }
                    GroupPanel.currentPanel._panel.webview.postMessage(
                      { command: 'addElement', 
                      element: highlighted,
                      label: log[0].label,
                      rid: rid
                    });
                  });
                }
              });
            });
            
            break;
          }
          case "searchGroups": {
            console.log("searchGroups");
            let openPath = vscode.Uri.file(GroupPanel.filePath);
            vscode.workspace.openTextDocument(openPath).then(doc => {
              vscode.window.showTextDocument(doc, vscode.ViewColumn.One).then(editor => {   
                console.log(editor.selection);
                let selection = editor.selection;
                if(!selection || selection.isEmpty){
                  vscode.window.showErrorMessage("Please select a text");
                  return;
                }
                let selectionRange = new vscode.Range(selection.start.line, selection.start.character, selection.end.line, selection.end.character);
                let highlighted = editor.document.getText(selectionRange);
                if(highlighted.includes("<!--")){
                  highlighted = highlighted.replace("<!--", "");
                }
                if(highlighted.includes("-->")){
                  highlighted = highlighted.replace("-->", "");
                }
                getLogByNLP(highlighted).then(log => {
                  console.log(log);
                  GroupPanel.currentPanel._panel.webview.postMessage(
                    { command: 'displaySearchQuery',
                    query: highlighted,
                    data: log
                  });
                });
                
              });
            });
            break;

          } 
          case "insertElement":{
            console.log("insertElement");
            console.log("findElement");
            let openPath = vscode.Uri.file(GroupPanel.filePath);
            vscode.workspace.openTextDocument(openPath).then(doc => {
              vscode.window.showTextDocument(doc, vscode.ViewColumn.One).then(editor => {   
                console.log(editor.selection);
                let selection = editor.selection;
                if(!selection || !selection.active){
                  vscode.window.showErrorMessage("Please select a position to insert");
                  return;
                }
                let code = data.code
                code = code.replace("<!--rid"+data.rid+"-->", "");
                code = code.replace("<!--/rid"+data.rid+"-->", "");
                
                editor.edit(editBuilder => {
                  editBuilder.insert(selection.active, code);
                });
              });
            });
            
            break;
          }
          case "createGroup":{
            let rId = getNonce();
            logGroup(GroupPanel.userId, "group", data.label, data.member, rId).then(data => 
              {
                vscode.window.showInformationMessage("Group created");
                GroupPanel.currentPanel._panel.webview.postMessage(
                  { command: 'completeCreateGroup'
                });
              })
              break;
            }
            case "getGroups":{
              getGroupLog().then(data => 
                {
                  console.log(data);
                  GroupPanel.currentPanel._panel.webview.postMessage(
                    { command: 'setupViewGroups',
                    data: data
                  });
                })
                break;
              }
              case "saveGroup":{
                console.log(data);
                editGroup(GroupPanel.userId, data.member, data.rid).then(data =>
                  {
                    vscode.window.showInformationMessage("Group saved");
                    GroupPanel.currentPanel._panel.webview.postMessage(
                      { command: 'completeSaveGroup'
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
        const stylesResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "group.css"));
        // const file = fs.readFileSync(CodePanel.filePath, "utf8");
        const jsFile = fs.readFileSync(path.join(__dirname, "media","groups.js"), "utf8");
        
        const html2canvas = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "html2canvas.min.js"));
        
        const nonce = getNonce();
        
        //const jsFile = fs.readFileSync(path.join(__dirname, "media","webview.js"), "utf8");
        GroupPanel.nonce = nonce;
        //console.log(GroupPanel.text);
        //"A todolist with a title and checkboxes with delete button, an add button."
        //let result = await getLogByNLP(GroupPanel.text);
        // console.log(result);
        var html;

        //<link href="${stylesResetUri}" rel="stylesheet">
        //<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-gH2yIJqKdNHPEq0n4Mqa/HGKIhSkIHeL5AyhkYV8i59U5AR6csBvApHHNl/vI1Bx" crossorigin="anonymous">
        //    <button id="view-btn">View</button><button id="add-btn">Add</button><button id="search-btn">Search</button>
        html = 
        `
        <head>
        <meta charset="UTF-8">
        <script class="ignore" src="https://code.jquery.com/jquery-2.2.4.min.js" integrity="sha256-BbhdlvQf/xTY9gja0Dq3HiwQF8LaCRTXxZKRutelT44=" crossorigin="anonymous"></script>
        </head>

        <link href="${stylesResetUri}" rel="stylesheet">
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-gH2yIJqKdNHPEq0n4Mqa/HGKIhSkIHeL5AyhkYV8i59U5AR6csBvApHHNl/vI1Bx" crossorigin="anonymous">
        
        
        <body>
        <div id="group-panel">
        <h1>Groups</h1>
    
        <ul class="nav nav-tabs">
  <li class="nav-item" >
    <a class="nav-link active" id="view-btn" aria-current="page" href="#">View Groups</a>
  </li>
  <li class="nav-item" >
    <a class="nav-link" aria-current="page" id="add-btn" href="#">Add Group</a>
  </li>
  <li class="nav-item" >
    <a class="nav-link" aria-current="page" id="search-btn" href="#">Search Groups</a>
  </li>
</ul>
        <!--<div id="groups">
        </div>-->
        <ul class="list-group list-group-flush" id="groups">
        </ul>
        </div>
        <script class="ignore" src="${html2canvas}"></script>
        <script class="ignore" nonce="${nonce}">
        const USERID = "${GroupPanel.userId}";
        console.log("userid"+USERID);
        ` + jsFile.toString() + `
        </script>`;
        console.log("return");
        return html;
        
      }
    }
    module.exports = GroupPanel;
    
    function getLogByNLP(nlp) {
      return new Promise((resolve, reject) => {
        fetch(URL + "/db/getLogByNLP", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nlp: nlp, userId: GroupPanel.userId }),
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
    
    function getLogByRID(userId, rId) {
      return new Promise((resolve, reject) => {
        fetch(URL + "/db/getLogByRID", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: userId, rId: rId }),
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
    
    function logGroup(userId, event, label, member, rid){
      return new Promise((resolve, reject) => {
        fetch(URL+"/db/insertGroup", {
          method: 'POST', 
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({userId: userId, event:event, label:label, member:member, rId:rid})
        }).then((res) => {
          return resolve(res)})
          .catch((err) => {
            return reject(err);
          }
          );
        })
      }

      function getGroupLog() {
        return new Promise((resolve, reject) => {
          fetch(URL + "/db/getGroupLogsWithCode?userId=" + GroupPanel.userId, {
            method: "GET",
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

      function editGroup(userId, member, rId){
        return new Promise((resolve, reject) => {
        fetch(URL+"/db/editGroupLog", {
          method: 'POST', 
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({userId: userId, member:member, rId:rId})
        }).then((res) => {
          return resolve(res)})
          .catch((err) => {
            return reject(err);
          }
          );
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