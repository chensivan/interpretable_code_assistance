
const vscode = acquireVsCodeApi();
const URL = "http://127.0.0.1:5000";

//----------initiate side panel button------------//
reloadSidePanel();

document.getElementsByClassName("closebtn")[0].addEventListener("click", function(){
  document.getElementById("sidePanel").style.display = "none";
});


document.getElementById("openbtn").addEventListener("click", function(){
  document.getElementById("sidePanel").style.display = "block";
});

document.getElementById("reload").addEventListener("click", function(){
  emptySidePanel();
  if (mode == iconDic["icon-group"]){
    reloadGroupPanel();
    groupStart = 0;
    //TODO: refactor this (should not be here :)
    if (document.getElementById("submitTool-group")){
      document.getElementById("submitTool-group").parentNode.removeChild(document.getElementById("submitTool-group"));
    }
    if (document.getElementById("editTool-group")){
      document.getElementById("editTool-group").parentNode.removeChild(document.getElementById("editTool-group"));
    }
  }else{
    reloadSidePanel();
  }
  closeGroupBox();
});

document.getElementById("help").addEventListener("mouseover", function(event){
  if(!document.getElementById("help-text")){
  let x = event.clientX;
  let y = event.clientY+20;

  let div = document.createElement("div");
  div.style = "position: absolute; top: "+y+"px; background: white; border: 1px solid black; padding: 10px; z-index: 9999;";
  div.id = "sidePanel-helper"
  div.style.left = x - 150 + "px";
  div.style.width = "200px";
  console.log(groupStart)
  if(mode == iconDic["icon-group"] && groupStart == 0){
    div.innerHTML = `
    Click on an element to create a grouping.<br/>
    Click on the grouping and click "Details" to edit it.`;
  }
  else if(mode == iconDic["icon-group"] && groupStart == 1){
    div.innerHTML = `
    Click on an element to add to group.<br/>
    Click on an element and click "Delete" to remove.<br/>
    Add scripts by entering the script sid.<br/>
    Enter a label for this group and click "Create" to create the group`;
  }
  else if(mode == iconDic["icon-group"] && groupStart == 2){
    div.innerHTML = `
    Click on an element to add to group.<br/>
    Click on an element and click "Delete" to remove.<br/>
    Add scripts by entering the script sid.<br/>
    Click "confirm" to save the group`;
  }
  else if(mode == iconDic["icon-history"]){
    div.innerHTML = `
    Click on an element to see its history.<br/>
    To view the element in the log's state, click on the log and then "Preview"`;
  }
  else if(mode == iconDic["icon-js"]){
    div.innerHTML = `
    List of Scripts.<br/>
    New Scripts can be added by entering a label and clicking "Save"<br/>
    Changes to an existing script can be made by clicking "Update"<br/>`;
  }
  else if(mode == iconDic["icon-insert"] && InsertState == 1){
    div.innerHTML = `
    Insert element from Database by clicking on one of the logs<br/>
    Insert element by hand or copilot by clicking on their options`;
  }
  else if(mode == iconDic["icon-insert"] && InsertState == 2){
    div.innerHTML = `
    Add remaining elements of the group by clicking on "Insert Missing" for the respective group<br/>
    To ignore click "Reject"`;
  }
  else{
    div.style.left = x - 70 + "px";
    div.style.width = "150px";
    div.innerHTML = "List of Logs";
  }
  document.body.appendChild(div);
}
});

document.getElementById("help").addEventListener("mouseleave", function(event){
  if(document.getElementById("sidePanel-helper")){
  document.body.removeChild(document.getElementById("sidePanel-helper"));
  }
});

//---------------------------tool bar functions---------------------------------//
const iconDic = {
  "icon-save": 0, 
  "icon-drag": 1, 
  "icon-insert": 2, 
  //"icon-edit": 3, 
  "icon-resize": 4, 
  "icon-delete": 5, 
  "icon-js": 6, 
  "icon-history": 7, 
  "icon-group": 8, 
  "icon-none": 9, 
  //"icon-script": 10
};

const iconIds = Object.keys(iconDic);

const icons = document.getElementsByClassName('icon');

var mode = iconDic["icon-none"];
document.getElementById("icon-none").classList.add("selected");

for (var i = 0; i < icons.length; i++) {
  icons[i].addEventListener('click', handleSelectedIcon);
}

// set tool bar icon handler
function handleSelectedIcon(event){
  var icon = event.target;
  
  if (iconIds.includes(icon.id)){
    mode = iconDic[icon.id]; 
    toggleSelectedIcon(icon.id);
    if(mode == iconDic["icon-history"]){
      var sidePanel = document.getElementById("sidePanelLog");
      if (sidePanel){
        removeAllChildNodes(sidePanel);
        sidePanel.appendChild(document.createTextNode("Click on an element to see its history."));
      }
    }
    else if(mode == iconDic["icon-group"]){
      reloadGroupPanel();
    }
    else if(mode == iconDic["icon-js"]){
      let scripts = document.getElementsByTagName("script");
      scripts = Array.prototype.slice.call( scripts )
      scriptsCleaned = []
      scripts.forEach(function(script){
        if (!script.classList.contains("ignore") && script.id !== "_vscodeApiScript"){
          scriptsCleaned.push(script);
        }
      });
      console.log(scriptsCleaned)
      createSidePanelForScripts(scriptsCleaned);
    }
    else{
      reloadSidePanel();
    }
    
  }
}

function toggleSelectedIcon(iconName){
  iconIds.map(name => {
    document.getElementById(name).classList.remove("selected");
    if(name === iconName){
      document.getElementById(name).classList.add("selected");
    }
  });
  closeInputBox();
  closeWidget();
  closeBorder(oldElmnt); 
  closeChatBox();
  closeGroupBox();
}

//---------------------------(temp)group---------------------------------//
let member = {};
let groupStart = 0; // 0: 
let currGroupRid;

function addScriptToGroupBySid(){
  document.getElementById("submit-script").addEventListener("click", function(){
    let scriptSid = document.getElementById("inputbox-script-sid").value; 
    let scripts = document.getElementsByTagName("script");
    let script = null;
    for(let i = 0; i < scripts.length; i++){
      if (scripts[i].getAttribute("sid") === scriptSid){
        script = scripts[i];
        break;
      }
    }
    if (script){
      logSelectedElement(scriptSid, script);
      script.classList.add("group-border");
    }
  });
}

function createGroupSelector(ele){
  console.log("createGroupSelector");
  let sidePanel = document.getElementById("sidePanel");
  if (groupStart == 0){
    let members = document.getElementsByClassName("group-border");
    for(let i = 0; i < members.length; i++){
      members.classList.remove("group-border");
      if(members.classList.length == 0){
        members.removeAttribute("class");
      }
    }
    emptySidePanel();
  }else if (groupStart == 2){
    if (!document.getElementById("editTool-group")){
      let createBtn = document.createElement("div");
      createBtn.id = "editTool-group";
      createBtn.innerHTML = `
      <br/>
      <div style="margin-left:10px">
      Add Script: <br/>
      <input type='text' id='inputbox-script-sid' style="width:50%" placeholder="sid of script"/><button id='submit-script'>Submit</button>
      <br/><br/><br/>
      <button id='edit-group'>Confirm</button><button id='back-group'>Back</button>
      </div>`;
      let sidePanelLog = document.getElementById("sidePanelLog");
      sidePanelLog.insertBefore(createBtn, sidePanelLog.firstChild);
        

      let back = document.getElementById("back-group");
      back.addEventListener("click", function(){
        reloadGroupPanel();
        groupStart = 0;
        //TODO: refactor this (should not be here :)
        if (document.getElementById("submitTool-group")){
          document.getElementById("submitTool-group").parentNode.removeChild(document.getElementById("submitTool-group"));
        }
        if (document.getElementById("editTool-group")){
          document.getElementById("editTool-group").parentNode.removeChild(document.getElementById("editTool-group"));
        }
      });
      
      addScriptToGroupBySid();
      editGrouping(createBtn);

    }
  }
  if (!ele.classList.contains("group-border")){
    let elmntRid = getRID(ele);
    if (elmntRid){
      editSidePanelTitle("Create Group");
      logSelectedElement(elmntRid, ele);
      ele.classList.add('group-border');
      ele.style.border = '2px dashed #ccc';
      if (groupStart == 0 && !document.getElementById("submitTool-group")){
        let createBtn = document.createElement("div");
        createBtn.id = "submitTool-group";
        createBtn.innerHTML = `
        <br/>
        <div style="margin-left:10px">
        Add Script: <br/>
        <input type='text' id='inputbox-script-sid' style="width:50%" placeholder="sid of script"/><button id='submit-script'>Submit</button>
        <br/><br/><br/>
        <input type='text' id='inputbox-group' placeholder="Group Label"/><button id='submit-group'>Create</button>
        </div>`;
        let sidePanelLog = document.getElementById("sidePanelLog");
        sidePanelLog.insertBefore(createBtn, sidePanelLog.firstChild);
        
        addScriptToGroupBySid();
        submitGrouping(createBtn);
      }
      groupStart = 1;
    }
  }else{
    vscode.postMessage({
      type: "onGroup",
      success: false,
      label: '',
      member: '',
      message: 'Element cannot be selected: No RID matched.',
    });
  }
  
}

function logSelectedElement(elmntRid, ele){
  getLogByRID(USERID, elmntRid).then(data => {
    if (data.length > 0){
      createSidePanel([data[0]], 1, true, elmntRid);
      
      member[data[0].rId] = data[0].label;
      
      let hstBlock = document.getElementsByClassName("hstBlock-"+elmntRid)[0];
      if (hstBlock){
        hstBlock.addEventListener('click', function(e){
          let targetHst = e.target;
          while (!targetHst.classList.contains("hstBlock")){
            targetHst = targetHst.parentElement;
          }
          focusHstBlock(targetHst);
          let slides = document.getElementsByClassName('actionBtn');
          for (let j = 0; j < slides.length; j++) {
            slides[j].parentNode.style.position = 'null';
            slides[j].parentNode.removeChild(slides[j]);
          }
          let actionBtn = document.createElement('div');
          actionBtn.classList.add('actionBtn');
          actionBtn.style = 'position: absolute; top: 0; right: 0; display: inline-block';
          targetHst.style.position = 'relative';
          targetHst.appendChild(actionBtn);
          actionBtn.innerHTML =  "<button id='deleteBtn'>Delete</button>";
          if (document.getElementById('deleteBtn')){
            document.getElementById('deleteBtn').addEventListener('click', function() {
              targetHst.parentNode.removeChild(targetHst);
              if (ele){
                ele.classList.remove('group-border');
                ele.style.border = null;
                if(ele.classList.length == 0){
                  ele.removeAttribute("class");
                }
              }
              if (elmntRid in member){
                delete member[elmntRid];
              }
              
            });
          }
          
        });
      }
      
    }else{
      //TODO: add on button
      vscode.postMessage({
        type: "onGroup",
        success: false,
        label: '',
        member: '',
        message: 'Element cannot be selected: No history stored.',
      });
    }
  });
}

function editGrouping(createBtn){
  let editBtn = document.getElementById('edit-group');
  editBtn.addEventListener("click", function(){
    vscode.postMessage({
      type: "onEditGroup",
      rId: currGroupRid,
      member: member,
    })
    reloadGroupPanel();
    closeGroupBox();
    groupStart = 0;
    currGroupRid = null;
    member = {};
    createBtn.parentNode.removeChild(createBtn);
  })
}

function submitGrouping(createBtn){
  let groupBtn = document.getElementById('submit-group');
  groupBtn.addEventListener('click', function(){
    let text = document.getElementById("inputbox-group");
    let members = document.getElementsByClassName("group-border");
    console.log("members");
    console.log(members[0].outerHTML);
    let success = true;
    if (members.length == 0){
      success = false;
    }
    if (text.value){
      vscode.postMessage({
        type: "onGroup",
        success: success,
        label: text.value,
        member: member, 
        message: 'Please select template elements.',
      })
    }else{
      //alert
      success = false;
      vscode.postMessage({
        type: "onGroup",
        success: success,
        label: '',
        member: '',
        message: 'Please input the label of the template.',
      })
    }
    reloadGroupPanel();
    closeGroupBox();
    groupStart = 0;
    createBtn.parentNode.removeChild(createBtn);
  });
}

//---------------------------variables for attribute editor tool---------------------------------//
var widget;
var widgetInitX;
var widgetInitY;
var widgetFinX;
var widgetFinY;
var ismousedown = false;
//---------------------------variables for resize tool---------------------------------//
var resizeElmnt;
var dir;
var resizeAble = false; var onResize = false;
var rect;
var startWidth, startHeight, startX, startY;
var oldElmnt;
//---------------------------attributes for drag tool---------------------------------//
var moving = false;
var lastX = null, lastY = null;
var translateX = 0, translateY = 0;
var div, selector;
var rectX, rectY;

//---------------------------click handler---------------------------------//
function findAncestor (el, cls) {
  var temp = el;
  while (temp && temp.id !== cls) {
    temp = temp.parentElement;
    
  };
  if (!temp){
    return false;
  }else if (temp.id === cls){
    return true;
  }
}

document.addEventListener("click", function(event){
  if (!findAncestor(event.target, "inputbox")
  && !findAncestor(event.target, "navbar")
  && (!event.target.parentElement || !event.target.parentElement.classList.contains("autocomplete-items"))
  && (event.target.tagName !== "HTML") 
  && event.target.id !== "chatBotOuter" && (!event.target.parentElement ||event.target.parentElement.id !== "chatBotOuter")
  && event.target.id !== "inputbox-event"
  && !findAncestor(event.target, "sidePanel")
  && event.target.id !== "openbtn"
  && event.target.id !== "hstBlock"){
    if (mode == iconDic["icon-save"]){
      createEditBox(event.pageX, event.pageY, event.target);
    }
    else if (mode == iconDic["icon-delete"] && event.target.tagName !== "BODY"){
      createDeleteBox(event.pageX, event.pageY, event.target)
    }
    else if (mode == iconDic["icon-resize"] && event.target.tagName !== "BODY"){
      closeBorder(oldElmnt);
      var target = event.target;
      oldElmnt = getElement(target).outerHTML;
      target.classList.add('border');
      target.style.border = '2px dashed #ccc';
      resizeStart();
    }
    else if (mode == iconDic["icon-edit"]){
      createInputBoxAttr(event.pageX, event.pageY, event.target)
    }
    else if(mode == iconDic["icon-js"]){
      createInputBoxJs(event.pageX, event.pageY, event.target)
    }
    else if (mode == iconDic["icon-history"]){
      logElementHistory(event.target);
    }
    else if (mode == iconDic["icon-group"]){
      createGroupSelector(event.target);
    }
  }
  else if (event.target.tagName !== "HTML"){
    closeBorder(oldElmnt);
  }
});

//---------------------------mousedown handler---------------------------------//
document.addEventListener("mousedown", function(event) {
  if(mode == iconDic["icon-insert"] && 
  !findAncestor(event.target, "sidePanel")
  && !findAncestor(event.target, "inputbox")
  && !findAncestor(event.target, "navbar")){
    closeInputBox();
    closeWidget();
    
    ismousedown = true;
    widgetInitX = event.pageX;
    widgetInitY = event.pageY;
    //create div element
    widget = document.createElement("div");
    widget.style.position = "absolute";
    widget.style.top = widgetInitY+"px";
    widget.style.left = widgetInitX+"px";
    widget.classList.add("widget");
    widget.id = "widget";
    document.body.appendChild(widget);
    ismousedown = true;
  }
});

//---------------------------mousemove handler---------------------------------//
document.addEventListener("mousemove", function(event) {
  if (ismousedown) {
    widgetFinX = event.pageX;
    widgetFinY = event.pageY;
    widget.style.width = widgetFinX - widgetInitX + "px";
    widget.style.height = widgetFinY - widgetInitY + "px";
    widget.style.display = "block";
    widget.style.border = '2px dashed #ccc';
  }
});

//---------------------------mouseup handler---------------------------------//
document.addEventListener("mouseup", function(event) {
  if(ismousedown && widgetInitX !== widgetFinX && widgetInitY !== widgetFinY){
    ismousedown = false;
    let style = "position:absolute;top:"+widgetInitY+"px;left: "+widgetInitX+"px;width: "+(widgetFinX - widgetInitX)+"px;height: "+(widgetFinY - widgetInitY)+"px;";
    createInputBox(widgetInitX, widgetFinY, style);
  }
});

//---------------------------resize tool---------------------------------//
function resizeStart(){
  resizeElmnt = document.getElementsByClassName("border")[0];
  resizeElmnt.onDragStart = function() { return false; };
  resizeElmnt.addEventListener('mousemove', doResize, false);
}
//---------------------------mousedown handler for resize---------------------------------//
function initResize(e) {
  if (mode == iconDic["icon-resize"] && resizeAble && resizeElmnt && dir != "" && resizeElmnt.id !== "navbar" && resizeElmnt.parentElement.id !== "navbar"){
    e.preventDefault();
    startX = e.clientX;
    startY = e.clientY;
    startWidth = rect.width;
    startHeight = rect.height;
    onResize = true;
    resizeAble = false;
  }
}
//---------------------------mousemove handler for resize---------------------------------//
function doResize(e){
  let delta = 5;
  
  if (!onResize && resizeElmnt){
    rect = resizeElmnt.getBoundingClientRect();
    let x = e.clientX - rect.left,  
    y = e.clientY - rect.top,     
    w = rect.right - rect.left,
    h = rect.bottom - rect.top;
    
    dir = "";
    if( y > h - delta){
      dir += "s";
    }
    if(x > w - delta){
      dir += "e";
    }         
    
    if(dir.includes("e") || dir.includes("s")){                         
      // if we are hovering at the border area (c is not empty)
      resizeElmnt.style.cursor = dir + "-resize"; // set the according cursor
      resizeAble = true;
    }else{
      resizeElmnt.style.cursor = 'default';
      resizeAble = false;
    }
    resizeElmnt.addEventListener("mousedown",initResize, false);
    resizeElmnt.addEventListener("mouseup", stopResize, false);
  }else if (onResize && resizeElmnt){
    if (dir.includes("e")){
      resizeElmnt.style.width = (startWidth + e.clientX - startX) + 'px';
    }
    if (dir.includes("s")){
      resizeElmnt.style.height = (startHeight + e.clientY - startY) + 'px';
    }
  }
}
//---------------------------mouseup handler for resize---------------------------------//
function stopResize(e){
  if (onResize && mode === iconDic["icon-resize"] && resizeElmnt){
    resizeElmnt.style.cursor = 'default';
    onResize = false;
    resizeAble = false;
    closeBorder(oldElmnt);
    resizeElmnt.removeEventListener('mousemove', doResize, false);
    resizeElmnt.removeEventListener('mouseup', stopResize, false);
    e.returnValue = true;
  }
}


//---------------------------close elements---------------------------------//
function closeById(id){
  let elmnt = document.getElementById(id);
  if (elmnt){
    elmnt.parentElement.removeChild(elmnt);
  }
}

function closeInputBox(){
  closeById("inputbox");
}

function closeWidget(){
  closeById("widget");
}

function closeBorder(ele){
  let old = document.getElementsByClassName("border")[0];
  
  if (old && ele){
    old.style.border = null;
    old.style.cursor = null;
    old.classList.remove("border");
    if(old.classList.length == 0){
      old.removeAttribute("class");
    }
    
    let parent = getElement(old); //This is going to cause a lot of trouble later on :(
    parent.style.width = old.style.width;
    parent.style.height = old.style.height;
    
    vscode.postMessage({
      type: 'onResize',
      new: getElement(old).outerHTML,
      old: ele,
      nlp: getNLP(old),
      size: old.style.width + " wide and "+old.style.height+" height",
      rid: getRID(old)
    })
  }
}

function closeChatBox(){
  closeById("chatBotOuter");
}

function closeGroupBox(){
  const boxes = document.getElementsByClassName("group-border");
  while(boxes.length > 0){
    boxes[0].style.border = null;
    boxes[0].style.cursor = null;
    boxes[0].classList.remove('group-border');
    if(boxes[0].classList.length == 0){
      boxes[0].removeAttribute("class");
    }
  }
  memberRId = [];
  memberLabel = [];
  memberIndex = 0;
}

function emptySidePanel(){
  var sidePanel = document.getElementById("sidePanelLog");
  if (sidePanel){
    removeAllChildNodes(sidePanel);
  }
}

function reloadSidePanel(){
  document.getElementById("sidePanelLog").innerHTML = "";
  showLoading(document.getElementById("sidePanelLog"));
  getLog(USERID).then(data => {
    removeLoading(document.getElementById("sidePanelLog"));
    console.log("Loaded");
    console.log(document.getElementById("sidePanelLog").innerHTML);
    createSidePanel(data, 1, false);
  }
  );
}

function reloadGroupPanel(){
  document.getElementById("sidePanelLog").innerHTML = "";
  showLoading(document.getElementById("sidePanelLog"));
  getGroupLog(USERID).then(data => {
    removeLoading(document.getElementById("sidePanelLog"));
    let members = document.getElementsByClassName("group-border");
    for(let i = 0; i < members.length; i++){
      members.classList.remove("group-border");
      if(members.classList.length == 0){
        members.removeAttribute("class");
      }
    }
    createSidePanel(data, 2, false);
  }
  );
}


//---------------------------create basic box element---------------------------------//
function createBasicBox(x, y){
  let box = document.createElement("div");
  box.style.position = "absolute";
  box.style.top = y+"px";
  box.style.left = x+"px";
  box.style.margin = '0px';
  box.id = "inputbox";
  box.backgroundColor = "white";
  box.style.zIndex = '100';
  return box;
}

var InsertState = 0;
//---------------------------insert tools---------------------------------//
function createInputBox(x, y, style){
  closeInputBox();
  let inputbox = createBasicBox(x, y);
  inputbox.innerHTML = "<input type='text' id='inputbox-input'/><button id='inputbox-submit'>Submit</button><button id='inputbox-close'>X</button>";
  document.body.appendChild(inputbox);
  
  let submit = document.getElementById("inputbox-submit");
  submit.addEventListener("click", function() {
    let text = document.getElementById("inputbox-input");
    if(text.value){
      showLoading(document.getElementById("sidePanelLog"));
      getLogByNLP(USERID, text.value).then(data => {
        let sidePanel = document.getElementById("sidePanelLog");
        removeLoading(sidePanel);
        InsertState = 1;
        if (data.success){
          let length = Math.min(4, data.all.length);
          let logData = data.all.slice(0, length);
          
          let lengthGroup = Math.min(2, data.groups.length);
          let groupData = data.groups.slice(0, lengthGroup);
          createSidePanelForInsert(logData, groupData, text.value, style);
        }
        else{
          createSidePanel([], 1, false);
        }
        
        let declineBtn = document.createElement("button");
        declineBtn.innerHTML = "Create New";
        declineBtn.style.marginLeft = "10px";
        sidePanel.appendChild(declineBtn);
        declineBtn.addEventListener("click", function() {
          let insertOpt = {
            type: "onInsert",
            //success: true,
            value: text.value,
            style: `style="${style}"`,
            opt: 0 // create new
          };
          giveGroupSuggestions(text.value, insertOpt)
        });
        
        let copilotbtn = document.createElement("button");
        copilotbtn.innerHTML = "Create New Using Copilot";
        copilotbtn.style.marginLeft = "10px";
        sidePanel.appendChild(copilotbtn);
        copilotbtn.addEventListener("click", function() {
          let insertOpt = {
            type: "onInsert",
            //success: true,
            value: text.value,
            style: `style="${style}"`,
            opt: 1 // create new using copilot
          };
          giveGroupSuggestions(text.value, insertOpt)
        });
      });
      closeInputBox();
    }
    else{
      text.setAttribute("placeholder", "Please enter a value");
    }
  });
  
  let close = document.getElementById("inputbox-close");
  close.addEventListener("click", function() {
    closeInputBox();
    closeWidget();
  });
}

function giveGroupSuggestions(insertedLabel, insertOpts){
  InsertState = 2;
  let elements = document.getElementsByTagName("*");
  let all = [];
  for (let i = 0; i < elements.length; i++) {
    if (elements[i].hasAttribute("nlp")){
      all.push(elements[i].getAttribute("nlp"));
    }
  }

  showLoading(document.getElementById("sidePanelLog"));
  getSuggestedGroups(USERID, insertedLabel, all).then(data => {
    removeLoading(document.getElementById("sidePanelLog"));
    //display to sidepanel
    if(data.length > 0){
      createSidePanelForSuggestedGroups(data, insertOpts);
    }
    else{
      vscode.postMessage(insertOpts)
      InsertState = 0;
      reloadSidePanel();
    }
  });
  
}
//---------------------------info tool---------------------------------//
function createInfoBox(x, y, element){
  closeInputBox();
  let inputbox = createBasicBox(x, y);
  inputbox.style.backgroundColor = 'white';
  inputbox.style.border = '1px solid black';
  if(element.tagName !== "BODY"){
    inputbox.innerText = element.outerHTML;
  }
  else{
    inputbox.innerText = "document body";
  }
  document.body.appendChild(inputbox);
}


//---------------------------tip tool---------------------------------//
function createEditBox(x, y, element){
  closeInputBox();
  let inputbox = createBasicBox(x, y);
  let parent = getElement(element);
  inputbox.style.border = "1px solid black";
  inputbox.style.backgroundColor = "white";
  if(parent){//Update
    getLogByRID(USERID, getRID(element)).then(data =>{
      if(data.length > 0 && data[0].code !== parent.outerHTML){
        inputbox.innerHTML = `<div id="inputbox-el"></div>
        <br/><button id='inputbox-save'>Update</button><button id='inputbox-close'>X</button>`;
        document.body.appendChild(inputbox);
        let el = document.getElementById("inputbox-el");
        el.innerText = parent.outerHTML;
        let submit = document.getElementById("inputbox-save");
        
        console.log(submit);
        
        submit.addEventListener("click", function(){
          vscode.postMessage({
            type: "onUpdateCode",
            code: parent.outerHTML,
            nlp: getNLP(parent),  
            rid: getRID(parent)
          });
          closeInputBox();
        });
        
        let close = document.getElementById("inputbox-close");
        console.log(close);
        close.addEventListener("click", function(){
          closeInputBox();
        });
        return;
      }
      else{
        inputbox.innerHTML = `No changes to update <button id='inputbox-close'>X</button>`;
        document.body.appendChild(inputbox);
        
        let close = document.getElementById("inputbox-close");
        console.log(close);
        close.addEventListener("click", function(){
          closeInputBox();
        });
      }
    });
    
  }
  else{//Create
    inputbox.innerHTML = `<div id="inputbox-el"></div>
    <br/><input type="text" id='inputbox-text'/><button id='inputbox-save'>Save</button><button id='inputbox-close'>X</button>`;
    document.body.appendChild(inputbox);
    let el = document.getElementById("inputbox-el");
    el.innerText = element.outerHTML;
    let submit = document.getElementById("inputbox-save");
    
    submit.addEventListener("click", function(){
      vscode.postMessage({
        type: "onUpdate",
        code: element.outerHTML,
        nlp: document.getElementById("inputbox-text").value
      });
      closeInputBox();
    });
    
    let close = document.getElementById("inputbox-close");
    console.log(close);
    close.addEventListener("click", function(){
      closeInputBox();
    });
  }
}

//---------------------------delete tool---------------------------------//
function createDeleteBox(x, y, element){
  closeInputBox();
  createInfoBox(x, y, element);
  let button = document.createElement("button");
  button.id = "inputbox-button";
  button.innerText = "delete "+element.tagName;
  button.addEventListener("click", function() {
    vscode.postMessage({
      type: "delete",
      value: getElement(element).outerHTML,
      nlp: getNLP(element),
      rid: getRID(element)
    })
    //remove child from body
    element.parentNode.removeChild(element);
    closeInputBox();
  });
  document.querySelector("#inputbox").appendChild(document.createElement("br"));
  document.querySelector("#inputbox").appendChild(button);
}

//---------------------------event listener tool---------------------------------//
function createInputBoxJs(x, y, element){
  closeInputBox();
  createInfoBox(x, y, element);
  let div = document.createElement("div");
  div.classList.add("autocomplete");
  let event = document.createElement("input");
  event.type = "text";
  event.id = "inputbox-event";
  
  div.appendChild(event);
  autocomplete(event, EVENTS);
  
  event.placeholder = "action event, ex. onclick";
  
  
  let name = document.createElement("input");
  name.id = "inputbox-name";
  name.type = "text";
  name.placeholder = "function name, ex. sendMessage()";
  
  let script = document.createElement("textarea");
  script.id = "inputbox-script";
  script.placeholder = "action, ex. log Message to console.log";
  script.rows = "3";
  
  let submit = document.createElement("button");
  submit.id = "submitButton";
  submit.innerHTML = "Submit";
  
  submit.addEventListener("click", function() {
    let temp = element.cloneNode(true);
    temp.setAttribute(event.value, name.value);
    let tempHTML = getElement(element).outerHTML.replace(element.outerHTML, temp.outerHTML)
    vscode.postMessage({
      type: "createjs",
      old: getElement(element).outerHTML,
      new: tempHTML,
      event: event.value,
      name: name.value,
      script: script.value,
      nlp: getNLP(element),
      rid: getRID(element),
    })
    closeInputBox();
  });
  
  document.querySelector("#inputbox").appendChild(document.createElement("br"));
  document.querySelector("#inputbox").appendChild(div);
  document.querySelector("#inputbox").appendChild(document.createElement("br"));
  document.querySelector("#inputbox").appendChild(name);
  document.querySelector("#inputbox").appendChild(document.createElement("br"));
  document.querySelector("#inputbox").appendChild(script);
  document.querySelector("#inputbox").appendChild(document.createElement("br"));
  document.querySelector("#inputbox").appendChild(submit);
}

//---------------------------chatbot tool---------------------------------//
var chatBotSelector = true;
function createChatBox(){
  let outer = document.createElement("div");
  outer.id = "chatBotOuter";
  document.body.appendChild(outer);
  
  outer.style.position = "absolute";
  outer.style.right = "0px";
  outer.style.top = "0px";
  outer.style.padding = "20px";
  outer.style.width = "300px";
  
  let input = document.createElement("input");
  input.type = "text";
  input.id = "humanInput";
  input.placeholder = "i.e Change the font size";
  outer.appendChild(input);
  input.style = "font-size:14px; border: 1px solid #ddd; width: 250px;";
  
  let chat = document.createElement("div");
  chat.id = "chatBot";
  outer.appendChild(chat);
  
  let indicator = document.createElement("div");
  indicator.id = "chatBotThinkingIndicator";
  chat.appendChild(indicator);
  
  let hist = document.createElement("div");
  hist.id = "chatBotHistory";
  hist.style = "overflow-x: scroll";
  chat.appendChild(hist);
  
  let config = {
    botName: 'Bot',
    inputs: '#humanInput',
    inputCapabilityListing: true,
    engines: [ChatBot.Engines.cppBot()],
    addChatEntryCallback: function(entryDiv, text, origin) {
      entryDiv.delay(200).slideDown();
    }
  };
  ChatBot.init(config);
}

//---------------------------attribute editor tool---------------------------------//
function createInputBoxAttr(x, y, element){
  closeInputBox();
  let inputbox = createBasicBox(x, y);
  let attrs = element.getAttributeNames().reduce((acc, name) => {
    return {...acc, [name]: element.getAttribute(name)};
  }, {});
  //parse attrs to json
  let json = JSON.stringify(attrs);
  inputbox.innerHTML = "<textarea rows='7' id='inputbox-text'>"+json+"</textarea><button id='inputbox-submit'>Submit</button><button id='inputbox-close'>X</button>";
  document.body.appendChild(inputbox);
  
  let submit = document.getElementById("inputbox-submit");
  submit.addEventListener("click", function() {
    let text = document.getElementById("inputbox-text");
    if(text.value){
      let newEle = document.createElement(element.tagName);
      newEle.innerHTML = element.innerHTML;
      let attrs = JSON.parse(text.value);
      for (var key in attrs) {
        newEle.setAttribute(key, attrs[key]);
      }
      
      let add = "Added attributes: ";
      let remove = "Removed attributes: ";
      let change = "Changed attributes: ";
      
      newEle.getAttributeNames().forEach(function(name){
        if(!element.getAttribute(name) && element.getAttribute(name)!==""){
          add += name + ", ";
        }
      });
      element.getAttributeNames().forEach(function(name){
        if(!newEle.getAttribute(name)&& newEle.getAttribute(name)!==""){
          remove += name + ", ";
        }
        else if(newEle.getAttribute(name) != element.getAttribute(name)){
          change += name + " from " + element.getAttribute(name) + " to " + newEle.getAttribute(name) + ", ";
        }
      });
      
      let total = "";
      if(add !== "Added attributes: "){
        total += add.substring(0, add.length - 2) + "\n";
      }
      if(remove !== "Removed attributes: "){
        total += remove.substring(0, remove.length - 2) + "\n";
      }
      if(change !== "Changed attributes: "){
        total += change.substring(0, change.length - 2) + "\n";
      }
      let newHTML = getElement(element).outerHTML.replace(element.outerHTML, newEle.outerHTML);
      vscode.postMessage({
        type: "changeAttr",
        old: element.outerHTML,
        new: newEle.outerHTML,
        nlp: getNLP(element),
        rid: getRID(element),
        changes: total,
        newHTML: newHTML,
      })
      element.parentElement.replaceChild(newEle, element);
      element = newEle;
      closeInputBox();
    }
    else{
      text.setAttribute("placeholder", "Please enter a value");
    }
  });
  
  let close = document.getElementById("inputbox-close");
  close.addEventListener("click", function() {
    closeInputBox();
  });
}

function defineSelector(element){
  var selector = getElement(element).outerHTML;
  return selector;
}

// set drag event for non-svg element
var divs = document.querySelectorAll('*');

divs.forEach(div => {      
  div.addEventListener("mousedown", dragStart);
});

//---------------------------drag: mousedown handler---------------------------------//
function dragStart(e) {
  if (mode == iconDic["icon-drag"] && e.target.id != "navbar" && e.target.parentNode.id != "navbar"){
    e.preventDefault();
    div = e.target;
    rectX = div.getBoundingClientRect()['x'];
    rectY = div.getBoundingClientRect()['y'];
    
    let transformValue = window.getComputedStyle(div).transform;
    if (transformValue){
      var matrix = new WebKitCSSMatrix(transformValue);
      translateX = matrix.m41;
      translateY = matrix.m42;
    }
    
    selector = defineSelector(div);
    div.addEventListener("mousemove", drag);
    div.addEventListener("mouseup", dragEnd);
    div.addEventListener('mouseleave', dragEnd);
    moving = true;
  }
  
}
//---------------------------drag: mousemove handler---------------------------------//
function drag(e) {
  if (moving) {
    if (lastX&&lastY){
      let pX = e.clientX - lastX;
      let pY = e.clientY - lastY;
      translateX += pX;
      translateY += pY;
      div.style.transform = "translate(" + translateX + "px, " + translateY + "px)";
    }
    lastX = e.clientX;
    lastY = e.clientY;
    
  }
}
//---------------------------drag: mouseup handler---------------------------------//
function dragEnd(e) {
  e.returnValue = true;
  if (moving) {
    moving = false;
    let parent = getElement(div); //the nlp div of div
    parent.style.position = "absolute";
    // div.style.transform = null;x
    parent.style.left = rectX + translateX;
    parent.style.top = rectY + translateY;
    parent.style.transform = div.style.transform
    div.style.transform = "translate(" + 0 + "px, " + 0 + "px)"
    vscode.postMessage({
      type: 'onDrag',
      new: parent.outerHTML,
      old: selector,
      nlp: getNLP(div),
      rid: getRID(div),
      transform: translateX+"px right and "+translateY+"px down"
    })
    
    lastX = null;
    lastY = null;
    
    translateX = 0;
    translateY = 0;
    
  }
}

//---------------------------SidePanel(test)---------------------------------//
function createSidePanel(logData, type, remain, memberRid){
  let sidePanel = document.getElementById("sidePanelLog");
  if (sidePanel){
    if (!remain){
      removeAllChildNodes(sidePanel);
    }
    if(type == 2){
      let members = document.getElementsByClassName("group-border");
    for(let i = 0; i < members.length; i++){
      members.classList.remove("group-border");
      if(members.classList.length == 0){
        members.removeAttribute("class");
      }
    }
    }
    logData.forEach((element, index) => {
      let hstBlock = makeHstBlock(sidePanel);
      hstBlock.setAttribute('index', index);
      hstBlock.classList.add('hstBlock');
      if (memberRid){
        hstBlock.classList.add('hstBlock-'+memberRid);
      }

      if (type == 1){ //Regular History
        let nonce = getNonce();
        hstBlock.innerHTML = `
        <table>
        <tr>
        <td id="test${nonce}"></td>
        <td>
        <strong>
        Event: ${element.event}<br/>
        Label: ${element.label}<br/>
        </strong>
        Details: ${element.details}<br/>
        Create Date: ${element.createDate.slice(0, element.createDate.indexOf("."))}
        </td></tr></table>`;

        appendCanvasForElement(element, "historyIndex-"+nonce, "test"+nonce);
      }
      else if (type == 2){ //For Groups
        editSidePanelTitle("Groups");
        let elementLabels = Object.values(element.member);
        let labels = elementLabels.join(', <br/> ');

        hstBlock.innerHTML = `
        <table>
        <tr>
        <td id="test${index}"></td>
        <td>
        <strong>
        Label: ${element.label}<br/>
        </strong>
        Elements:<br/> ${labels}<br/>
        Create Date: ${element.createDate.slice(0, element.createDate.indexOf("."))}
        </td></tr></table>`;
        
        hstBlock.addEventListener('click', function(e){
          let targetHst = e.target;
          while (!targetHst.classList.contains("hstBlock")){
            targetHst = targetHst.parentElement;
          }
          focusHstBlock(targetHst);
          let slides = document.getElementsByClassName('actionBtn');
          for (let j = 0; j < slides.length; j++) {
            slides[j].parentNode.style.position = 'null';
            slides[j].parentNode.removeChild(slides[j]);
          }
          focusHstBlock(targetHst);
          let actionBtn = document.createElement('div');
          actionBtn.classList.add('actionBtn');
          actionBtn.style = 'position: absolute; top: 0; right: 0; display: inline-block';
          targetHst.style.position = 'relative';
          targetHst.appendChild(actionBtn);
          actionBtn.innerHTML =  "<button id='detailBtn'>Details</button>";
          if (document.getElementById('detailBtn')){
            document.getElementById('detailBtn').addEventListener('click', function() {
              let elements = Object.keys(element.member);
              currGroupRid = element.rId;
              emptySidePanel();
              member = {};
              
              groupStart = 2;
              editSidePanelTitle("Group Details");
              elements.forEach((element) => {
                logSelectedElement(element);
                
              })
              console.log(member);
            });
          }
          
        });
      }
      
    });
    return;
  }
  
  
}

function createSidePanelForScripts(logData){
  let sidePanel = document.getElementById("sidePanelLog");
  if (sidePanel){
    removeAllChildNodes(sidePanel);
    editSidePanelTitle("Scripts");

    logData.forEach((element, index) => {
      let hstBlock = makeHstBlock(sidePanel);
      if(element.hasAttribute("sid")){
        //hstBlock.innerText = element.outerHTML;
        getLogByRID(USERID, element.getAttribute("sid")).then(data =>{
          console.log(data)
          if (data.length > 0 && data[0].code !== element.outerHTML) {
            console.log("update");
            hstBlock.innerHTML = `
            <div id="hstBlock-script${index}"></div>
            <br/>
            <button id="hstBlock-btn${index}">Update</button>
            `;
            let btn = document.getElementById("hstBlock-btn"+index);
            let script = document.getElementById("hstBlock-script"+index);
            script.innerText = element.outerHTML;
            btn.addEventListener('click', function(){
              vscode.postMessage({
                type: "onUpdateCode",
                code: element.outerHTML,
                rid: element.getAttribute("sid")
              });
            });
          }
          else{
            hstBlock.innerText = element.outerHTML;
          }
        });
      }
      else{
        hstBlock.innerHTML = `
        <div id="hstBlock-script${index}"></div>
        <br/>
        <input type="text" placeholder="NLP" id="hstBlock-text${index}"/>
        <button id="hstBlock-btn${index}">Save</button>
        `;
        //sidePanel.appendChild(hstBlock);
        let btn = document.getElementById("hstBlock-btn"+index);
        let text = document.getElementById("hstBlock-text"+index);
        let script = document.getElementById("hstBlock-script"+index);
        script.innerText = element.outerHTML
        
        btn.addEventListener('click', function(e){
          if(!text.value){
            text.placeholder = "Please enter NLP";
            text.style.border = "1px solid red";
            return;
          }
          let clone = element.cloneNode(true);
          clone.setAttribute("sid", "sid-placeholder");
          
          vscode.postMessage({
            type: "insertScript",
            old: element.outerHTML,
            new: clone.outerHTML,
            nlp: text.value
          });
          btn.parentElement.removeChild(btn);
          text.parentElement.removeChild(text);
        }); 
      }
    });
  }
  return;
}

function makeHstBlock(sidePanel){
  let hstBlock = document.createElement('div');
  hstBlock.classList.add('hstBlock');
  
  sidePanel.appendChild(hstBlock);
  return hstBlock;
}

function focusHstBlock(hstBlock){
  let hstBlocks = document.getElementsByClassName('hstBlock');
  for (let i = 0; i < hstBlocks.length; i++) {
    hstBlocks[i].classList.remove('selected');
  }
  hstBlock.classList.add('selected');
}
function createSidePanelForInsert(logData, groupData, nlp, style){
  let sidePanel = document.getElementById("sidePanelLog");
  let data = [...logData, ...groupData];
  if (sidePanel){
    removeAllChildNodes(sidePanel);
    editSidePanelTitle("Insert Options");

    if(logData.length > 0){
      let h2 = document.createElement('h2');
      h2.innerText = "Individual Elements";
      sidePanel.appendChild(h2);
      sidePanel.appendChild(document.createElement('br'));
    }

    logData.forEach((element, index) => {
      let hstBlock = makeHstBlock(sidePanel);
      hstBlock.setAttribute('index', index);
      hstBlock.innerHTML = `
      <table>
      <tr>
      <td id="test${index}"></td>
      <td style="word-wrap: break-word;">
      <strong>${element.label}</strong><br/>
      Scripts: ${Object.keys(element.scripts).length}<br/>
      Create Date: ${element.createDate.slice(0, element.createDate.indexOf("."))}
      </td></tr></table>`;
      
      
      appendCanvasForElement(element, "historyIndex-"+index, "test"+index);
      hstBlockEventListnerForInsert(hstBlock, element, nlp, style)
    });

    if(groupData.length > 0){
      let h2 = document.createElement('h2');
      h2.innerText = "Groups";
      sidePanel.appendChild(h2);
      sidePanel.appendChild(document.createElement('br'));
    }

    groupData.forEach((element, index) => {
      let hstBlock = makeHstBlock(sidePanel);
      let elementLabels = Object.values(element.member);
      //make a string with , seperated
      let labels = elementLabels.join(', <br/> ');
      hstBlock.innerHTML = `
      <table>
      <tr>
      <td id="test${index+10}"></td>
      <td style="word-wrap: break-word;">
      <strong>${element.label}</strong><br/>
      Elements:<br/> ${labels}<br/>
      Scripts: ${Object.keys(element.scripts).length}<br/>
      Create Date: ${element.createDate.slice(0, element.createDate.indexOf("."))}
      </td></tr></table>`;
      hstBlockEventListnerForInsertGroup(hstBlock, element)
    });
  }
  return;
}

function appendCanvasForElement(element, wrapperId, parentId){
      let wrapper= document.createElement('div');
      wrapper.innerHTML= element.code;
      wrapper.style.display = "none";
      wrapper.id = wrapperId;
      
      if(wrapper.firstChild.tagName !== "SCRIPT"){
        document.body.appendChild(wrapper);
        html2canvas(document.querySelector("#"+wrapperId).firstChild, {
          allowTaint : true,
          onclone: function (clonedDoc) {
          let temp = clonedDoc.getElementById(wrapperId);
          temp.style.display = "block";
          }
        }).then(canvas => {
          canvas.style.height = "auto"
          canvas.style.width = "50px"
          document.getElementById(parentId).appendChild(canvas)
          document.body.removeChild(document.querySelector("#"+wrapperId))
        }).catch(err => {
          document.body.removeChild(document.querySelector("#"+wrapperId))
          console.log(err);
        });
      }
}

function hstBlockEventListnerForInsert(hstBlock, element, nlp, style){
  hstBlock.addEventListener('click', function(e){
    let targetHst = e.target;
    while (!targetHst.classList.contains("hstBlock")){
      targetHst = targetHst.parentElement;
    }
    focusHstBlock(targetHst);
    let slides = document.getElementsByClassName('confirmation');
    for (let j = 0; j < slides.length; j++) {
      slides[j].parentNode.style.position = 'null';
      slides[j].parentNode.removeChild(slides[j]);
    }
    let confirmation = document.createElement('div');
    confirmation.classList.add('confirmation');
    confirmation.innerHTML =  "<button class='confirmBtn' style='position: absolute; top: 0; right: 0;'>Confirm</button>";
    targetHst.style.position = 'relative';
    targetHst.appendChild(confirmation);
    confirmation.addEventListener('click', function(){
      let wrapper= document.createElement('div');
      wrapper.innerHTML= element.code;
      let codeBlock= wrapper.firstChild;
      let replaceStyle = handleTextReplace(style, "style=\""+codeBlock.getAttribute("style")+"\"");
      codeBlock.style = replaceStyle.substring("style=\"".length, replaceStyle.length - 2);
      //codeBlock.removeAttribute("rid");//codeBlock.removeAttribute("eid");
      codeBlock.setAttribute("rid", "rid-placeholder");
      codeBlock.setAttribute("nlp", nlp);
      let insertOpt = {
        type: "onInsert",
        //success: true,
        value: nlp,
        style: `${replaceStyle}`,
        code: codeBlock.outerHTML,
        scripts: element.scripts? element.scripts : {},
        oldRid: element.rId,
        opt: 2 // "copy & paste" old elements
      };
      giveGroupSuggestions(nlp, insertOpt)
      targetHst.style.backgroundColor = 'white';
    });
  });
}

function hstBlockEventListnerForInsertGroup(hstBlock, element){
  hstBlock.addEventListener('click', function(e){
    let targetHst = e.target;
    while (!targetHst.classList.contains("hstBlock")){
      targetHst = targetHst.parentElement;
    }
    focusHstBlock(targetHst);
    let slides = document.getElementsByClassName('confirmation');
    for (let j = 0; j < slides.length; j++) {
      slides[j].parentNode.style.position = 'null';
      slides[j].parentNode.removeChild(slides[j]);
    }
    let confirmation = document.createElement('div');
    confirmation.classList.add('confirmation');
    confirmation.innerHTML =  `<button class='confirmBtn' style='position: absolute; top: 0; right: 0;'>Confirm</button>`;
    targetHst.style.position = 'relative';
    targetHst.appendChild(confirmation);
    confirmation.addEventListener('click', function(){
      let remaining = []
      for(let i = 0; i<Object.keys(element.member).length; i++){
        remaining.push({"label": element.member[Object.keys(element.member)[i]], "rid": Object.keys(element.member)[i], "code": element.codes[i]})
      }
      vscode.postMessage({
        type: "onInsert",
        remaining: remaining,
        scripts: element.scripts,
      });
      targetHst.style.backgroundColor = 'white';
      InsertState = 0;
      reloadSidePanel();
    });
  });
}

function createSidePanelForSuggestedGroups(logData, insertOpt){
  let sidePanel = document.getElementById("sidePanelLog");
  if (sidePanel){
    removeAllChildNodes(sidePanel);
    editSidePanelTitle("Suggested Groups");

    logData.forEach((element, index) => {
      let hstBlock = document.createElement('div');
      //hstBlock.setAttribute('index', index);
      hstBlock.classList.add('hstBlock');
      hstBlock.style.padding = '20px';
      hstBlock.style.margin = '10px';
      hstBlock.style.backgroundColor = '#ededed';
      hstBlock.style.radius = '5px';
      
      sidePanel.appendChild(hstBlock);
      hstBlock.addEventListener('mouseover', function(){
        hstBlock.style.backgroundColor = '#e6e6e6';
      });
      
      hstBlock.addEventListener('mouseout', function(){
        hstBlock.style.backgroundColor = '#ededed';
      });
      
      let label = element.group.label;
      
      let repeatedText = "";
      for(let i = 0; i < element.repeated.length; i++){
        if(element.repeated[i].old !== element.repeated[i].new){
          repeatedText += " "+element.repeated[i].new + " ("+element.repeated[i].old+"?),";
        }
        else{
          repeatedText += " "+element.repeated[i].new + ",";
        }
      }
      repeatedText = repeatedText.slice(0, repeatedText.length-1);
      
      let remainingText = "";
      for(let i = 0; i < element.remaining.length; i++){
        remainingText += element.remaining[i].label + ",";
      }
      remainingText = remainingText.slice(0, remainingText.length-1);
      
      let button = document.createElement("button");
      button.innerText = "Insert Missing";
      button.addEventListener("click", function(){
        insertOpt.remaining = element.remaining;
        insertOpt.scripts = {...insertOpt.scripts, ...element.scripts};
        vscode.postMessage(insertOpt);
        InsertState = 0;
        reloadSidePanel();
      });
      
      //<input type="button" class='insertMissingBtn' value='Insert Missing' />
      hstBlock.innerHTML = `
      <strong>Inserting a [${label}]?</strong><br/>
      Inserted: ${repeatedText} <br/>
      Missing: ${remainingText} <br />
      Scripts: ${Object.keys(element.scripts).length}<br/>
      `
      
      hstBlock.appendChild(button);
      
    });
    let rejectButton = document.createElement("button");
    rejectButton.innerText = "Reject";
    rejectButton.addEventListener("click", function(){
      vscode.postMessage(insertOpt);
      InsertState = 0;
      reloadSidePanel();
    });
    sidePanel.appendChild(rejectButton);
    return;
  }
}

//---------------------------Log element history tool--------------------------//
function logElementHistory(ele){
  var origin = getElement(ele).outerHTML;
  emptySidePanel();
  var elmntRid = getRID(ele);
  if (elmntRid){
    showLoading(document.getElementById("sidePanelLog"));
    getLogByRID(USERID, elmntRid).then(data => {
      removeLoading(document.getElementById("sidePanelLog"));
      if (data.length > 0){
        createSidePanel(data, 1, false);
        let hstBlocks = document.getElementsByClassName("hstBlock");
        for (var i = 0; i < hstBlocks.length; i++){
          let hstBlock = hstBlocks[i];
          hstBlock.addEventListener('click', function(e){
            let targetHst = e.target;
            while (!targetHst.classList.contains("hstBlock")){
              targetHst = targetHst.parentElement;
            }
            focusHstBlock(targetHst);
            let slides = document.getElementsByClassName('actionBtn');
            for (let j = 0; j < slides.length; j++) {
              slides[j].parentNode.style.position = 'null';
              slides[j].parentNode.removeChild(slides[j]);
            }
            let actionBtn = document.createElement('div');
            actionBtn.classList.add('actionBtn');
            actionBtn.style = 'position: absolute; top: 0; right: 0; display: inline-block';
            targetHst.style.position = 'relative';
            targetHst.appendChild(actionBtn);
            let element = data[targetHst.getAttribute("index")]
            let event = element.event;
            if (event != 'reset'){
              actionBtn.innerHTML =  "<button id='viewBtn'>Preview</button>";
              // console.log(document.getElementById("viewBtn"))
              document.getElementById("viewBtn").addEventListener('click', function(){
                // let element = data[targetHst.getAttribute("index")]
                vscode.postMessage({
                  type: "onView",
                  old: origin,
                  new: element.code,
                  nlp: getNLP(ele),
                  rid: elmntRid,
                  newId: element._id,
                  oldId: data[0]._id,
                  step: parseInt(targetHst.getAttribute("index")) + 1
                });
              }
              );
            }else if (event == 'reset'){
              actionBtn.innerHTML =  "<button id='resetBtn' >Reset</button>; <button id='undoBtn' >Undo</button>;";
              let details = element.details;
              let oldId = details.split("#")[1];
              let resetId = details.split("#")[3];
              document.getElementById("resetBtn").addEventListener('click', function(){
                var idList = [];
                var i = 0; 
                while (data[i]._id != resetId){
                  if (data[i]._id != element._id){
                    idList.push(data[i]._id);
                    i++;
                  }
                }
                vscode.postMessage({
                  type: "onReset",
                  opt:1,
                  old: element.code,
                  new: element.code,
                  id: idList
                }
                );
              }
              );
              document.getElementById("undoBtn").addEventListener('click', function(){
                var idList = [];
                var i = 0; 
                while (data[i]._id != oldId){
                  idList.push(data[i]._id);
                  i++;
                }
                let resetElmnt = data[i];
                vscode.postMessage({
                  type: "onReset",
                  opt: 0, // undo 'reset'
                  old: element.code,
                  new: resetElmnt.code,
                  id: idList,
                });
              }
              );
            }
          }
          );
        }
      }else{
        var sidePanel = document.getElementById("sidePanelLog");
        var tip = document.createElement('p');
        tip.innerHTML = "No history found";
        sidePanel.appendChild(tip);
      }
    });
  }else{
    var sidePanel = document.getElementById("sidePanelLog");
    var tip = document.createElement('p');
    tip.innerHTML = "No history found";
    sidePanel.appendChild(tip);
  } 
}


//---------------------------autocomplete---------------------------------//
var EVENTS = ["onchange", "onclick", "onmouseover", "onmouseout",
"onmousedown", "onmouseup", "onkeydown", "onkeypress", "onkeyup",
"onfocus", "onblur", "onload", "onunload", "onabort", "onerror",
"onresize", "onscroll", "onselect", "onreset"]

function autocomplete(inp, arr) {
  var currentFocus;
  inp.addEventListener("input", function(e) {
    var a, b, i, val = this.value;
    closeAllLists();
    if (!val) { return false;}
    currentFocus = -1;
    /*create a DIV element that will contain the items (values):*/
    a = document.createElement("DIV");
    a.setAttribute("id", this.id + "autocomplete-list");
    a.setAttribute("class", "autocomplete-items");
    /*append the DIV element as a child of the autocomplete container:*/
    this.parentNode.appendChild(a);
    /*for each item in the array...*/
    for (i = 0; i < arr.length; i++) {
      /*check if the item starts with the same letters as the text field value:*/
      if (arr[i].substr(0, val.length).toUpperCase() == val.toUpperCase()) {
        /*create a DIV element for each matching element:*/
        b = document.createElement("DIV");
        /*make the matching letters bold:*/
        b.innerHTML = "<strong>" + arr[i].substr(0, val.length) + "</strong>";
        b.innerHTML += arr[i].substr(val.length);
        /*insert a input field that will hold the current array item's value:*/
        b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
        /*execute a function when someone clicks on the item value (DIV element):*/
        b.addEventListener("click", function(e) {
          /*insert the value for the autocomplete text field:*/
          inp.value = this.getElementsByTagName("input")[0].value;
          /*close the list of autocompleted values,
          (or any other open lists of autocompleted values:*/
          closeAllLists();
        });
        a.appendChild(b);
      }
    }
  });
  /*execute a function presses a key on the keyboard:*/
  inp.addEventListener("keydown", function(e) {
    var x = document.getElementById(this.id + "autocomplete-list");
    if (x) x = x.getElementsByTagName("div");
    if (e.keyCode == 40) {
      /*If the arrow DOWN key is pressed,
      increase the currentFocus variable:*/
      currentFocus++;
      /*and and make the current item more visible:*/
      addActive(x);
    } else if (e.keyCode == 38) { //up
      /*If the arrow UP key is pressed,
      decrease the currentFocus variable:*/
      currentFocus--;
      /*and and make the current item more visible:*/
      addActive(x);
    } else if (e.keyCode == 13) {
      /*If the ENTER key is pressed, prevent the form from being submitted,*/
      e.preventDefault();
      if (currentFocus > -1) {
        /*and simulate a click on the "active" item:*/
        if (x) x[currentFocus].click();
      }
    }
  });
  function addActive(x) {
    /*a function to classify an item as "active":*/
    if (!x) return false;
    /*start by removing the "active" class on all items:*/
    removeActive(x);
    if (currentFocus >= x.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = (x.length - 1);
    /*add class "autocomplete-active":*/
    x[currentFocus].classList.add("autocomplete-active");
  }
  function removeActive(x) {
    /*a function to remove the "active" class from all autocomplete items:*/
    for (var i = 0; i < x.length; i++) {
      x[i].classList.remove("autocomplete-active");
    }
  }
  function closeAllLists(elmnt) {
    /*close all autocomplete lists in the document,
    except the one passed as an argument:*/
    var x = document.getElementsByClassName("autocomplete-items");
    for (var i = 0; i < x.length; i++) {
      if (elmnt != x[i] && elmnt != inp) {
        x[i].parentNode.removeChild(x[i]);
      }
    }
  }
  document.addEventListener("click", function (e) {
    closeAllLists(e.target);
  });
}




function getCopilotText(element){
  let text = "";
  element.getAttributeNames().reduce((acc, name) => {
    if(name.toLowerCase() !== "src" && name.toLowerCase() !== "nlp" && name.toLowerCase() !== "rid" && name.toLowerCase() !== "eid"){
      text += `${name}="${element.getAttribute(name)}, " `;
    }
    return {...acc, [name]: element.getAttribute(name)};
  }, {});
  return text;
}

function getInsertedElements(){
  //get all elements in the document
  let elements = document.getElementsByTagName("*");
  let inserted = {}
  for(let i = 0; i < elements.length; i++){
    //check if the element has a rId attribute
    if(elements[i].hasAttribute("rid")){
      let clone = elements[i].cloneNode(true);
      clone.setAttribute("rid", elements[i].getAttribute("rid"));
      inserted[elements[i].getAttribute("rid")] = clone.outerHTML;
      
      elements[i].setAttribute("rid", elements[i].getAttribute("rid"));
    }
  }
  if(inserted !== {}){
    vscode.postMessage({
      type: "onComplete",
      inserted: inserted
    });
  }
}

function getInsertedScripts(){
  //get all elements in the document
  let elements = document.getElementsByTagName("*");
  let inserted = {}
  for(let i = 0; i < elements.length; i++){
    //check if the element has a rId attribute
    if(elements[i].hasAttribute("sid")){
      inserted[elements[i].getAttribute("sid")] = elements[i].outerHTML;
    }
  }
  console.log("complete scripts");
  console.log(inserted);
  if(inserted !== {}){
    vscode.postMessage({
      type: "onCompleteJS",
      inserted: inserted
    });
  }
}

getInsertedElements();
getInsertedScripts();


function getLog(userId){
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

function getGroupLog(userId){
  return new Promise((resolve, reject) => {
    fetch(URL+"/db/getGroupLogs?userId="+userId, {
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

function getLogByNLP(userId, nlp) {
  return new Promise((resolve, reject) => {
    fetch(URL+"/db/getLogByNLP", {
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

function getLogByRID(userId, rId) {
  return new Promise((resolve, reject) => {
    fetch(URL+"/db/getLogByRID", {
      method: 'POST',
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({userId: userId, rId: rId})
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

function getSuggestedGroups(userId, inserted, all) {
  return new Promise((resolve, reject) => {
    fetch(URL+"/db/getSuggestedGroups", {
      method: 'POST',
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({userId: userId, inserted: inserted, all: all})
    })
    .then(res => res.json())
    .then(data => {
      return resolve(data);
    })
    .catch(err => {
      return reject(err);
    })
  });
}


function removeAllChildNodes(parent) {
  editSidePanelTitle("History");
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }
}

function handleTextReplace(insertStyle, replaceStyle) {
  var remainder = ["position", "top", "left", "width", "height", "transform"];
  var d = {};
  
  var middle = insertStyle.split(';');
  
  for (var i in middle) {
    var a = middle[i].split(':');
    if (remainder.includes(a[0].replace(/\s/g, '')) && a[0].replace(/\s/g, '') !== '') {
      d[a[0]] = a[1];
    }
  }
  
  var styleStart = replaceStyle.lastIndexOf('style=') + 'style='.length;
  var styleNext = replaceStyle.slice(styleStart).indexOf("\"") + styleStart + 1;
  var styleEnd = replaceStyle.slice(styleStart).split("\"", 2).join("\"").length + styleStart;
  middle = replaceStyle.slice(styleNext, styleEnd,).split(';');
  for (var i in middle) {
    var a = middle[i].split(':');
    if (!remainder.includes(a[0].replace(/\s/g, '')) && a[0].replace(/\s/g, '') !== '') {
      d[a[0]] = a[1];
    }
  }
  
  var innerText = '';
  for (const [key, value] of Object.entries(d)) {
    if (key && value){
      innerText += key + ':' + value + ';';
    }
  }
  replaceStyle = replaceStyle.replace(replaceStyle.slice(styleStart+1,styleEnd,),innerText + ",",);
  return replaceStyle;
  
}

function getNLP(element){
  while(element && element.tagName !== "BODY"){
    if(element.hasAttribute("nlp")){
      return element.getAttribute("nlp");
    }
    element = element.parentNode;
  }
}

function getRID(element){
  while(element && element.tagName !== "BODY"){
    if(element.hasAttribute("eid") || element.hasAttribute("rid")){
      return element.getAttribute("eid")?element.getAttribute("eid"):element.getAttribute("rid");
    }
    element = element.parentNode;
  }
}

function getElement(element){
  while(element && element.tagName && element.tagName !== "BODY"){
    if(element.hasAttribute("nlp")){
      return element;
    }
    element = element.parentNode;
  }
}

function showLoading(panel){
 //panel.innerText = "Loading...";
 panel.innerHTML = `<img class="loadingIcon" src="${LoadingIcon}"/>`;
}

function removeLoading(panel){
  panel.innerText = "";
}

function getNonce() {
  let text = "";
  const possible =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function editSidePanelTitle(title){
  document.getElementById("sidePanel-title").innerHTML = "&nbsp;&nbsp;"+title;
}