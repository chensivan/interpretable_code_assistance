// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const CodePanel = require('./CodePanel');
const SuggestionPanel = require('./SuggestionPanel');
const GroupPanel = require('./EditGroupPanel');
const CommandPanel = require('./CommandPanel');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const URL = "http://127.0.0.1:5000";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

var active = -1;
var parsedData = `{"tag": {"div": 1.0}, "element_childrens": [{"tag": {"innerText": 0.8}, "innerText_text": {"Input": 0.6}}, {"tag":
{"input": 0.8}, "type": {"text": 0.6}, "color": {"blue": 0.6, "black": 0.4}}]}`
parsedData = JSON.parse(parsedData);

/**
* @param {vscode.ExtensionContext} context
*/
function activate(context) {
	
	console.log('Extension is activated');
	
	//console.log(parsedData);
	let openCommandPanel = vscode.commands.registerCommand('visual.openCommandPanel', function () {
		CommandPanel.filePath = vscode.window.activeTextEditor.document.fileName;
		CommandPanel.createOrShow(context.extensionUri, vscode.window.activeTextEditor.document.fileName);
		//vscode.window.showInformationMessage('Hello World from copilot_plus_plus!');
	}
	);
	
	context.subscriptions.push(openCommandPanel);
	
	// create a command called visual.openVisual
	let openVisual = vscode.commands.registerCommand('visual.openVisual', function () {
		// The code you place here will be executed every time your command is executed
		vscode.window.showInformationMessage('Working Like Crazy to open Webview Please Wait...');
		CodePanel.createOrShow(context.extensionUri, vscode.window.activeTextEditor.document.fileName);
		//vscode.window.showInformationMessage('Hello World from copilot_plus_plus!');
	}
	);
	
	context.subscriptions.push(openVisual);
	
	let insertElement = vscode.commands.registerCommand('visual.insertElement', function () {
		const editor = vscode.window.activeTextEditor;
		console.log("Insert Element");
		const selection = editor.selection;
		if (!selection || selection.isEmpty) {
			vscode.window.showInformationMessage('Please select some text to get suggestions');
			return;
		}
		const selectionRange = new vscode.Range(selection.start.line, selection.start.character, selection.end.line, selection.end.character);
		const highlighted = editor.document.getText(selectionRange);
		let trimed = highlighted.trim();
		if(!trimed.startsWith("<!--")){
			vscode.window.showInformationMessage('Please start selection with a natural language prompt');
			return;
		}

		let regex = /<!--\s*rid[ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789]*\s*-->/g;
        let matches = highlighted.match(regex);
        if (matches) {
            vscode.window.showErrorMessage("Part of the group is already inserted. Have to insert as a group.");
			return;
        }
		
		//SuggestionPanel.text = highlighted;	
		let nonce = getNonce();
		//let newText = `<!--rid${nonce}-->\n${highlighted}\n<!--/rid${nonce}-->`;
		//console.log(newText);
		
		if (editor) {
			
			editor.edit(editBuilder => {
				editBuilder.insert(selection.start, `<!--rid${nonce}-->\n`);
				editBuilder.insert(selection.end, `\n<!--/rid${nonce}-->`);
			});
			const startIdx = highlighted.indexOf('<!--') + 4;
			const endIdx = highlighted.indexOf('-->');
			const lineContent = highlighted.substr(startIdx, endIdx - startIdx);
			console.log(lineContent);
			log("user1", "insert", "insert object", lineContent, highlighted, nonce);
		}
		
	}
	);
	
	context.subscriptions.push(insertElement);
	
	
	let openSuggestions = vscode.commands.registerCommand('visual.openSuggestions', function () {
		const editor = vscode.window.activeTextEditor;
		const selection = editor.selection;
		console.log("Open Suggestions");
		if (selection && !selection.isEmpty) {
			const selectionRange = new vscode.Range(selection.start.line, selection.start.character, selection.end.line, selection.end.character);
			let highlighted = editor.document.getText(selectionRange);
			if(highlighted.includes("<!--")){
				highlighted = highlighted.replace("<!--", "");
			  }
			  if(highlighted.includes("-->")){
				highlighted = highlighted.replace("-->", "");
			  }
			SuggestionPanel.text = highlighted;	
			SuggestionPanel.filePath = vscode.window.activeTextEditor.document.fileName;
			SuggestionPanel.createOrShow(context.extensionUri, highlighted);
		}
		else{
			vscode.window.showInformationMessage('Please select some text to get suggestions');
		}
		
	}
	);
	
	context.subscriptions.push(openSuggestions);
	
	let pasteSuggestion = vscode.commands.registerCommand('visual.pasteSuggestion', function(){
		// get the current cursor position
		const editor = vscode.window.activeTextEditor;
		
		if (editor && SuggestionPanel.suggestText) {
			const selection = editor.selection;
			
			editor.edit(editBuilder => {
				editBuilder.insert(selection.active, SuggestionPanel.suggestText);
			});
		}
	}
	);
	
	context.subscriptions.push(pasteSuggestion);
	
	
	let openGroups = vscode.commands.registerCommand('visual.openGroups', function () {
		const editor = vscode.window.activeTextEditor;
		const selection = editor.selection;
		
		console.log("OpenGroups");
		GroupPanel.filePath = vscode.window.activeTextEditor.document.fileName;
		//if (selection && !selection.isEmpty) {
			// const selectionRange = new vscode.Range(selection.start.line, selection.start.character, selection.end.line, selection.end.character);
			// const highlighted = editor.document.getText(selectionRange);
			// console.log(highlighted);
			// GroupPanel.text = highlighted;	
			GroupPanel.createOrShow(context.extensionUri);
		//}
		// else{
		// 	vscode.window.showInformationMessage('Please select some text to get past groups');
		// }
		
	}
	);
	
	context.subscriptions.push(openGroups);
	
	// let saveData = vscode.commands.registerCommand('cpp.saveData', function () {
	// 	console.log("saveData");
	// 	//execute command
	// 	vscode.commands.executeCommand('workbench.action.files.save');
	// 	let results = saveDataInFile(vscode.window.activeTextEditor.document.fileName);
	// 	console.log(results);
	// 	// The code you place here will be executed every time your command is executed
	// 	//CodePanel.createOrShow(context.extensionUri, vscode.window.activeTextEditor.document.fileName);
	// 	//vscode.window.showInformationMessage('Hello World from copilot_plus_plus!');
	// }
	// );
	
	let saveData = vscode.commands.registerCommand('cpp.saveData', async () => {
		console.log("saveData");
		//execute command
		await vscode.commands.executeCommand('workbench.action.files.save');
		let results = saveDataInFile(vscode.window.activeTextEditor.document.fileName);
		console.log(results);
		// The code you place here will be executed every time your command is executed
		//CodePanel.createOrShow(context.extensionUri, vscode.window.activeTextEditor.document.fileName);
		//vscode.window.showInformationMessage('Hello World from copilot_plus_plus!');
	}
	);
	
	context.subscriptions.push(saveData);
	
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
		
		
		function saveDataInFile(fileName){
			const filePath = path.resolve(fileName);
			const fileContent = fs.readFileSync(filePath, 'utf8');
			//console.log(fileContent);
			//Find all "<--rid[stuff]-->" in file
			const regex = /<!--\s*rid[ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789]*\s*-->/g;
			const matches = fileContent.match(regex);
			let results = {};
			if (!matches){
				return "nothing to save";
			}
			
			//loop over matches
			for (let i = 0; i < matches.length; i++) {
				//get rid of <!--rid and -->
				const rid = matches[i].substr(7, matches[i].length - 10);
				//console.log(rid);
				//find <--/ridrid--> in file
				const regex2 = new RegExp("<!--/rid\s*" + rid + "\s*-->", "g");
				const matches2 = fileContent.match(regex2);
				//console.log(matches2);
				//check if there are matches
				if (matches2 != null) {
					//get all text between matches[i] and matches2[0]
					const text = fileContent.substr(fileContent.indexOf(matches[i])+matches[i].length, 
					fileContent.indexOf(matches2[0]) - fileContent.indexOf(matches[i])-matches2[0].length + 1);
					//console.log(text);
					results[rid] = text
				}
			}
			updateCodes("user1", results);
			return results;
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
					/*const myHTMLCompletionItem = new vscode.CompletionItem('\n'+lineContent, vscode.CompletionItemKind.Snippet);
					myHTMLCompletionItem.command = {
						title: '',
						command: 'doTheThing',
						arguments: [{value: lineContent}],
					};*/
					getProbabilities("user1", lineContent).then(function(result){
						console.log(result);
						active = 0;
						console.log("active ", active);
						parsedData = result;
					});
					return [];
				}
				
				return new vscode.CompletionList([]);
			}
		}
		
		class SubCompletionProvider{
			provideCompletionItems(document, position, token, context){
				if(active >= 0){
					console.log("SubCompletionProvider");
					console.log(active);
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
			console.log(data);
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
				console.log("other");
				let attrs = Object.keys(data);
				let attrsTxt = [];
				let tempTxt = [];
				console.log("attrs ", attrs);
				for(let i = 0; i < attrs.length; i++){
					let attr = attrs[i];
					if(attr != "tag" && attr != "innerText_text" && attr != "element_childrens"){
						//
						let results = Object.keys(data[attr]);
						for(let j = 0; j < results.length; j++){
							let best = results[j];
							//let best = results[j];
							/*attrsTxt[j] += attr+" "+best+", ";
							console.log(attrsTxt[j]);*/
							if(attrsTxt.length <= 0){
								tempTxt.push(attr+" "+best+", ");
							}
							else{
								
								for(let k = 0; k < attrsTxt.length; k++){
									tempTxt.push(attrsTxt[k]+attr+" "+best+", ");
								}
								
							}
						}
						//clone tmpTxt
						attrsTxt = tempTxt.slice(0);
						tempTxt = [];
						console.log(attrsTxt);
					}
				}
				console.log(attrsTxt);
				for(let i = 0; i < attrsTxt.length; i++){
					attrsTxt[i] = attrsTxt[i] ? " with "+attrsTxt[i].substring(0, attrsTxt[i].length-2) : attrsTxt[i];
				}
				//attrsTxt = attrsTxt ? " with "+attrsTxt.substring(0, attrsTxt.length-2) : attrsTxt;
				console.log("attrsTxt", attrsTxt);
				let keys = Object.keys(data.tag);
				for(let i = 0; i < keys.length; i++){
					let key = keys[i];
					console.log(key);
					console.log(key);
					for(let a = 0; a < attrsTxt.length; a++){
						let completionItem = new vscode.CompletionItem("\n<!-- "+key+attrsTxt[a]+"-->", vscode.CompletionItemKind.Snippet);
						completionItem.command = {
							title: '',
							command: 'subClicked',
							arguments: [{value: key+attrsTxt[a]}],
						};
						options.push(completionItem);
					}
				}
			}
			console.log(options);
			return options;
		}
		function log(userId, event, details, label, code, rid, madeFrom){
			console.log(madeFrom);
			fetch(URL+"/db/insertLog", {
				method: 'POST', 
				headers: {"Content-Type": "application/json"},
				body: JSON.stringify({userId: userId, event:event, details:details, label:label, code:code, rid:rid, madeFrom:madeFrom?madeFrom:""})
			})
		}
		function updateCodes(userId, elements){
			fetch(URL+"/db/updateCodes", {
				method: 'POST', 
				headers: {"Content-Type": "application/json"},
				body: JSON.stringify({userId: userId, elements:elements})
			})
		}
		function getProbabilities(userId, nlp) {
			return new Promise((resolve, reject) => {
				fetch(URL + "/db/getProbabilities", {
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
			for (let i = 0; i < 10; i++) {
				text += possible.charAt(Math.floor(Math.random() * possible.length));
			}
			return text;
		}
		
		// this method is called when your extension is deactivated
		function deactivate() {}
		
		module.exports = {
			activate,
			deactivate
		}
		