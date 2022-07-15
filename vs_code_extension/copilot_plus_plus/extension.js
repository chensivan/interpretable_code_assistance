// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const CodePanel = require('./CodePanel');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

var active = -1;
var parsedData = `{"tag": {"div": 1.0}, "element_childrens": [{"tag": {"innerText": 0.8}, "innerText_text": {"text1": 0.6}}, {"tag":
{"h1": 0.8}, "color": {"blue": 0.6}, "element_childrens": [{"tag": {"innerText": 0.8}, "innerText_text": {"Header":
0.4}}]}, {"tag": {"innerText": 0.8}, "innerText_text": {"text2": 0.6}}]}`
parsedData = JSON.parse(parsedData);

/**
* @param {vscode.ExtensionContext} context
*/
function activate(context) {
	
	console.log('Extension is activated');
	console.log(parsedData);
	
	// create a command called visual.openVisual
	let openVisual = vscode.commands.registerCommand('visual.openVisual', function () {
		// The code you place here will be executed every time your command is executed
		vscode.window.showInformationMessage('Working Like Crazy to open Webview Please Wait...');
		CodePanel.createOrShow(context.extensionUri, vscode.window.activeTextEditor.document.fileName);
		//vscode.window.showInformationMessage('Hello World from copilot_plus_plus!');
	}
	);
	
	context.subscriptions.push(openVisual);

	/*const provider2 = vscode.languages.registerCompletionItemProvider(
		'plaintext',
		{
			provideCompletionItems(document, position) {

				// get all text until the `position` and check if it reads `console.`
				// and if so then complete if `log`, `warn`, and `error`
				console.log("active ", active);
				//console.log("position ", position._line);
				const linePrefix = document.lineAt(position).text.substr(0, position.character);
				console.log(linePrefix)
				active = true;
				if (linePrefix.endsWith('-->') && linePrefix.startsWith('<!--')) {
					//get what is between the <!-- and -->
					const startIdx = linePrefix.indexOf('<!--') + 4;
					const endIdx = linePrefix.indexOf('-->');
					const lineContent = document.lineAt(position).text.substr(startIdx, endIdx - startIdx);
					return [
						new vscode.CompletionItem('\nexample 1>', vscode.CompletionItemKind.Snippet),
						new vscode.CompletionItem('\nexample 2>', vscode.CompletionItemKind.Snippet),
						new vscode.CompletionItem('\nexample 3>', vscode.CompletionItemKind.Snippet),
						new vscode.CompletionItem('\n'+lineContent, vscode.CompletionItemKind.Snippet),
					];
				}

				return undefined;
			}
		},
		'>', '.'
	);*/
	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider('html', new MyCompletionProvider, '>', '.'),
		vscode.languages.registerCompletionItemProvider('html', new SubCompletionProvider, ' '),
	
		vscode.commands.registerCommand("doTheThing", (arg) => {
		  console.log('did the thing!!');
		  console.log(arg);
		  active = 0;
		  //.log(vscode.window.activeTextEditor.document)
		}),

		vscode.commands.registerCommand("subClicked", (arg) => {
		  console.log('subClicked');
		  console.log(arg);
		  active += 1;
		  if (active >= parsedData["element_childrens"].length){
			  active = -1;
		  }
		  //.log(vscode.window.activeTextEditor.document)
		})
	);

	//context.subscriptions.push(provider2);
}

//detects the nlp the user provides, send data to backend 
class MyCompletionProvider{
    provideCompletionItems(document, position, token, context){
		//console.log("position ", position._line);
		const linePrefix = document.lineAt(position).text.substr(0, position.character);
		if (linePrefix.endsWith('-->') && linePrefix.includes('<!--') && linePrefix.indexOf('<!--') < linePrefix.indexOf('-->')) {
					//get what is between the <!-- and -->
					const startIdx = linePrefix.indexOf('<!--') + 4;
					const endIdx = linePrefix.indexOf('-->');
					const lineContent = document.lineAt(position).text.substr(startIdx, endIdx - startIdx);
					//api call with linecontent
					//parse result call function to get list of completion items and return
					//whatever just take the childrens and instert one by one now
					//record the state and use
					const myHTMLCompletionItem = new vscode.CompletionItem('\n'+lineContent, vscode.CompletionItemKind.Snippet);
					myHTMLCompletionItem.command = {
						title: '',
						command: 'doTheThing',
						arguments: [{value: lineContent}],
					};
					active = 0;
					return [
						/*new vscode.CompletionItem('\nexample 1>', vscode.CompletionItemKind.Snippet),
						new vscode.CompletionItem('\nexample 2>', vscode.CompletionItemKind.Snippet),
						new vscode.CompletionItem('\n<!--example 3-->', vscode.CompletionItemKind.Snippet),
						myHTMLCompletionItem,*/
					];
				}

        return new vscode.CompletionList([]);
    }
}

class SubCompletionProvider{
    provideCompletionItems(document, position, token, context){
		if(active >= 0){
		console.log("SubCompletionProvider");
		console.log(active);
		console.log(parsedData["element_childrens"][0]);
		console.log(parsedData["element_childrens"][active]);
		let list = getCompletionList(parsedData["element_childrens"][active])
		console.log(list);
        return new vscode.CompletionList(list);
		}
    }
}

function getCompletionList(data){
	/* `{"tag": {"div": 1.0}, "element_childrens": [{"tag": {"innerText": 0.8}, "innerText_text": {"text1": 0.6}}, {"tag":
{"h1": 0.8}, "color": {"blue": 0.6}, "element_childrens": [{"tag": {"innerText": 0.8}, "innerText_text": {"Header":
0.4}}]}, {"tag": {"innerText": 0.8}, "innerText_text": {"text2": 0.6}}]}`*/
	let options = [];
	if(data.tag.innerText){
		console.log("?");
		//get keys of innerText
		let keys = Object.keys(data.innerText_text);
		for(let i = 0; i < keys.length; i++){
			let key = keys[i];
			console.log(key);
			console.log(key);
			let completionItem = new vscode.CompletionItem("\n"+key, vscode.CompletionItemKind.Snippet);
			completionItem.command = {
				title: '',
				command: 'subClicked',
				arguments: [{value: key}],
			};
			options.push(completionItem);
		}
	}
	else{
	let attrs = Object.keys(data);
	let attrsTxt = "";
	for(let i = 0; i < attrs.length; i++){
		let attr = attrs[i];
		if(attr != "tag" && attr != "innerText_text" && attr != "element_childrens"){
			//
			let best = Object.keys(data[attr])[0];
			attrsTxt += attr+" "+best+", ";
		}
	}
	attrsTxt = attrsTxt ? " with "+attrsTxt.substring(0, attrsTxt.length-2) : attrsTxt;
	console.log("attrsTxt", attrsTxt);
	let keys = Object.keys(data.tag);
	for(let i = 0; i < keys.length; i++){
		let key = keys[i];
		console.log(key);
		console.log(key);
		let completionItem = new vscode.CompletionItem("\n<!-- "+key+attrsTxt+"-->", vscode.CompletionItemKind.Snippet);
		completionItem.command = {
			title: '',
			command: 'subClicked',
			arguments: [{value: key+attrsTxt}],
		};
		options.push(completionItem);
	}
}
	console.log(options);
		return options;
	}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
