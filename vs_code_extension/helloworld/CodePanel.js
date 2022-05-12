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
    var child2 = body.children[1];
    //print the child2's text seperated by <br> and joined by " | "
    var text = child2.innerHTML.split("<br>").join(" | ");

    vscode.window.showInformationMessage(text);
  }

   _getHtmlForWebview(webview) {
    // // And the uri we use to load this script in the webview
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out/compiled", "HelloWorld.js")
    );

    const stylesResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
    );

    // // Use a nonce to only allow specific scripts to be run
    const nonce = getNonce();
    
    //Read from a html file and parse the content into a string
    //Read from a file
    //Get the file path for d3_example.html

    //join the current file path with test/d3_example.html
    const filePath = path.join(__dirname,'test', 'd3_example.html');
    //Read the file
    const file = fs.readFileSync(filePath, "utf8");
    //Parse the file into a string
    CodePanel.nonce = nonce;
    const html = file.toString()+` <link href="${stylesResetUri}" rel="stylesheet">
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