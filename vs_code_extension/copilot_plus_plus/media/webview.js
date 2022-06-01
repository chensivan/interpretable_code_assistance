const vscode = acquireVsCodeApi();
//---------------------------tool bar functions---------------------------------//
var mode = 0;
const iconIds = ["icon-tip", "icon-drag", "icon-insert", "icon-edit", "icon-resize", 
"icon-delete", "icon-js", "icon-chat"];

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
      createChatBox();
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
document.addEventListener("click", function(event){
  if (event.target.id !== "inputbox" && event.target.parentElement.id !== "inputbox"
  && event.target.id !== "navbar" && event.target.parentElement.id !== "navbar"
  && (event.target.tagName !== "HTML") 
  && event.target.id !== "chatBotOuter" && event.target.parentElement.id !== "chatBotOuter"){
    if (mode == 0){
      createEditBox(event.pageX, event.pageY, event.target);
    }
    else if (mode == 5 && event.target.tagName !== "BODY"){
      createDeleteBox(event.pageX, event.pageY, event.target)
    }
    else if (mode == 4 && event.target.tagName !== "BODY"){
      closeBorder(oldElmnt);
      var target = event.target;
      oldElmnt = target.outerHTML;
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
      if (chatBotSelector){
        ChatBot.setTargetElmnt(event.target);
        // TODO: set close selector button
        chatBotSelector = false;
      }
    }
  }
  else if (event.target.tagName !== "HTML"){
    closeBorder(oldElmnt);
  }
});

//---------------------------double click handler---------------------------------//
/*document.addEventListener('contextmenu', function (e) {
  if (event.target.id !== "inputbox" && event.target.parentElement.id !== "inputbox"
  && event.target.id !== "navbar" && event.target.parentElement.id !== "navbar"
  && (event.target.tagName !== "HTML") 
  && event.target.id !== "chatBotOuter" && event.target.parentElement.id !== "chatBotOuter"){
  if(mode == 0){
    e.preventDefault();
    createStylePreset(e.pageX, e.pageY, e.target);
  }
}
});*/

//---------------------------mousedown handler---------------------------------//
document.addEventListener("mousedown", function(event) {
  if(mode == 2 && event.target.id !== "inputbox" && event.target.parentElement.id !== "inputbox" && 
  event.target.id !== "navbar" && event.target.parentElement.id !== "navbar"){
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
    let style = "absolute position, position at top "+widgetInitY+"px, left "+widgetInitX+"px with width "+(widgetFinX - widgetInitX)+"px and height "+(widgetFinY - widgetInitY)+"px";
    createInputBox(widgetInitX, widgetFinY, style);
  }
}
);

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
    vscode.postMessage({
      type: 'makeDrag',
      new: old.outerHTML,
      old: ele,
    })
  }
}

function closeChatBox(){
  closeById("chatBotOuter");
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
//---------------------------set style tools---------------------------------//
function createStylePreset(x, y, element){
  closeInputBox();
  let inputbox = createBasicBox(x, y);
  inputbox.innerHTML = "<span style='background:white'>"+element.tagName+"</span><input type='text' id='inputbox-input'/><button id='inputbox-submit'>Submit</button><button id='inputbox-close'>X</button>";
  document.body.appendChild(inputbox);
  let input = document.getElementById("inputbox-input");
  input.value = element.style.cssText;
  let submit = document.getElementById("inputbox-submit");
  let close = document.getElementById("inputbox-close");
  submit.addEventListener("click", function(){
    vscode.postMessage({
      type: "savePreset",
      tag: element.tagName,
      style: input.value
    })
    closeInputBox();
  });
  close.addEventListener("click", function(){
    closeInputBox();
  });
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
      vscode.postMessage({
        type: "onInsert",
        value: text.value,
        style: style
      })
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
    inputbox.innerHTML = "<textarea style='background:white' id='inputbox-input' rows='5'></textarea><button id='inputbox-submit'>Submit</button><button id='inputbox-close'>X</button>";
  }
  else{
    inputbox.innerText = "document body";
  }
  document.body.appendChild(inputbox);
  if(element.tagName !== "BODY"){
    let input = document.getElementById("inputbox-input");
    input.value = element.outerHTML;
  }
}

//---------------------------delete tool---------------------------------//
function createDeleteBox(x, y, element){
  closeInputBox();
  createInfoBox(x, y, element);
  let inputBox = document.getElementById("inputbox");
  let button = document.createElement("button");
  button.id = "inputbox-button";
  button.innerText = "delete "+element.tagName;
  button.addEventListener("click", function() {
    vscode.postMessage({
      type: "delete",
      value: element.outerHTML
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
  let event = document.createElement("input");
  event.id = "inputbox-event";
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
    vscode.postMessage({
      type: "createjs",
      old: element.outerHTML,
      new: temp.outerHTML,
      event: event.value,
      name: name.value,
      script: script.value
    })
    closeInputBox();
  });
  
  document.querySelector("#inputbox").appendChild(document.createElement("br"));
  document.querySelector("#inputbox").appendChild(event);
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
      vscode.postMessage({
        type: "changeAttr",
        old: element.outerHTML,
        new: newEle.outerHTML
      })
      document.body.replaceChild(newEle, element);
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
  var selector = element.outerHTML;
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
    div.style.position = "absolute";
    div.style.left = rectX + translateX;
    div.style.top = rectY + translateY;
    vscode.postMessage({
      type: 'makeDrag',
      new: defineSelector(div),
      old: selector,
    })
    
    lastX = null;
    lastY = null;
    
    translateX = 0;
    translateY = 0;
    
  }
}


