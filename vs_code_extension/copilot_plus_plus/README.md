# copilot++ README

This is the README for the extension "copilot++". 

## Requirements
### Set up database
connection string to use in mongo compass
```
mongodb+srv://user:user@cluster.menscjh.mongodb.net/test
```
If for some reason it cannot be connected try the connection string <br/>
```
mongodb://user:user@ac-yuhr5lt-shard-00-00.menscjh.mongodb.net:27017,ac-yuhr5lt-shard-00-01.menscjh.mongodb.net:27017,ac-yuhr5lt-shard-00-02.menscjh.mongodb.net:27017/test?replicaSet=atlas-n1yyxs-shard-0&ssl=true&authSource=admin
```
Right now it is a free cluster using my private email, so if you guys want to change the db just change the mongo connection string in the backend/app.js file. <br/>
### Set up the Backend
```
cd backend
pip install
flask run
```
### Set up the Frontend
```
cd vs_code_extension/copilot_plus_plus
npm install
````

Press `F5` to open a new window with your extension loaded. Make sure your vscode directory is in the `copilot_plus_plus` directory. To reload the changes made to the extension press the Restart icon in the toolbar. An extension development host will be opened. Go to that window to do testing with the extension.

### Starting a test
Open a file with a .html extension or by pressing (`Ctrl+Shift+P` or `Cmd+Shift+P` on Mac) and use the command `openVisual`.
A webview will open displaying the content of the .html file.
To see the other functionalities you can right click in the editor, find the commands after pressing `Ctrl+Shift+P`, or opening the command `Open Command Panel` to get a webview will the list of commands the extension offer other than `Open Visual`.


## Features
### Storing code into the DB
Using the command `insert element` you can store a chunk of code as an element in the db. A comment wrapper will be generated and saving the document using `save data` command or `Ctrl+s` shortcut will save the changes between each wrapper to the db as well. 
### Groupings 
Using the command `open groups` you will see a Groups page. You can view all the existing groups in the db in the views tab, and click on any group to see the elements in each. You can make changes such as changing the order, deleting elements, and adding element (hightlight chunk in editor and clicking add button in webview). In the add tab, you can add a new group but enter a group label and adding wanted elements to the group. To use search, hightlight the wanted label in the editor then click on the search tab to get a list of similar groups. The user can click on the groups's elements and insert it to the cursor's position in the active editor.

*Note the groups webview is linked to one editor page. If you move to another .html page make sure to reopen the group webview.

### Comment Suggestion
Using the `open suggestions` command while highlighting the label in the editor, you will see a suggestions webview. The suggestions webview will first (if the label is long) break the label down, then try to find suggestions for comment for each chunk. The suggestions are generated from a probability based algorithm on the user's code in the db. Clicking on one of the suggested results will insert the comment into the editor to where the user's cursor is.

*Note the suggestion webview is linked to one editor page. If you move to another .html page make sure to reopen the suggestion webview.

### 
### Direct manipulations (Doesn't work right now)
It doesn't work right now, because we aren't really using it anymore. The `logs` column used to store history logs, now it just store by elements. Also there used to be a div wrapper around each stored elements, but it's removed now. Which is why is doesn't work right now.<br/> 
Using `open visual` you will be able to directly manipulate the html elements, doing stuff like drag, resize, insert, delete, etc.. You can see the history of the actions, make groups, etc.. You will be able to see your html code in the vscode webview like you would in a browser. (This part still works)

