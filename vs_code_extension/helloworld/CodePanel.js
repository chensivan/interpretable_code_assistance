const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const jsdom = require("jsdom");
//import { getNonce } from "./getNonce";

class CodePanel {
  /**
   * Track the currently panel. Only allow a single panel to exist at a time.
   */
  static currentPanel = undefined;

  static viewType = "code-panel";

  static createOrShow(extensionUri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

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
      column || vscode.ViewColumn.One,
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

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

   async _update() {
    const webview = this._panel.webview;

    this._panel.webview.html = this._getHtmlForWebview(webview);
    webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "onClicked": {
          if (!data.value) {
            return;
          }
          this.handleOnClicked(data.value, data.info);
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

  handleOnClicked(htmlString, infoDiv){
    //convert the html string into a an html element
    const dom = new jsdom.JSDOM(htmlString+infoDiv);
    //print the html element
    var body = dom.window.document.querySelector("body");
    //get the only child of the body
    var child1 = body.children[0];
    var child2 = body.children[1];
    //print the child2's text seperated by <br> and joined by " | "
    

    //check if child1 is a rect
    if(child1.tagName === "RECT"){
      var text = child2.innerHTML.split("<br>").join(" | ");
      vscode.window.showInformationMessage(text);
    }
    else{
      vscode.window.showInformationMessage(htmlString);
    }
  }

  //Print comment to the top of editor
  _printCommentToEditor(comment){
    const file = CodePanel.filePath;

		if (file) {
      var data = fs.readFileSync(file); //read existing contents into data 
    var fd = fs.openSync(file, 'w+');
    var buffer = Buffer.from(`${comment}\n`);

    fs.writeSync(fd, buffer, 0, buffer.length, 0); //write new data
    fs.writeSync(fd, data, 0, data.length, buffer.length); //append old data
      fs.close(fd);
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
      vscode.Uri.joinPath(this._extensionUri, "media", "select.png")
    );

    const dragIcon = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "drag.jpg")
    );

    // // Use a nonce to only allow specific scripts to be run
    const nonce = getNonce();
    
    CodePanel.filePath = vscode.window.activeTextEditor.document.fileName;
    //Read the file
    const file = fs.readFileSync(CodePanel.filePath, "utf8");
    //Parse the file into a string
    CodePanel.nonce = nonce;
    var html = `<div class="navbar">Tools
    <img class="icon" src="${selectIcon}"/>
    <img class="icon" src="${dragIcon}"/>
    </div>`+file.toString()+` <link href="${stylesResetUri}" rel="stylesheet">
    <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    document.addEventListener("click", function(event){
      var tooltip = document.getElementsByClassName("toolTip")[0];
          vscode.postMessage({
            type: 'onClicked',
            value: event.target.outerHTML,
            info: tooltip.outerHTML,
        })
      });
    </script>`;
    return html;//dom.window.document.querySelector("html").innerHTML;
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