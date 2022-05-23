const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const jsdom = require("jsdom");
const fetch = require('node-fetch');

//import { getNonce } from "./getNonce";

class CodePanel {
  /**
  * Track the currently panel. Only allow a single panel to exist at a time.
  */
  static currentPanel = undefined;
  
  static viewType = "code-panel";
  
  static createOrShow(extensionUri) {
    const column = vscode.ViewColumn.Two;/*vscode.window.activeTextEditor
    ? vscode.window.activeTextEditor.viewColumn
    : undefined;*/
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
      CodePanel.currentPanel = new CodePanel(panel, extensionUri);
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
      webview.onDidReceiveMessage(async (data) => {
        switch (data.type) {
          case "onClicked": {
            if (!data.value) {
              return;
            }
            this.handleOnClicked(data.value);
                break;
                
              }
              case "passPosition":{
                if (!data.value) {
                  return;
                }
                var allNotNull = data.value.every(function(i) { return i !== null; });
                if (allNotNull){
                  var comment = this.generateComment(data.value, data.info);
                  this._printCommentToEditor(comment);
                }
                break;
              }
              case "onInput": {
                if (!data.value) {
                  return;
                } 
                this.callParaphraseAPI(data.value);
                break;
              }
              case "onInsert": {
                if (!data.value) {
                  return;
                }
                var comment = "// "+data.value + "\n//"+data.style
                this._printCommentToEditor(comment);
                break;
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
        
        callParaphraseAPI(input){
          fetch("http://127.0.0.1:5000/paraphrase", {
          method: 'POST', 
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({text: input}) 
        })
        .then(ret => ret.json())
        .then(result => {
          this._printCommentToEditor("// "+result.paraphrased_text+"");
        });
      }
      
      handleOnClicked(htmlString){
        vscode.window.showInformationMessage(htmlString);
      }
      
      // Generate comment for printing to the editor
      generateComment(position, info){
        return "// Move the <"+ info + "> from (" + position[0] + "," + position[1] + ") to (" + position[2] + "," + position[3] + ").";
      };
      //Print comment to the top of editor
      _printCommentToEditor(comment){
        
        var openPath = vscode.Uri.file(CodePanel.filePath);

        if(openPath){

            vscode.workspace.openTextDocument(openPath).then(doc => 
              {
                vscode.window.showTextDocument(doc, vscode.ViewColumn.One).then(editor => 
                  {          
                    var text = editor.document.getText();
                    var index = text.lastIndexOf('</html>');
          
                    if(index > 0){
                      text = text.substring(0, index);
                    }
                    var lineNumber = text.split('\n').length;
                   // var tempString = str.substring(0, index);
                   comment = "<script> \n "+ comment + "\n</script>" 
                    var pos = new vscode.Position(lineNumber-1,0);
                    var pos1 = new vscode.Position(lineNumber-1,comment.length);
                    
                    var range = new vscode.Range(pos1, pos1);
                    // Line added - by having a selection at the same position twice, the cursor jumps there
                    editor.revealRange(range);
                    editor.edit(editBuilder => {
                      editBuilder.insert(pos, comment+"\n");
                    });

                    editor.selections = [new vscode.Selection(pos1,pos1)]; 
                    
                    // And the visible range jumps there too
                    
                    //vscode.commands.executeCommand('workbench.action.closeActiveEditor');
                  });
                });
              }
      }
      
      _getHtmlForWebview(webview) {
        // // And the uri we use to load this script in the webview
        const scriptUri = webview.asWebviewUri(
          vscode.Uri.joinPath(this._extensionUri, "out/compiled", "HelloWorld.js")
          );
          
          const stylesResetUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
            );
            
            const selectIcon = webview.asWebviewUri(
              vscode.Uri.joinPath(this._extensionUri, "media", "selectw.png")
              );
              
              const dragIcon = webview.asWebviewUri(
                vscode.Uri.joinPath(this._extensionUri, "media", "dragw.png")
                );
                
                // // Use a nonce to only allow specific scripts to be run
                const nonce = getNonce();
                
                CodePanel.filePath = vscode.window.activeTextEditor.document.fileName;
                
                //Read the file
                const file = fs.readFileSync(CodePanel.filePath, "utf8");
                // this._printCommentToEditor("//This is not a comment");
                //Parse the file into a string
                CodePanel.nonce = nonce;
                var html = 
                `
                <div class="navbar" id="navbar">Tools
                <img class="icon" id="icon-tip" src="${selectIcon}"/>
                <img class="icon" id="icon-drag" src="${dragIcon}"/>
                <img class="icon" id="icon-insert" src="${selectIcon}"/>
                </div>`+file.toString()+` <link href="${stylesResetUri}" rel="stylesheet">
                <script nonce="${nonce}">

                var mode = 0; // 0: select; 1: drag, 2: draw and insert
                var icons = document.getElementsByClassName('icon');
                document.getElementById("icon-tip").classList.add("selected");
                for (var i = 0; i < icons.length; i++) {
                  icons[i].addEventListener('click', handleSelectIcon);
                }
                // set navbar icon handler
                function handleSelectIcon(event){
                  var icon = event.target;
                  if (icon.id === "icon-tip"){
                    mode = 0; 
                    document.getElementById("icon-tip").classList.add("selected");
                    document.getElementById("icon-drag").classList.remove("selected");
                    document.getElementById("icon-insert").classList.remove("selected");
                    closeInputBox();closeWidget();
                  } else if (icon.id === "icon-drag"){
                    mode = 1;
                    document.getElementById("icon-tip").classList.remove("selected");
                    document.getElementById("icon-drag").classList.add("selected");
                    document.getElementById("icon-insert").classList.remove("selected");
                    closeInputBox();closeWidget();
                  }
                  else if (icon.id === "icon-insert"){
                    mode = 2;
                    document.getElementById("icon-tip").classList.remove("selected");
                    document.getElementById("icon-drag").classList.remove("selected");
                    document.getElementById("icon-insert").classList.add("selected");
                    closeInputBox();closeWidget();
                  }
                }
                
                // show tooltip
                const vscode = acquireVsCodeApi();
                document.addEventListener("click", function(event){
                  if (mode == 0){
                    if (event.target.id !== "inputbox" && event.target.parentElement.id !== "inputbox" 
                    && event.target.id !== "navbar" && event.target.parentElement.id !== "navbar"){
                      createInputBox(event.pageX, event.pageY);
                    }
                    vscode.postMessage({
                      type: 'onClicked',
                      value: event.target.outerHTML
                    })
                  }
                });
                
                function closeInputBox(){
                  var inputBox = document.getElementById("inputbox");
                  if (inputBox){
                    inputBox.parentNode.removeChild(inputBox);
                  }

                  
                }

                function closeWidget(){
                  old = document.getElementById("widget");
      if(old){
        document.body.removeChild(old);
      }
                }
                
                function createInputBox(x, y, style){
                  closeInputBox();
                  inputbox = document.createElement("div");
                  inputbox.style.position = "absolute";
                  inputbox.style.top = y+"px";
                  inputbox.style.left = x+"px";
                  inputbox.style.margin = '0px';
                  inputbox.id = "inputbox";
                  inputbox.innerHTML = "<input type='text' id='inputbox-input'/><button id='inputbox-submit'>Submit</button><button id='inputbox-close'>X</button>";
                  
                  document.body.appendChild(inputbox);
                  
                  var submit = document.getElementById("inputbox-submit");
                  var type;
                  if(mode == 0){
                    type = "onInput";
                  }
                  else if (mode == 2){
                    type = "onInsert";
                  }
                  submit.addEventListener("click", function() {
                    var text = document.getElementById("inputbox-input");
                    if(text.value){
                      vscode.postMessage({
                        type: type,
                        value: text.value,
                        style: style
                      })
                    }
                    else{
                      text.setAttribute("placeholder", "Please enter a value");
                    }
                  });
                  
                  var close = document.getElementById("inputbox-close");
                  close.addEventListener("click", function() {
                    closeInputBox();
                  });
                }
                
                function defineSelector(element){
                  var selector = element.outerHTML;
                  if (element.id !== ''){
                    selector = "#"+element.id;
                  }else if(element.className !== ''){
                    selector = "."+element.className;
                  }
                  return selector;
                }
                
                
                // set drag event for non-svg element
                var divs = document.querySelectorAll('*');
                
                divs.forEach(div => {      
                  div.addEventListener("mousedown", dragStart);
                });
                
                var moving = false;
                var lastX = null, lastY = null;
                var translateX = 0, translateY = 0;
                var div;
                var rectX, rectY;
                
                function dragStart(e) {
                  if (mode == 1){
                    div = e.target;
                    
                    rectX = div.getBoundingClientRect()['x'];
                    rectY = div.getBoundingClientRect()['y'];
                    
                    transformValue = window.getComputedStyle(div).transform;
                    if (transformValue){
                      var matrix = new WebKitCSSMatrix(transformValue);
                      translateX = matrix.m41;
                      translateY = matrix.m42;
                    }
                    
                    div.addEventListener("mousemove", drag);
                    div.addEventListener("mouseup", dragEnd);
                    div.addEventListener('mouseleave', dragEnd);
                    moving = true;
                  }
                  
                }
                
                function drag(e) {
                  if (moving) {
                    if (lastX&&lastY){
                      var pX = e.clientX - lastX;
                      var pY = e.clientY - lastY;
                      translateX += pX;
                      translateY += pY;
                      div.style.transform = "translate(" + translateX + "px, " + translateY + "px)";
                    }
                    lastX = e.clientX;
                    lastY = e.clientY;
                    
                  }
                }
                
                function dragEnd(e) {
                  e.preventDefault();
                  if (moving) {
                    moving = false;
                    var selector = defineSelector(div);
                    vscode.postMessage({
                      type: 'passPosition',
                      value: [rectX, rectY, rectX + translateX, rectY + translateY],
                      info: selector,
                    })
                    
                    lastX = null;
                    lastY = null;
                    
                    translateX = 0;
                    translateY = 0;
                  }
                }

  var widget;
  var x;
  var y;
  var finX;
  var finY;
  var ismousedown = false;
  document.addEventListener("mousedown", function(event) {
    if(mode == 2 && event.target.id !== "inputbox" && event.target.parentElement.id !== "inputbox" && 
    event.target.id !== "navbar" && event.target.parentElement.id !== "navbar"){
      //get element with id widget and remove from body
      closeInputBox();
      closeWidget();

      ismousedown = true;
        x = event.pageX;
        y = event.pageY;
        //create div element
        widget = document.createElement("div");
        widget.style.position = "absolute";
        widget.style.top = y+"px";
        widget.style.left = x+"px";
        widget.classList.add("widget");
        widget.id = "widget";
      //append to body
      document.body.appendChild(widget);
        ismousedown = true;
    }
      });
     document.addEventListener("mousemove", function(event) {
      if (ismousedown) {
        finX = event.pageX;
        finY = event.pageY;
        widget.style.width = finX - x + "px";
        widget.style.height = finY - y + "px";
        widget.style.display = "block";
        widget.style.border = '2px dashed #ccc';
      }
    });
    document.addEventListener("mouseup", function(event) {
      if(ismousedown){
      ismousedown = false;
      var style = "absolute position, position at top "+y+"px, left "+x+"px with width "+(finX-x)+"px and height "+(finY-y)+"px";
      createInputBox(x, finY, style);
      }
    }
);

  function initDraggable(element) {
    element.setAttribute("draggable", "true");
  }
  
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