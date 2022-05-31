const vscode = acquireVsCodeApi();
//---------------------------tool bar functions---------------------------------//
var mode = 0;
var icons = document.getElementsByClassName('icon');
document.getElementById("icon-tip").classList.add("selected");
for (var i = 0; i < icons.length; i++) {
  icons[i].addEventListener('click', handleSelectIcon);
}
const iconIds = ["icon-tip", "icon-drag", "icon-insert", "icon-edit", "icon-resize", 
"icon-delete", "icon-js", "icon-chat"];
// set tool bar icon handler
function handleSelectIcon(event){
  var icon = event.target;
  
  if (iconIds.includes(icon.id)){
    mode = iconIds.indexOf(icon.id); 
    selectIcon(icon.id);
    if(mode == 7){
      createChatBox();
    }
  }
}

function selectIcon(iconName){
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

var oldElmnt;
var chatBotSelector = true;

//---------------------------variables for attribute editor tool---------------------------------//
var widget;
var initX;
var initY;
var finX;
var finY;
var ismousedown = false;

//---------------------------click handler---------------------------------//
document.addEventListener("click", function(event){
  if (event.target.id !== "inputbox" && event.target.parentElement.id !== "inputbox"
  && event.target.id !== "navbar" && event.target.parentElement.id !== "navbar"
  && (event.target.tagName !== "HTML") 
  && event.target.id !== "chatBotOuter" && event.target.parentElement.id !== "chatBotOuter"){
    if (mode == 0){
      createInfoBox(event.pageX, event.pageY, event.target);
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

//---------------------------mousedown handler---------------------------------//
document.addEventListener("mousedown", function(event) {
  if(mode == 2 && event.target.id !== "inputbox" && event.target.parentElement.id !== "inputbox" && 
  event.target.id !== "navbar" && event.target.parentElement.id !== "navbar"){
    closeInputBox();
    closeWidget();
    
    ismousedown = true;
    initX = event.pageX;
    initY = event.pageY;
    //create div element
    widget = document.createElement("div");
    widget.style.position = "absolute";
    widget.style.top = initY+"px";
    widget.style.left = initX+"px";
    widget.classList.add("widget");
    widget.id = "widget";
    document.body.appendChild(widget);
    ismousedown = true;
  }
});

//---------------------------mousemove handler---------------------------------//
document.addEventListener("mousemove", function(event) {
  if (ismousedown) {
    finX = event.pageX;
    finY = event.pageY;
    widget.style.width = finX - initX + "px";
    widget.style.height = finY - initY + "px";
    widget.style.display = "block";
    widget.style.border = '2px dashed #ccc';
  }
});

//---------------------------mouseup handler---------------------------------//
document.addEventListener("mouseup", function(event) {
  if(ismousedown && initX != finX && initY != finY){
    ismousedown = false;
    var style = "absolute position, position at top "+initY+"px, left "+initX+"px with width "+(finX-initX)+"px and height "+(finY-initY)+"px";
    createInputBox(initX, finY, style);
  }
}
);
var elmnt;
var c;
var resizeAble = false; var onResize = false;
var rect;
var startWidth, startHeight, startX, startY;

function resizeStart(){
  elmnt = document.getElementsByClassName("border")[0];
  elmnt.addEventListener('mousemove', doResize, false);
}

function initResize(e) {
  if (e.target.tagName.toLowerCase() === 'img'){
    e.preventDefault();
  }
  if (mode == 4 && resizeAble && elmnt && c != "" && elmnt.id !== "navbar" && elmnt.parentElement.id !== "navbar"){
    startX = e.clientX;
    startY = e.clientY;
    startWidth = rect.width;
    startHeight = rect.height;
    onResize = true;
    resizeAble = false;
  }
}

function doResize(e){
  var delta = 5;
  
  if (!onResize && elmnt){
    rect = elmnt.getBoundingClientRect();
    var x = e.clientX - rect.left,  
    y = e.clientY - rect.top,     
    w = rect.right - rect.left,
    h = rect.bottom - rect.top;
    
    c = "";
    // if( y > h - delta) c += "s";
    // if(x > w - delta) c += "e";
    if( y > h - delta){
      c += "s";
      widthChange = 1;
    }
    if(x > w - delta){
      c += "e";
      heightChange = 1;
    }         
    
    if(c.includes("e") || c.includes("s")){                         
      // if we are hovering at the border area (c is not empty)
      elmnt.style.cursor = c + "-resize"; // set the according cursor
      resizeAble = true;
    }else{
      elmnt.style.cursor = 'default';
      resizeAble = false;
    }
    elmnt.addEventListener("mousedown",initResize, false);
    elmnt.addEventListener("mouseup", stopResize, false);
  }else if (onResize && elmnt){
    if (c.includes("e")){
      elmnt.style.width = (startWidth + e.clientX - startX) + 'px';
    }
    if (c.includes("s")){
      elmnt.style.height = (startHeight + e.clientY - startY) + 'px';
    }
  }
}

function stopResize(e){
  if (onResize && mode === 4 && elmnt){
    elmnt.style.cursor = 'default';
    onResize = false;
    resizeAble = false;
    closeBorder(oldElmnt);
    elmnt.removeEventListener('mousemove', doResize, false);
    elmnt.removeEventListener('mouseup', stopResize, false);
  }
}


//---------------------------close elements---------------------------------//
function closeInputBox(){
  let inputBox = document.getElementById("inputbox");
  if (inputBox){
    inputBox.parentElement.removeChild(inputBox);
  }
}

function closeWidget(){
  let oldWidget = document.getElementById("widget");
  if(oldWidget){
    document.body.removeChild(oldWidget);
  }
}

function closeBorder(ele){
  old = document.getElementsByClassName("border")[0];
  
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
  old = document.getElementById("chatBotOuter");
  if(old){
    document.body.removeChild(old);
  }
}

//---------------------------create basic box element---------------------------------//
function createBasicBox(x, y){
  let box = document.createElement("div");
  box.style.position = "absolute";
  box.style.top = y+"px";
  box.style.left = x+"px";
  box.style.margin = '0px';
  box.id = "inputbox";
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
    var text = document.getElementById("inputbox-input");
    if(text.value){
      vscode.postMessage({
        type: "onInsert",
        value: text.value,
        style: style
      })
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

//---------------------------tips tool---------------------------------//
function createInfoBox(x, y, element){
  closeInputBox();
  let inputbox = createBasicBox(x, y);
  inputbox.style.backgroundColor = 'white';
  inputbox.style.border = '1px solid black';
  inputbox.id = "inputbox";
  if(element.tagName !== "BODY"){
    inputbox.innerText = element.outerHTML;
  }
  else{
    inputbox.innerText = "document body";
  }
  document.body.appendChild(inputbox);
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
    button.parentNode.removeChild(inputBox);
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

function createChatBox(){
  outer = document.createElement("div");
  outer.id = "chatBotOuter";
  document.body.appendChild(outer);
  
  outer.style.position = "absolute";
  outer.style.right = "0px";
  outer.style.top = "0px";
  outer.style.padding = "20px";
  outer.style.width = "300px";
  
  // chatbox = document.createElement("div");
  // chatbox.id = "chatBotCommandDescription";
  // outer.appendChild(chatbox);
  
  // inputBox = document.createElement("div");
  // inputBox.id = "inputBox";
  // outer.appendChild(inputBox);
  // inputBox.style = "position: relative; display: inline-block";
  
  input = document.createElement("input");
  input.type = "text";
  input.id = "humanInput";
  input.placeholder = "i.e Change the font size";
  outer.appendChild(input);
  input.style = "font-size:14px; border: 1px solid #ddd; width: 250px;";
  
  // submitButton = document.createElement("button");
  // submitButton.id = "submitButton";
  // submitButton.innerHTML = "Submit";
  // outer.appendChild(submitButton);
  // submitButton.style = "border: 1px solid #ddd; background-color: darkcyan; color: #fff; padding: 8px; cursor: pointer; float: right;";
  
  
  
  chat = document.createElement("div");
  chat.id = "chatBot";
  outer.appendChild(chat);
  
  indicator = document.createElement("div");
  indicator.id = "chatBotThinkingIndicator";
  chat.appendChild(indicator);
  
  hist = document.createElement("div");
  hist.id = "chatBotHistory";
  hist.style = "overflow-x: scroll";
  chat.appendChild(hist);
  
  var config = {
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

var moving = false;
var lastX = null, lastY = null;
var translateX = 0, translateY = 0;
var div, selector;
var rectX, rectY;

function dragStart(e) {
  if (e.target.tagName.toLowerCase() === 'img'){
    e.preventDefault();
  }
  if (mode == 1 && e.target.id != "navbar" && e.target.parentNode.id != "navbar"){
    div = e.target;
    
    rectX = div.getBoundingClientRect()['x'];
    rectY = div.getBoundingClientRect()['y'];
    
    transformValue = window.getComputedStyle(div).transform;
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

function drag(e) {
  if (moving) {
    if (lastX&&lastY){
      var pX = e.clientX - lastX;
      var pY = e.clientY - lastY;
      translateX += pX;
      translateY += pY;
      div.style.transform = "translate(" + translateX + "px, " + translateY + "px)";
    }
    lastX = e.clientX;
    lastY = e.clientY;
    
  }
}

function dragEnd(e) {
  
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


