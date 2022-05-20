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

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "helloworld" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('helloworld.helloWorld', function () {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from copilot_plus_plus!');
	});

	// create a command called visual.openVisual
	let openVisual = vscode.commands.registerCommand('visual.openVisual', function () {
		// The code you place here will be executed every time your command is executed
		CodePanel.createOrShow(context.extensionUri, vscode.window.activeTextEditor.document.fileName);
		//vscode.window.showInformationMessage('Hello World from copilot_plus_plus!');
	}
	);

	context.subscriptions.push(disposable);
	context.subscriptions.push(openVisual);
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}