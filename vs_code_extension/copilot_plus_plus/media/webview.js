
console.log("start");
var icons = document.getElementsByClassName('icon');
console.log(icons);



var mode = 0; // 0: select; 1: drag, 2: draw and insert
var icons = document.getElementsByClassName('icon');
document.getElementById("icon-tip").classList.add("selected");
for (var i = 0; i < icons.length; i++) {
  icons[i].addEventListener('click', handleSelectIcon);
}
// set navbar icon handler
function handleSelectIcon(event){
  var icon = event.target;
  if (icon.id === "icon-tip"){
    mode = 0; 
    selectIcon("icon-tip");
  } else if (icon.id === "icon-drag"){
    mode = 1;
    selectIcon("icon-drag");
  }
  else if (icon.id === "icon-insert"){
    mode = 2;
    selectIcon("icon-insert");
  }
  else if (icon.id === "icon-edit"){
    mode = 3;
    selectIcon("icon-edit");
  }
  else if (icon.id === "icon-resize"){
    mode = 4;
    selectIcon("icon-resize");
  }
  else if (icon.id === "icon-delete"){
    mode = 5;
    selectIcon("icon-delete");
  }
  else if (icon.id === "icon-js"){
    mode = 6;
    selectIcon("icon-js");
  }
  else if (icon.id === "icon-chat"){
    mode = 7;
    selectIcon("icon-chat");
    createChatBox();
  }
}


function selectIcon(iconName){
  const iconIds = ["icon-tip", "icon-drag", "icon-insert", "icon-edit", "icon-resize", "icon-delete", "icon-js", "icon-chat"];
  iconIds.map(name => {
    document.getElementById(name).classList.remove("selected");
    if(name === iconName){
      document.getElementById(name).classList.add("selected");
    }
  });
  closeInputBox();closeWidget();closeBorder(oldElmnt); closeChatBox();
}

var oldElmnt;
var chatBotSelector = true;
// show tooltip
const vscode = acquireVsCodeApi();
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

function closeInputBox(){
  var inputBox = document.getElementById("inputbox");
  if (inputBox){
    inputBox.parentElement.removeChild(inputBox);
  }
}


function closeWidget(){
  old = document.getElementById("widget");
  if(old){
    document.body.removeChild(old);
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


function createInfoBox(x, y, element){
  closeInputBox();
  inputbox = document.createElement("div");
  inputbox.style.position = "absolute";
  inputbox.style.top = y+"px";
  inputbox.style.left = x+"px";
  inputbox.style.margin = '0px';
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

function createDeleteBox(x, y, element){
  closeInputBox();
  closeChatBox();
  createInfoBox(x, y, element);
  inputbutton = document.createElement("button");
  inputbutton.id = "inputbox-button";
  inputbutton.innerText = "delete "+element.tagName;
  inputbutton.addEventListener("click", function() {
    vscode.postMessage({
      type: "delete",
      value: element.outerHTML
    })
    //remove child from body
    element.parentNode.removeChild(element);
    inputbox.parentNode.removeChild(inputbox);
  });
  document.querySelector("#inputbox").appendChild(document.createElement("br"));
  document.querySelector("#inputbox").appendChild(inputbutton);
}

function createInputBoxJs(x, y, element){
  closeInputBox();
  createInfoBox(x, y, element);
  //TODO
  let input1 = document.createElement("input");
  input1.id = "inputbox-event";
  input1.placeholder = "action event, ex. onclick";
  let input2 = document.createElement("input");
  input1.id = "inputbox-name";
  input2.placeholder = "function name, ex. sendMessage()";
  let script = document.createElement("textarea");
  script.id = "inputbox-script";
  script.placeholder = "action, ex. log Message to console.log";
  script.rows = "3";
  submitButton = document.createElement("button");
  submitButton.id = "submitButton";
  submitButton.innerHTML = "Submit";

  submitButton.addEventListener("click", function() {
    let temp = element.cloneNode(true);
    temp.setAttribute(input1.value, input2.value);
    vscode.postMessage({
      type: "createjs",
      old: element.outerHTML,
      new: temp.outerHTML,
      event: input1.value,
      name: input2.value,
      script: script.value
    })
  });

  document.querySelector("#inputbox").appendChild(document.createElement("br"));
  document.querySelector("#inputbox").appendChild(input1);
  document.querySelector("#inputbox").appendChild(document.createElement("br"));
  document.querySelector("#inputbox").appendChild(input2);
  document.querySelector("#inputbox").appendChild(document.createElement("br"));
  document.querySelector("#inputbox").appendChild(script);
  document.querySelector("#inputbox").appendChild(document.createElement("br"));
  document.querySelector("#inputbox").appendChild(submitButton);

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

function createInputBoxAttr(x, y, element){
  closeInputBox();
  inputbox = document.createElement("div");
  inputbox.style.position = "absolute";
  inputbox.style.top = y+"px";
  inputbox.style.left = x+"px";
  inputbox.style.margin = '0px';
  inputbox.id = "inputbox";
  // var text = "";
  const attrs = element.getAttributeNames().reduce((acc, name) => {
    //text = text + "<input type='text' value='"+name+"' /><input type='text' value='"+element.getAttribute(name)+"' />";
    return {...acc, [name]: element.getAttribute(name)};
  }, {});
  //parse attrs to json
  var json = JSON.stringify(attrs);
  inputbox.innerHTML = "<textarea rows='7' id='inputbox-text'>"+json+"</textarea><button id='inputbox-submit'>Submit</button><button id='inputbox-close'>X</button>";
  document.body.appendChild(inputbox);
  
  var submit = document.getElementById("inputbox-submit");
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
  
  var close = document.getElementById("inputbox-close");
  close.addEventListener("click", function() {
    closeInputBox();
  });
}

function createInputBox(x, y, style){
  closeInputBox();
  inputbox = document.createElement("div");
  inputbox.style.position = "absolute";
  inputbox.style.top = y+"px";
  inputbox.style.left = x+"px";
  inputbox.style.margin = '0px';
  inputbox.id = "inputbox";
  inputbox.innerHTML = "<input type='text' id='inputbox-input'/><button id='inputbox-submit'>Submit</button><button id='inputbox-close'>X</button>";
  
  document.body.appendChild(inputbox);
  
  var submit = document.getElementById("inputbox-submit");
  var type;
  if(mode == 0){
    type = "onInput";
  }
  else if (mode == 2){
    type = "onInsert";
  }
  submit.addEventListener("click", function() {
    var text = document.getElementById("inputbox-input");
    if(text.value){
      vscode.postMessage({
        type: type,
        value: text.value,
        style: style
      })
    }
    else{
      text.setAttribute("placeholder", "Please enter a value");
    }
  });
  
  var close = document.getElementById("inputbox-close");
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

var widget;
var x;
var y;
var finX;
var finY;
var ismousedown = false;
document.addEventListener("mousedown", function(event) {
  if(mode == 2 && event.target.id !== "inputbox" && event.target.parentElement.id !== "inputbox" && 
  event.target.id !== "navbar" && event.target.parentElement.id !== "navbar"){
    //get element with id widget and remove from body
    closeInputBox();
    closeWidget();
    closeBorder(oldElmnt);
    
    ismousedown = true;
    x = event.pageX;
    y = event.pageY;
    //create div element
    widget = document.createElement("div");
    widget.style.position = "absolute";
    widget.style.top = y+"px";
    widget.style.left = x+"px";
    widget.classList.add("widget");
    widget.id = "widget";
    //append to body
    document.body.appendChild(widget);
    ismousedown = true;
  }
});
document.addEventListener("mousemove", function(event) {
  if (ismousedown) {
    finX = event.pageX;
    finY = event.pageY;
    widget.style.width = finX - x + "px";
    widget.style.height = finY - y + "px";
    widget.style.display = "block";
    widget.style.border = '2px dashed #ccc';
  }
});
document.addEventListener("mouseup", function(event) {
  if(ismousedown){
    ismousedown = false;
    var style = "absolute position, position at top "+y+"px, left "+x+"px with width "+(finX-x)+"px and height "+(finY-y)+"px";
    createInputBox(x, finY, style);
  }
}
);

function initDraggable(element) {
  element.setAttribute("draggable", "true");
}