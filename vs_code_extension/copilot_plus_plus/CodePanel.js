const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const jsdom = require("jsdom");

const URL = "http://127.0.0.1:5000"

class CodePanel {
  static currentPanel = undefined;
  static viewType = "code-panel";
  static lastLog = 0;
  static userId = "user1";
  
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
      
      this._update();

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
        console.log(data);
        let time = (new Date()).getTime();
        if(time - this.lastLog < 100 
          && data.type !== "onCompleteJS" 
          && data.type !== "onComplete"){
            this.lastLog = time;
            return;
          }
          this.lastLog = time;

          switch (data.type) {
            case "onDrag":{
              if (!data.new || !data.old) {
                return;
              }
              this._replaceInEditor(data.new, data.old);
              if (data.nlp){
                this.log(CodePanel.userId, "drag", `Drag element with label [${data.nlp}], ${data.transform}`, data.nlp, data.new, data.rid);
              }
              break;
            }
            case "onResize":{
              if (!data.new || !data.old) {
                return;
              }
              this._replaceInEditor(data.new, data.old);
              if (data.nlp){
                this.log(CodePanel.userId, "resize", `Resize element with label [${data.nlp}] to ${data.size}`, data.nlp, data.new, data.rid);
              }
              break;
            }
            case "onInsert": {
              var comment = ""
              if (data.value) {
                let rId = getNonce();
                this.log(CodePanel.userId, "insert", 
                "insert object with prompt/label: ["+data.value+"] and style "+data.style, 
                data.value, "", rId, data.oldRid);
                
                if(data.opt == 0){
                  var comment = `<!-- ${data.value} -->\n<div ${data.style} nlp="${data.value}" rid="${rId}">\n</div>`;
                }
                else if(data.opt == 1){
                  var comment = `<div ${data.style} nlp="${data.value}" rid="${rId}">\n<!-- ${data.value} -->\n</div>`;
                }
                else if(data.opt == 2){
                  var comment = data.code.replace("rid-placeholder", rId);
                }
              }
              
              if(data.remaining){
                for(let i = 0; i < data.remaining.length; i++){
                  let rId = getNonce();
                  console.log(data.remaining[i]);
                  console.log(data.remaining[i].label);
                  this.log(CodePanel.userId, "insert", "", data.remaining[i].label, "", rId, data.remaining[i].rid);
                  let otherElement = data.remaining[i].code.replace(data.remaining[i].rid, rId);
                  comment += "\n\n" + otherElement;
                }
              }
              
              if(data.scripts){//Just not going to record for now...
                for(let i = 0; i < Object.keys(data.scripts).length; i++){
                  //TODO
                  let key = Object.keys(data.scripts)[i];
                  let rId = getNonce();
                  this.log(CodePanel.userId, "insert", "insert js script to db", data.scripts[key]["nlp"], "", rId);
                  let otherElement = data.scripts[key]["code"].replace(key, rId);
                  comment += "\n\n" + otherElement;
                }
              }
              
              if(comment){
                this._replaceInEditor(comment+"\n</body>", "</body>");
              }
              break;
            }
            case "onGroup":{
              let rId = getNonce();
              if (data.success) {
                this.logGroup(CodePanel.userId, "group", data.label, data.member, rId);
              }else{
                vscode.window.showInformationMessage(data.message);
              }
              
              break;
            }
            case "onEditGroup":{
              if (data.rId){
                this.editGroup(CodePanel.userId, data.member, data.rId);
              }
              
              break;
            }
            case "onUpdate":{
              if (!data.rId){
                let rId = getNonce();
                let comment = `<div nlp="${data.nlp}" rid="${rId}">\n${data.code}\n</div>`;
                this._replaceInEditor(comment, data.code);
                this.log(CodePanel.userId, "insert", "", data.nlp, data.code, rId);
              }
              break;
            }
            case "onComplete": {
              this.completeLogs(CodePanel.userId, data.inserted);
              break;
            }
            case "onCompleteJS": {
              this.completeJSLogs(CodePanel.userId, data.inserted);
              break;
            }
            case "onUpdateCode": {
              this.updateCode(CodePanel.userId, "update code", "update code in editor", data.code, data.rid); //don't change nlp for now
            }
            case "changeAttr": {
              if (!data.old || !data.new) {
                return;
              }
              this._replaceInEditor(data.new,data.old);
              if(data.nlp){
                this.log(CodePanel.userId, "change attribues", `change attributes with label [${data.nlp}] with ${data.changes}`, 
                data.nlp, data.newHTML, data.rid);
              }
              break;
            }
            case "onEdit": {
              if (!data.old || !data.new) {
                return;
              }
              this._replaceInEditor(data.new, data.old);
              if(data.nlp){
                this.log(CodePanel.userId, "edit", `Edit the innerHTML to ${data.inner}, where element has label: [${data.nlp}]`, 
                data.nlp, data.newHTML, data.rid);
              }
              break;
            }
            case "delete":{
              if (!data.value) {
                return;
              }
              this._replaceInEditor(" ",data.value);
              break;
            }
            case "insertScript":{
              let sId = getNonce();
              let comment = data.new.replace("sid-placeholder", sId);
              console.log(comment);
              this._replaceInEditor(comment, data.old);
              this.log(CodePanel.userId, "insert", "insert js script to db", "[JSScript] "+data.nlp, "", sId);
            }
            case "createjs":{
              if (!data.old || !data.new || !data.event || !data.name) {
                return;
              }
              let sId = getNonce();
              if(data.script){
                this._replaceInEditor(data.new, data.old, "function "+data.name+"{\n //"+data.script+"\n}",sId);
                this.log(CodePanel.userId, "insert", "insert js with name: "+data.name+" and function: "+data.script, "[JSScript] "+data.script, "", sId);
              }
              else{
                this._replaceInEditor(data.new, data.old);
              }
              if(data.nlp && data.script){
                console.log("append");
                this.appendScript(CodePanel.userId, "appendJS", `append action listener ${data.event}=${data.name} (${sId}), where ${data.name} is a function that ${data.script}`, 
                data.new, data.rid, sId)
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
              this.log(CodePanel.userId, "reset", `Reset element with label [${data.nlp}] back by ${data.step} step(s); from #${data.oldId}# to #${data.newId}#`, data.nlp, data.new, data.rid);
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
              console.log(ids);
              for (var i = 0; i < ids.length; i++) {
                console.log("delete")
                this.deleteLog(ids[i]);
              }
            }
          }
        });
      }
      
      log(userId, event, details, label, code, rid, madeFrom){
        console.log(madeFrom);
        fetch(URL+"/db/insertLog", {
          method: 'POST', 
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({userId: userId, event:event, details:details, label:label, code:code, rid:rid, madeFrom:madeFrom?madeFrom:""})
        })
      }
      
      appendScript(userId, event, details, code, rid, script){
        fetch(URL+"/db/appendScript", {
          method: 'POST', 
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({userId: userId, code:code, event: event, details:details, rid:rid, script:script})
        })
      }
      
      logGroup(userId, event, label, member, rid){
        fetch(URL+"/db/insertGroup", {
          method: 'POST', 
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({userId: userId, event:event, label:label, member:member, rId:rid})
        })
      }
      
      updateCode(userId, event, details, code, rid){
        fetch(URL+"/db/updateCode", {
          method: 'POST',
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({userId: userId, event:event, details:details, code:code, rid:rid})
        });
      }
      
      completeLogs(userId, inserted){
        fetch(URL+"/db/completeLog", {
          method: 'POST', 
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({userId: userId, inserted:inserted})
        })
      }
      
      editGroup(userId, member, rId){
        fetch(URL+"/db/editGroupLog", {
          method: 'POST', 
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({userId: userId, member:member, rId:rId})
        })
      }
      
      completeJSLogs(userId, inserted){
        console.log("completeJSLogs");
        fetch(URL+"/db/completeJSLog", {
          method: 'POST', 
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({userId: userId, inserted:inserted})
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
              
              //parse newDoc into an html document
              const dom = new jsdom.JSDOM(text);
              let html = dom.window.document.querySelector("html").outerHTML;
              let newDoc = html;
              if(Array.isArray(oldText)){
                for(let i = 0; i<oldText.length; i++){
                  newDoc = newDoc.replace(oldText[i], newText[i]);
                }
              }
              else{
                newDoc = html.replace(oldText, newText);
              }
              console.log(newDoc)
              
              var firstLine = editor.document.lineAt(0);
              var lastLine = editor.document.lineAt(editor.document.lineCount - 1);
              var textRange = new vscode.Range(firstLine.range.start, lastLine.range.end);
              
              var range = new vscode.Range(pos, pos);
              editor.edit(editBuilder => {
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
        const chatBotUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "chatbot.css"));
        
        const html2canvas = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "html2canvas.min.js"));
        
        const cursorIcon = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media/icons", "cursor.png"));
        const groupIcon = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media/icons", "group.webp"));
        const selectIcon = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media/icons", "selectw.png"));
        const inlineIcon = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media/icons", "inlineIcon.png"));
        const dragIcon = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media/icons", "move.png"));
        const showIcon = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media/icons", "text.png"));
        const resizeIcon = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media/icons", "resize.png"));
        const deleteIcon = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media/icons", "delete.png"));
        const jsIcon = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media/icons", "js.png"));
        const historyIcon = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media/icons", "history.png"));
        const saveIcon = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media/icons", "save.png"));

        const LoadingIcon = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media/icons", "loading.gif"));
        
        const nonce = getNonce();
        
        CodePanel.filePath = vscode.window.activeTextEditor.document.fileName;
        
        const file = fs.readFileSync(CodePanel.filePath, "utf8");
        const jsFile = fs.readFileSync(path.join(__dirname, "media","webview.js"), "utf8");
        console.log(CodePanel.userId);
        CodePanel.nonce = nonce;
        var html;
        html = 
        `
        <head>
        <meta charset="UTF-8">
        <script class="ignore" src="https://code.jquery.com/jquery-2.2.4.min.js" integrity="sha256-BbhdlvQf/xTY9gja0Dq3HiwQF8LaCRTXxZKRutelT44=" crossorigin="anonymous"></script>
        </head>
        <div class="navbar" id="navbar">
        &nbsp; 
        <img class="icon" id="icon-none" title="none" src="${cursorIcon}"/>
        &nbsp; 
        <img class="icon" id="icon-insert" title="insert elements"  src="${selectIcon}"/>
        <img class="icon" id="icon-save" title="add or update elements" src="${saveIcon}"/>
        <img class="icon" id="icon-js" title="add event listeners and add or update scripts" src="${jsIcon}"/>
        <img class="icon" id="icon-group" title="groups tool" src="${groupIcon}"/>
        &nbsp; 
        <img class="icon" id="icon-drag" title="drag elements"  src="${dragIcon}"/>
        <img class="icon" id="icon-resize" title="resize elements" src="${resizeIcon}"/>
        
        <!--<img class="icon" id="icon-edit" title="edit attributes" style="display:none;" src="${showIcon}"/>-->
        &nbsp; 
        <img class="icon" id="icon-history" title="history viewer" src="${historyIcon}"/>
        &nbsp; 
        <img class="icon" id="icon-delete" title="delete tool" src="${deleteIcon}"/>
        <!--<img class="icon" id="icon-script" title="add nlp to scripts" src="${jsIcon}"/>-->
        </div>
        
        <button class="openbtn" id="openbtn">&#9776;</button>
        <div class="sidePanel" id="sidePanel">
        <div class="sidePanel-header">
        <span class="help" id="help">?</span>
          <span class="reload" id="reload">&#x21bb;</span>
          <a href="javascript:void(0)" class="closebtn">&times;</a>
          <h1 id="sidePanel-title">&nbsp;&nbsp; History </h1>
          <hr/>
          </div>
          <div class="sidePanelLog" id="sidePanelLog"></div>
        </div>

        `+file.toString()+` 

        <link href="${stylesResetUri}" rel="stylesheet">
        <link href="${chatBotUri}" rel="stylesheet">
        <script class="ignore" src="${chatBotSrc}"></script>
        <script class="ignore" src="${html2canvas}"></script>
        <script class="ignore" src="https://dragselect.com/v2/ds.min.js"></script>
        <script class="ignore" nonce="${nonce}">
        const LoadingIcon = "${LoadingIcon}";
        const USERID = "${CodePanel.userId}";
        console.log("userid"+USERID);
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