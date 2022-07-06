// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const CodePanel = require('./CodePanel');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
* @param {vscode.ExtensionContext} context
*/
function activate(context) {
	
	console.log('Extension is activated');
	
	// create a command called visual.openVisual
	let openVisual = vscode.commands.registerCommand('visual.openVisual', function () {
		// The code you place here will be executed every time your command is executed
		vscode.window.showInformationMessage('Working Like Crazy to open Webview Please Wait...');
		CodePanel.createOrShow(context.extensionUri, vscode.window.activeTextEditor.document.fileName);
		//vscode.window.showInformationMessage('Hello World from copilot_plus_plus!');
	}
	);
	
	context.subscriptions.push(openVisual);
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
