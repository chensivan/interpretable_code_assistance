
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
  if (mode == 8){
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

//----------initiate grouping------------//



//---------------------------tool bar functions---------------------------------//
var mode = 0;
const iconIds = ["icon-tip", "icon-drag", "icon-insert", "icon-edit", "icon-resize", 
"icon-delete", "icon-js", "icon-chat", "icon-group"];

var icons = document.getElementsByClassName('icon');
document.getElementById("icon-tip").classList.add("selected");
for (var i = 0; i < icons.length; i++) {
  icons[i].addEventListener('click', handleSelectedIcon);
}

// set tool bar icon handler
function handleSelectedIcon(event){
  var icon = event.target;
  
  if (iconIds.includes(icon.id)){
    mode = iconIds.indexOf(icon.id); 
    toggleSelectedIcon(icon.id);
    if(mode == 7){
      var sidePanel = document.getElementById("sidePanelLog");
      if (sidePanel){
        removeAllChildNodes(sidePanel);
      }
    }
    else if(mode == 8){
      reloadGroupPanel();
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

function createGroupSelector(ele){
  let sidePanel = document.getElementById("sidePanel");
  if (groupStart == 0){
    emptySidePanel();
  }else if (groupStart == 2){
    if (!document.getElementById("editTool-group")){
      let createBtn = document.createElement("div");
      createBtn.id = "editTool-group";
      createBtn.innerHTML = "<button id='edit-group' style='float: right;'>Confirm</button>";
      sidePanel.appendChild(createBtn);
      editGrouping(createBtn);
    }
  }
  if (!ele.classList.contains("group-border")){
    let elmntRid = getRID(ele);
    if (elmntRid){
      logSelectedElement(elmntRid, ele);
      ele.classList.add('group-border');
      ele.style.border = '2px dashed #ccc';
      if (groupStart == 0 && !document.getElementById("submitTool-group")){
        let createBtn = document.createElement("div");
        createBtn.id = "submitTool-group";
        createBtn.innerHTML = "<input type='text' id='inputbox-group'/><button id='submit-group'>Submit</button>";
        sidePanel.appendChild(createBtn);
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
    getLogByRID("user1", elmntRid).then(data => {
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
  && !event.target.parentElement.classList.contains("autocomplete-items")
  && (event.target.tagName !== "HTML") 
  && event.target.id !== "chatBotOuter" && (!event.target.parentElement ||event.target.parentElement.id !== "chatBotOuter")
  && event.target.id !== "inputbox-event"
  && !findAncestor(event.target, "sidePanel")
  && event.target.id !== "openbtn"
  && event.target.id !== "hstBlock"){
    if (mode == 0){
      createEditBox(event.pageX, event.pageY, event.target);
    }
    else if (mode == 5 && event.target.tagName !== "BODY"){
      createDeleteBox(event.pageX, event.pageY, event.target)
    }
    else if (mode == 4 && event.target.tagName !== "BODY"){
      closeBorder(oldElmnt);
      var target = event.target;
      oldElmnt = getElement(target).outerHTML;
      target.classList.add('border');
      target.style.border = '2px dashed #ccc';
      resizeStart();
    }
    else if (mode == 3){
      createInputBoxAttr(event.pageX, event.pageY, event.target)
    }
    else if(mode == 6){
      createInputBoxJs(event.pageX, event.pageY, event.target)
    }
    else if (mode == 7){
      logElementHistory(event.target);
    }
    else if (mode == 8){
      createGroupSelector(event.target);
    }
  }
  else if (event.target.tagName !== "HTML"){
    closeBorder(oldElmnt);
  }
});

//---------------------------mousedown handler---------------------------------//
document.addEventListener("mousedown", function(event) {
  if(mode == 2 && event.target.id !== "inputbox" && (!event.target.parentElement || event.target.parentElement.id !== "inputbox") && 
  event.target.id !== "navbar" && (!event.target.parentElement || event.target.parentElement.id !== "navbar")){
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
  if (mode == 4 && resizeAble && resizeElmnt && dir != "" && resizeElmnt.id !== "navbar" && resizeElmnt.parentElement.id !== "navbar"){
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
  if (onResize && mode === 4 && resizeElmnt){
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

    let parent = getElement(old); //This is going to cause a lot of trouble later on :(
    parent.style.width = old.style.width;
    parent.style.height = old.style.height;

    vscode.postMessage({
      type: 'onResize',
      new: getElement(old).outerHTML,
      old: ele,
      nlp: getNLP(old),
      text: getCopilotText(old),
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
  getLog("user1").then(data => {
    createSidePanel(data, 1, false);
  }
  );
}

function reloadGroupPanel(){
  getGroupLog("user1").then(data => {
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
      getLogByNLP("user1", text.value).then(data => {
        let sidePanel = document.getElementById("sidePanelLog");
        if (data.success){
          let length = Math.min(4, data.all.length);
          let logData = data.all.slice(0, length);

          let lengthGroup = Math.min(2, data.groups.length);
          let groupData = data.groups.slice(0, lengthGroup);
          createSidePanelForInsert(logData, groupData, text.value, style);

          /*let hstBlocks = document.getElementsByClassName("hstBlock");
          for (var i = 0; i < hstBlocks.length; i++){
            let hstBlock = hstBlocks[i];
            hstBlock.addEventListener('click', function(e){
              let targetHst = e.target;
              while (!targetHst.classList.contains("hstBlock")){
                targetHst = targetHst.parentElement;
              }
              targetHst.style.backgroundColor = '#e6e6e6';
              let slides = document.getElementsByClassName('confirmation');
              for (let j = 0; j < slides.length; j++) {
                slides[j].parentNode.style.position = 'null';
                slides[j].parentNode.removeChild(slides[j]);
              }
              let confirmation = document.createElement('div');
              confirmation.classList.add('confirmation');
              confirmation.innerHTML =  "<input type='submit' class='confirmBtn' style='position: absolute; top: 0; right: 0; background:transparent' value='Confirm' />";
              targetHst.style.position = 'relative';
              targetHst.appendChild(confirmation);
              confirmation.addEventListener('click', function(){
              let element = logData[targetHst.getAttribute("index")]
              let wrapper= document.createElement('div');
              wrapper.innerHTML= element.code;
              let codeBlock= wrapper.firstChild;
              let replaceStyle = handleTextReplace(style, "style=\""+codeBlock.getAttribute("style")+"\"");
              codeBlock.style = replaceStyle.substring("style=\"".length, replaceStyle.length - 2);
              codeBlock.removeAttribute("eid");
              codeBlock.setAttribute("rid", "rid-placeholder");
              codeBlock.setAttribute("nlp", text.value);
              let insertOpt = {
                type: "onInsert",
                //success: true,
                value: text.value,
                style: `${replaceStyle}`,
                code: codeBlock.outerHTML,
                opt: 2 // "copy & paste" old elements
            };
              giveGroupSuggestions(text.value, insertOpt)
                targetHst.style.backgroundColor = 'white';
                reloadSidePanel();
              });
            });
          }*/
        }
        else{
          createSidePanel([], 1, false);
        }
          
          let declineBtn = document.createElement("button");
          declineBtn.innerHTML = "Create New";
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
            reloadSidePanel();
          });

          let copilotbtn = document.createElement("button");
          copilotbtn.innerHTML = "Create New Using Copilot";
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
            reloadSidePanel();
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
  });
}

function giveGroupSuggestions(insertedLabel, insertOpts){
  //get all elements and if they have attribute nlp get all their values
  let elements = document.getElementsByTagName("*");
  let all = [];
  for (let i = 0; i < elements.length; i++) {
    if (elements[i].hasAttribute("nlp")){
      all.push(elements[i].getAttribute("nlp"));
    }
  }
  getSuggestedGroups("user1", insertedLabel, all).then(data => {
    console.log(data);
    //display to sidepanel
    if(data.length > 0){
      createSidePanelForSuggestedGroups(data, insertOpts);

    }
    else{
      vscode.postMessage(insertOpts)
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
  if(element.tagName !== "BODY"){
    inputbox.innerHTML = "<textarea style='background:white' id='inputbox-input' rows='2' cols='20' placeholder='innerHTML'></textarea><br/><button id='inputbox-submit'>Submit</button><button id='inputbox-close'>X</button>";
  }
  else{
    inputbox.innerText = "document body";
  }
  document.body.appendChild(inputbox);
  if(element.tagName !== "BODY"){
    let input = document.getElementById("inputbox-input");
    input.value = element.innerHTML;
    let submit = document.getElementById("inputbox-submit");
    let close = document.getElementById("inputbox-close");
    submit.addEventListener("click", function(){
      let input = document.getElementById("inputbox-input");
      let temp = element.outerHTML
      let label = getNLP(element);
      let rid = getRID(element);
      //let newEle = document.createElement(element.tagName);
      element.innerHTML = input.value;
      //newEle.outerHTML = input.value;
      vscode.postMessage({
        type: "onEdit",
        new: element.outerHTML,
        old: temp,
        nlp: label,
        text: getCopilotText(element),
        inner: input.value,
        rid: rid,
        newHTML: getElement(element).outerHTML
      });
      
      closeInputBox();
    });
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
      rid: getRID(element),
      text: "", //since the user cleared the element, assume it is not the wanted style???
      detail: getCopilotText(element)
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
  event.id = "inputbox-event";
  
  div.appendChild(event);
  autocomplete(event, EVENTS);
  
  event.placeholder = "action event, ex. onclick";
  
  
  let name = document.createElement("input");
  name.id = "inputbox-name";
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
      text: getCopilotText(temp)
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
        text: getCopilotText(newEle),
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
  if (mode == 1 && e.target.id != "navbar" && e.target.parentNode.id != "navbar"){
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
      text: getCopilotText(div),
      transform: translateX+"px right and "+translateY+"px down"
    })
    
    lastX = null;
    lastY = null;
    
    translateX = 0;
    translateY = 0;
    
  }
}

//---------------------------SidePanel(test)---------------------------------//
function createSidePanel(logData, insert, remain, memberRid){
  let sidePanel = document.getElementById("sidePanelLog");
  if (sidePanel){
    if (!remain){
      removeAllChildNodes(sidePanel);
    }
    logData.forEach((element, index) => {
      let hstBlock = document.createElement('div');
      hstBlock.setAttribute('index', index);
      hstBlock.classList.add('hstBlock');
      if (memberRid){
        hstBlock.classList.add('hstBlock-'+memberRid);
      }
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

      if(insert == 0){
      hstBlock.innerHTML = `
      <table>
      <tr>
      <td id="test${index}"></td>
      <td style="word-wrap: break-word;">
      <strong>${element.label}</strong><br/>
      Create Date: ${element.createDate.slice(0, element.createDate.indexOf("."))}
      </td></tr></table>`;
      }
      else if (insert == 1){
        hstBlock.innerHTML = `
      <table>
      <tr>
      <td id="test${index}"></td>
      <td>
      Event: ${element.event}<br/>
      Label: ${element.label}<br/>
      Details: ${element.details}<br/>
      Create Date: ${element.createDate.slice(0, element.createDate.indexOf("."))}
      </td></tr></table>`;
      }
      else if (insert == 2){
        hstBlock.innerHTML = `
        <table>
        <tr>
        <td id="test${index}"></td>
        <td>
        Event: ${element.event}<br/>
        Label: ${element.label}<br/>
        Create Date: ${element.createDate.slice(0, element.createDate.indexOf("."))}
        </td></tr></table>`;
       
        hstBlock.addEventListener('click', function(e){
          let targetHst = e.target;
          while (!targetHst.classList.contains("hstBlock")){
            targetHst = targetHst.parentElement;
          }
    
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
          actionBtn.innerHTML =  "<button id='detailBtn'>Details</button>";
          if (document.getElementById('detailBtn')){
            document.getElementById('detailBtn').addEventListener('click', function() {
              let elements = Object.keys(element.member);
              currGroupRid = element.rId;
              // let details = document.createElement('div');
              // details.class = "dropdown-container";
              // hstBlock.parentNode.insertBefore(details, hstBlock.nextSibling);
              // elements.forEach((ele, eleIndex) =>{
              //   getLogByRID("user1", ele).then(data =>{ 
              //     if (data.length > 0) {
              //       let curr = document.createElement('div');
              //       details.appendChild(curr);
              //       curr.innerHTML  = `
              //       <table>
              //       <tr>
              //       <td id="test${eleIndex}"></td>
              //       <td>
              //       Event: ${data[0].event}<br/>
              //       Label: ${data[0].label}<br/>
              //       Details: ${data[0].details}<br/>
              //       Create Date: ${data[0].createDate.slice(0, data[0].createDate.indexOf("."))}
              //       </td></tr></table>`;
              //     }
              //   });
              // }
              // )
              emptySidePanel();
              member = {};

              groupStart = 2;
              elements.forEach((element) => {
                logSelectedElement(element);
                
              })
              console.log(member);
            });
          }
    
        });
      }

     let wrapper= document.createElement('div');
      wrapper.innerHTML= element.code;
      //let codeBlock= wrapper.firstChild;
    wrapper.style.display = "none";
    wrapper.id = "historyIndex-"+index;
    document.body.appendChild(wrapper);

html2canvas(document.querySelector("#historyIndex-"+index).firstChild, {
  //useCORS: true,
  allowTaint : true,
  onclone: function (clonedDoc) {
      let temp = clonedDoc.getElementById('historyIndex-'+index);
      temp.style.display = "block";
  }
}).then(canvas => {
  canvas.style.height = "auto"
  canvas.style.width = "50px"
  document.querySelector("#test"+index).appendChild(canvas)
  document.body.removeChild(document.querySelector("#historyIndex-"+index))
});
    });
  return;
}


}

function makeHstBlock(sidePanel){
  let hstBlock = document.createElement('div');
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
      return hstBlock;
}
function createSidePanelForInsert(logData, groupData, nlp, style){
  let sidePanel = document.getElementById("sidePanelLog");
  let data = [...logData, ...groupData];
  console.log(groupData);
  console.log(data);
  if (sidePanel){
    removeAllChildNodes(sidePanel);
    logData.forEach((element, index) => {
      console.log(element)
      let hstBlock = makeHstBlock(sidePanel);
      hstBlock.setAttribute('index', index);
        hstBlock.innerHTML = `
        <table>
        <tr>
        <td id="test${index}"></td>
        <td style="word-wrap: break-word;">
        <strong>${element.label}</strong><br/>
        Create Date: ${element.createDate.slice(0, element.createDate.indexOf("."))}
        </td></tr></table>`;

        
     let wrapper= document.createElement('div');
     wrapper.innerHTML= element.code;
     //let codeBlock= wrapper.firstChild;
    wrapper.style.display = "none";
    wrapper.id = "historyIndex-"+index;
    document.body.appendChild(wrapper);

    html2canvas(document.querySelector("#historyIndex-"+index).firstChild, {
 allowTaint : true,
 onclone: function (clonedDoc) {
     let temp = clonedDoc.getElementById('historyIndex-'+index);
     temp.style.display = "block";
 }
}).then(canvas => {
 canvas.style.height = "auto"
 canvas.style.width = "50px"
 document.querySelector("#test"+index).appendChild(canvas)
 document.body.removeChild(document.querySelector("#historyIndex-"+index))
});

hstBlockEventListnerForInsert(hstBlock, element, nlp, style)
      });
      sidePanel.appendChild(document.createTextNode("Groups"));
      groupData.forEach((element, index) => {
        console.log(element)
          let hstBlock = makeHstBlock(sidePanel);
            let elementLabels = Object.values(element.member);
            //make a string with , seperated
            let labels = elementLabels.join(', ');
            console.log(elementLabels)
            console.log(labels)
            hstBlock.innerHTML = `
            <table>
            <tr>
            <td id="test${index+10}"></td>
            <td style="word-wrap: break-word;">
            <strong>${element.label}</strong><br/>
            Elements: ${labels}<br/>
            Create Date: ${element.createDate.slice(0, element.createDate.indexOf("."))}
            </td></tr></table>`;
            hstBlockEventListnerForInsertGroup(hstBlock, element)
            });
      }
  return;
}

function hstBlockEventListnerForInsert(hstBlock, element, nlp, style){
  hstBlock.addEventListener('click', function(e){
    let targetHst = e.target;
    while (!targetHst.classList.contains("hstBlock")){
      targetHst = targetHst.parentElement;
    }
    console.log(targetHst)
    targetHst.style.backgroundColor = '#e6e6e6';
    let slides = document.getElementsByClassName('confirmation');
    for (let j = 0; j < slides.length; j++) {
      slides[j].parentNode.style.position = 'null';
      slides[j].parentNode.removeChild(slides[j]);
    }
    let confirmation = document.createElement('div');
    confirmation.classList.add('confirmation');
    confirmation.innerHTML =  "<input type='submit' class='confirmBtn' style='position: absolute; top: 0; right: 0; background:transparent' value='Confirm' />";
    targetHst.style.position = 'relative';
    targetHst.appendChild(confirmation);
    confirmation.addEventListener('click', function(){
    let wrapper= document.createElement('div');
    wrapper.innerHTML= element.code;
    let codeBlock= wrapper.firstChild;
    let replaceStyle = handleTextReplace(style, "style=\""+codeBlock.getAttribute("style")+"\"");
    codeBlock.style = replaceStyle.substring("style=\"".length, replaceStyle.length - 2);
    codeBlock.removeAttribute("eid");
    codeBlock.setAttribute("rid", "rid-placeholder");
    codeBlock.setAttribute("nlp", nlp);
    let insertOpt = {
      type: "onInsert",
      //success: true,
      value: nlp,
      style: `${replaceStyle}`,
      code: codeBlock.outerHTML,
      opt: 2 // "copy & paste" old elements
  };
    giveGroupSuggestions(nlp, insertOpt)
      targetHst.style.backgroundColor = 'white';
      reloadSidePanel();
    });
  });
}

function hstBlockEventListnerForInsertGroup(hstBlock, element){
  hstBlock.addEventListener('click', function(e){
    let targetHst = e.target;
    while (!targetHst.classList.contains("hstBlock")){
      targetHst = targetHst.parentElement;
    }
    console.log(targetHst)
    targetHst.style.backgroundColor = '#e6e6e6';
    let slides = document.getElementsByClassName('confirmation');
    for (let j = 0; j < slides.length; j++) {
      slides[j].parentNode.style.position = 'null';
      slides[j].parentNode.removeChild(slides[j]);
    }
    let confirmation = document.createElement('div');
    confirmation.classList.add('confirmation');
    confirmation.innerHTML =  "<input type='submit' class='confirmBtn' style='position: absolute; top: 0; right: 0; background:transparent' value='Confirm' />";
    targetHst.style.position = 'relative';
    targetHst.appendChild(confirmation);
    confirmation.addEventListener('click', function(){
    
    let remaining = []
    for(let i = 0; i<Object.keys(element.member).length; i++){
      remaining.push({"label": element.member[i], "rid": Object.keys(element.member)[i], "code": element.codes[i]})
    }
    console.log(remaining);
    vscode.postMessage({
      type: "onInsert",
      remaining, remaining
  });
      targetHst.style.backgroundColor = 'white';
      reloadSidePanel();
    });
  });
}

function createSidePanelForSuggestedGroups(logData, insertOpt){
  let sidePanel = document.getElementById("sidePanelLog");
  if (sidePanel){
    removeAllChildNodes(sidePanel);
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
      
      let button = document.createElement("Input");
      button.type = "button";
      button.value = "Insert Missing";
      button.addEventListener("click", function(){
        insertOpt.remaining = element.remaining;
        vscode.postMessage(insertOpt);
        reloadSidePanel();
      });

      //<input type="button" class='insertMissingBtn' value='Insert Missing' />
      hstBlock.innerHTML = `
      <strong>Inserting a [${label}]?</strong><br/>
      Inserted: ${repeatedText} <br/>
      Missing: ${remainingText}
      `

      hstBlock.appendChild(button);

    });
  let rejectButton = document.createElement("Input");
  rejectButton.type = "button";
  rejectButton.value = "Reject";
  rejectButton.addEventListener("click", function(){
    vscode.postMessage(insertOpt);
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
    getLogByRID("user1", elmntRid).then(data => {
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
                    text: getCopilotText(ele),
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


//---------------------------Helper functions---------------------------------//

function autocomplete(inp, arr) {
  /*the autocomplete function takes two arguments,
  the text field element and an array of possible autocompleted values:*/
  var currentFocus;
  /*execute a function when someone writes in the text field:*/
  inp.addEventListener("input", function(e) {
    var a, b, i, val = this.value;
    /*close any already open lists of autocompleted values*/
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
  /*execute a function when someone clicks in the document:*/
  document.addEventListener("click", function (e) {
    closeAllLists(e.target);
  });
}

/*An array containing all the country names in the world:*/
var EVENTS = ["onchange", "onclick", "onmouseover", "onmouseout",
"onmousedown", "onmouseup", "onkeydown", "onkeypress", "onkeyup",
"onfocus", "onblur", "onload", "onunload", "onabort", "onerror",
"onresize", "onscroll", "onselect", "onreset"]


function getCopilotText(element){
  let text = "";
  let attrs = element.getAttributeNames().reduce((acc, name) => {
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
      clone.removeAttribute("rid");
      clone.setAttribute("eid", elements[i].getAttribute("rid"));
      inserted[elements[i].getAttribute("rid")] = clone.outerHTML;

      elements[i].setAttribute("eid", elements[i].getAttribute("rid"));
      elements[i].removeAttribute("rid");
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
    })
}


function removeAllChildNodes(parent) {
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
  var styleNext = replaceStyle.slice(
    styleStart).indexOf("\"") + styleStart + 1;
    var styleEnd = replaceStyle.slice(
      styleStart).split("\"", 2).join("\"").length + styleStart;
      middle = replaceStyle.slice(
        styleNext,
        styleEnd,
        ).split(';');
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
        replaceStyle = replaceStyle.replace(
          replaceStyle.slice(
            styleStart+1,
            styleEnd,
            ),
            innerText + ",",
            );
            return replaceStyle;
            
}
          
          function getNLP(element){
            while(element.tagName !== "BODY"){
              if(element.hasAttribute("nlp")){
                return element.getAttribute("nlp");
              }
              element = element.parentNode;
            }
          }
          
          function getRID(element){
            while(element.tagName !== "BODY"){
              if(element.hasAttribute("eid")){
                return element.getAttribute("eid");
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
