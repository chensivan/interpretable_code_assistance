const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const URL = "http://127.0.0.1:5000"

class CodePanel {
  /**
  * Track the currently panel. Only allow a single panel to exist at a time.
  */
  static currentPanel = undefined;
  static viewType = "code-panel";
  
  static createOrShow(extensionUri) {
    const column = vscode.ViewColumn.Two;
    // If we already have a panel, show it.
    if (CodePanel.currentPanel) {
      CodePanel.currentPanel._panel.reveal(column);
      CodePanel.currentPanel._update();
      return;
    }
    
    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(
      CodePanel.viewType,
      "Code",
      vscode.ViewColumn.Two,
      {
        // Enable javascript in the webview
        enableScripts: true,
        
        // And restrict the webview to only loading content from our extension's `media` directory.
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, "media"),
          vscode.Uri.joinPath(extensionUri, "out/compiled"),
        ],
      }
      ); 
      CodePanel.currentPanel = new CodePanel(panel, extensionUri);
    }
    
    static kill() {
      CodePanel.currentPanel?.dispose();
      CodePanel.currentPanel = undefined;
      CodePanel.filePath = undefined;
    }
    
    static revive(panel, extensionUri) {
      //CodePanel.currentPanel = new CodePanel(panel, extensionUri);
    }
    
    constructor(panel, extensionUri) {
      this._panel = panel;
      this._extensionUri = extensionUri;
      
      // Set the webview's initial html content
      this._update();
      
      // Listen for when the panel is disposed
      // This happens when the user closes the panel or when the panel is closed programatically
      this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }
    
    dispose() {
      CodePanel.currentPanel = undefined;
      CodePanel.filePath = undefined;
      
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
      
      this._panel.webview.html = this._getHtmlForWebview(webview);
      //Messages passed from the webview to the extension
      webview.onDidReceiveMessage(async (data) => {
        switch (data.type) {
          case "onDrag":{
            if (!data.new) {
              return;
            }
            this._replaceInEditor(data.new, data.old);
            if (data.nlp){
              this.log("user1", "drag", `Drag element with label <${data.nlp}>, ${data.transform}`, data.nlp, data.text, data.new, data.rid);
            }
            break;
          }
          case "onResize":{
            if (!data.new) {
              return;
            }
            this._replaceInEditor(data.new, data.old);
            if (data.nlp){
              this.log("user1", "resize", `Resize element with label <${data.nlp}> to ${data.size}`, data.nlp, data.text, data.new, data.rid);
            }
            break;
          }
          case "onInsert": {
            if (!data.value) {
              return;
            }
            let rId = getNonce();
            this.log("user1", "insert", "insert object with prompt/label: "+data.value+" and style "+data.style, data.value, "style=\""+data.style+"\"", rId);
            
            if(data.opt == 0){
              var comment = `<!-- ${data.value} -->\n<div ${data.style} nlp="${data.value}" rid="${rId}">\n</div>`;
            }
            else if(data.opt == 1){
              var comment = `<div ${data.style} nlp="${data.value}" rid="${rId}">\n<!-- ${data.value} -->\n</div>`;
            }
            else if(data.opt == 2){
              var comment = data.code.replace("rid-placeholder", rId);
            }
            this._replaceInEditor(comment+"\n</body>", "</body>");
            break;
          }
          case "onComplete": {
            //loop data.inserted
            for (var prop in data.inserted) {
              if (Object.prototype.hasOwnProperty.call(data.inserted, prop)) {
                  //this._replaceInEditor(data.replaced[prop], data.inserted[prop]);
                  this._replaceInEditor(`eid="${prop}"`, `rid="${prop}"`);
              }
          }
          this.completeLogs("user1", data.inserted);
          break;
          }
          case "onCompleteJS": {
            this.completeJSLogs("user1", data.inserted);
            break;
          }
          case "changeAttr": {
            if (!data.old || !data.new) {
              return;
            }
            this._replaceInEditor(data.new,data.old);
            if(data.nlp){
              this.log("user1", "change attribues", `change attributes with label <${data.nlp}> with ${data.changes}`, data.nlp, data.text, data.new, data.rid);
            }
            break;
          }
          case "onEdit": {
            if (!data.old || !data.new) {
              return;
            }
            this._replaceInEditor(data.new, data.old);
            if(data.nlp){
              this.log("user1", "edit", `Edit the innerHTML to ${data.inner}, where element has label: <${data.nlp}>`, data.nlp, data.text, data.new, data.rid);
            }
            break;
          }
          case "delete":{
            if (!data.value) {
              return;
            }
            this._replaceInEditor(" ",data.value);
            if(data.nlp){
              this.log("user1", "delete", "delete element with label: <"+data.nlp+">", data.nlp, data.text, "", data.rid);
            }
            //this.log("user1", "delete", data.value);
            break;
          }
          case "createjs":{
            if (!data.old || !data.new || !data.event || !data.name) {
              return;
            }
            if(data.script){
              let sId = getNonce();
              this._replaceInEditor(data.new, data.old, "function "+data.name+"{\n //"+data.script+"\n}",sId);
              this.log("user1", "insert", "insert js with name: "+data.name+" and function: "+data.script, "[JSScript] "+data.script, "", sId);
            }
            else{
              this._replaceInEditor(data.new, data.old);
            }
            if(data.nlp){
              this.log("user1", "createjs", `Create action listener ${data.event}=${data.name}, where ${data.name} is a function that ${data.script}. Element has label: <${data.nlp}>`, 
              data.nlp, data.text, data.new, data.rid);
            }
            break;
          }
          case "onError": {
            if (!data.value) {
              return;
            }
            vscode.window.showErrorMessage(data.value);
            break;
          } 
          case "onView": {
            if (!data.new) {
              return;
            }
            this._replaceInEditor(data.new, data.old);
            this.log("user1", "reset", `Reset element with label <${data.nlp}> back by ${data.step} step(s); from #${data.oldId}# to #${data.newId}#`, data.nlp, data.text, data.new, data.rid);
            break;
          }
          case "onReset": {
            if (!data.new) {
              return;
            }
            if (data.opt === 0){
              this._replaceInEditor(data.new, data.old);
              this.deleteLog(data.id);
            }
            var ids = data.id;
            for (var i = 0; i < ids.length; i++) {
              this.deleteLog(ids[i]);
            }

            

          }
        }
      });
    }

    log(userId, event, details, label, text, code, rid){
      fetch(URL+"/db/insertLog", {
      method: 'POST', 
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({userId: userId, event:event, details:details, label:label, text:text, code:code, rid:rid})
      })
  }

  completeLogs(userId, inserted){
    fetch(URL+"/db/completeLog", {
    method: 'POST', 
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({userId: userId, inserted:inserted})
    })
}

completeJSLogs(userId, inserted){
  fetch(URL+"/db/completeJSLog", {
  method: 'POST', 
  headers: {"Content-Type": "application/json"},
  body: JSON.stringify({userId: userId, inserted:inserted})
  })
}

  getLog(userId){
    return new Promise((resolve, reject) => {
      fetch(URL+"/db/getLogs?userId="+userId, {
        method: 'GET'
        })
        .then(res => res.json())
        .then(data => {
          return resolve(data);
        })
        .catch(err => {
          return reject(err);
        })
      })
  }

  deleteLog(dataId){
    return new Promise((resolve, reject) => {
      fetch(URL+"/db/deleteLogs?dataId="+dataId, {
        method: 'GET'
        })
        .then(data => {
          return resolve(data);
        })
        .catch(err => {
          return reject(err);
        })
      })
  }

  getTextByNLP(userId, nlp) {
    return new Promise((resolve, reject) => {
      fetch(URL+"/db/getTextByNLP", {
        method: 'POST',
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({userId: userId, nlp: nlp})
        })
        .then(res => res.json())
        .then(data => {
          return resolve(data);
        })
        .catch(err => {
          return reject(err);
        })
      })
  }

  //Print comment to the editor
  _printCommentToEditor(comment, sId){
    var openPath = vscode.Uri.file(CodePanel.filePath);
    if(openPath){
      vscode.workspace.openTextDocument(openPath).then(doc => {
          vscode.window.showTextDocument(doc, vscode.ViewColumn.One).then(editor => {          
              var text = editor.document.getText();
              var index = text.lastIndexOf('</html>');
              
              if(index > 0){
                text = text.substring(0, index);
              }
              var lineNumber = text.split('\n').length;
              // var tempString = str.substring(0, index);
              comment = "<script sid=\""+sId+"\"> \n "+ comment + "\n</script>" 
              var pos = new vscode.Position(lineNumber-1,0);
              var pos1 = new vscode.Position(lineNumber-1,comment.length);
              
              var range = new vscode.Range(pos1, pos1);
              // Line added - by having a selection at the same position twice, the cursor jumps there
              editor.revealRange(range);
              editor.edit(editBuilder => {
                editBuilder.insert(pos, comment+"\n");
              });
              
              editor.selections = [new vscode.Selection(pos1,pos1)]; 
              return true;
            });
          });
        }
      }
      
      _replaceInEditor(newText, oldText, script, sId){
        var openPath = vscode.Uri.file(CodePanel.filePath);
        if(openPath){
          vscode.workspace.openTextDocument(openPath).then(doc => {
            vscode.window.showTextDocument(doc, vscode.ViewColumn.One).then(editor => {          
              var text = editor.document.getText();
              var index = text.indexOf(oldText);
              let temp = text;
              if(index > 0){
                temp = text.substring(0, index);
              }
              var lineNumber = temp.split('\n').length;
              let pos = new vscode.Position(lineNumber-1,newText.length-1);
              if(oldText === "</body>"){
                pos = new vscode.Position(lineNumber,newText.length-1);
              }
              
              let newDoc = text.replace(oldText, newText);
              var firstLine = editor.document.lineAt(0);
              var lastLine = editor.document.lineAt(editor.document.lineCount - 1);
              var textRange = new vscode.Range(firstLine.range.start, lastLine.range.end);

              var range = new vscode.Range(pos, pos);
              // Line added - by having a selection at the same position twice, the cursor jumps there
              editor.edit(editBuilder => {
                //editBuilder.replace(pos, newText);
                editBuilder.replace(textRange, newDoc);
              });
              
              editor.revealRange(range);
              editor.selections = [new vscode.Selection(pos,pos)]; 
              if(script){
                this._printCommentToEditor(script, sId)
              }
            });
          });
        }
      }
      
      _getHtmlForWebview(webview) {
        //icons
        const stylesResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "reset.css"));
        const chatBotSrc = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "chatbot.js"));
        // const webviewSrc = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "webview.js"));
        const chatBotUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "chatbot.css"));
        const selectIcon = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "selectw.png"));
        const inlineIcon = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "inlineIcon.png"));
        const dragIcon = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "move.png"));
        const showIcon = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "text.png"));
        const resizeIcon = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "resize.png"));
        const deleteIcon = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "delete.png"));
        const chatIcon = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "chatbot.png"));
        const html2canvas = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "html2canvas.min.js"));
        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();
        
        CodePanel.filePath = vscode.window.activeTextEditor.document.fileName;
        
        //Read the file
        const file = fs.readFileSync(CodePanel.filePath, "utf8");
        const jsFile = fs.readFileSync(path.join(__dirname, "media","webview.js"), "utf8");
        
        //Parse the file into a string
        CodePanel.nonce = nonce;
        var html;
          html = 
          `
          <head>
          <meta charset="UTF-8">
          <script src="https://code.jquery.com/jquery-2.2.4.min.js" integrity="sha256-BbhdlvQf/xTY9gja0Dq3HiwQF8LaCRTXxZKRutelT44=" crossorigin="anonymous"></script>
          </head>
          <div class="navbar" id="navbar">Tools
          <img class="icon" id="icon-tip" src="${inlineIcon}"/>
          <img class="icon" id="icon-insert" src="${selectIcon}"/>
          <img class="icon" id="icon-drag" src="${dragIcon}"/>
          <img class="icon" id="icon-resize" src="${resizeIcon}"/>
          <img class="icon" id="icon-edit" src="${showIcon}"/>
          <img class="icon" id="icon-js" src="${showIcon}"/>
          <img class="icon" id="icon-delete" src="${deleteIcon}"/>
          <img class="icon" id="icon-chat" src="${chatIcon}"/>
          </div>
          <button class="openbtn" id="openbtn">&#9776;</button>
          <div class="sidePanel" id="sidePanel">
          <a href="javascript:void(0)" class="closebtn">&times;</a>
          <h1> History </h1>
          <div class="sidePanelLog" id="sidePanelLog">
          </div>
          </div>
          `+file.toString()+` 
          <link href="${stylesResetUri}" rel="stylesheet">
          <link href="${chatBotUri}" rel="stylesheet">
          <script src="${chatBotSrc}"></script>
          <script src="${html2canvas}"></script>
          <script nonce="${nonce}">
          ` + jsFile.toString() + `
          </script>`;
          return html;
        
      }
    }
    module.exports = CodePanel;
    
    function getNonce() {
      let text = "";
      const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
      }
      return text;
    }