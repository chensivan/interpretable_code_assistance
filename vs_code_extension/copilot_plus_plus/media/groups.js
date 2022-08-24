const vscode = acquireVsCodeApi();
const URL = "http://127.0.0.1:5000";
let GROUPSPANEL = document.getElementById("groups");
let VIEWBTN = document.getElementById("view-btn");
let ADDBTN = document.getElementById("add-btn");
let SEARCHBTN = document.getElementById("search-btn");
let MODE = "VIEW"
let CURRENTGROUP = undefined;

console.log("starting scripts for groups");
vscode.postMessage({ type: 'getGroups' });

window.addEventListener('message', event => {
    
    const message = event.data; // The JSON data our extension sent
    
    switch (message.command) {
        case 'addElement':
        //assume have rid for now
        if(MODE === "ADD"){
            addElementToGroup(message.element, message.rid, message.label);
        }
        else if(MODE === "VIEW"){
            //TODO
            addElementToExistingGroup(message.element, message.rid, message.label);
            
        }
        break;
        case 'completeCreateGroup':
        console.log("completeCreateGroup");
        clearAllChild(GROUPSPANEL);
        GROUPSPANEL.appendChild(document.createTextNode("Done"));
        //TODO
        break;
        case 'setupViewGroups':
        console.log("setupViewGroups");
        setupViewGroups(message.data);
        //TODO
        break;
        case 'displaySearchQuery':
        console.log("displaySearchQuery");
        displaySearchQuery(message.query, message.data);
        break;
    }
});

console.log(ADDBTN);
function clearAllChild(element){
    while(element.firstChild){
        element.removeChild(element.firstChild);
    }
}
ADDBTN.addEventListener("click", function () {
    console.log("clicked addbtn");
    MODE = "ADD"
    CURRENTGROUP = undefined;
    //remove all child of GROUPSPANEL
    clearAllChild(GROUPSPANEL);
    setupAddGroup();  
});

VIEWBTN.addEventListener("click", function () {
    console.log("clicked viewbtn");
    MODE = "VIEW"
    CURRENTGROUP = undefined;
    //remove all child of GROUPSPANEL
    clearAllChild(GROUPSPANEL);
    vscode.postMessage({ type: 'getGroups' });
});

SEARCHBTN.addEventListener("click", function () {
    console.log("clicked searchbtn");
    MODE = "SEARCH"
    CURRENTGROUP = undefined;
    //remove all child of GROUPSPANEL
    clearAllChild(GROUPSPANEL);
    vscode.postMessage({ type: 'searchGroups' });
});

function addElementToExistingGroup(element, rid, label){
    console.log("addElementToExistingGroup");
    let newEle = document.createElement("div");
    newEle.innerText = label;
    // let h3 = document.createElement("h3");
    // h3.innerText = label;
    // newEle.appendChild(h3);
    newEle.setAttribute("rid", rid);
    newEle.setAttribute("label", label);
    newEle.className = "element";
    let rmbtn = document.createElement("button");
    rmbtn.innerText = "Remove";
    rmbtn.addEventListener("click", () => {
        CURRENTGROUP.removeChild(newEle);
    });
    newEle.appendChild(rmbtn);
    addCanvas(newEle, element, rid);
    CURRENTGROUP.appendChild(newEle);
}

function addElementToGroup(element, rid, label){
    let div = document.createElement("div");
    div.innerText = label+"\n"+element;
    div.className = "element";
    div.setAttribute("rid", rid);
    div.setAttribute("label", label);
    let rmbtn = document.createElement("button");
    rmbtn.innerText = "Remove";
    rmbtn.addEventListener("click", () => {
        GROUPSPANEL.removeChild(div);
        // let elements = GROUPSPANEL.getElementsByClassName("element");
        // for(let i = 0; i < elements.length; i++){
        //     if(elements[i].getAttribute("rid") == rid){
        //         GROUPSPANEL.removeChild(elements[i]);
        //     }
        // }
    });
    addCanvas(div, element, rid);
    div.appendChild(rmbtn);
    GROUPSPANEL.appendChild(div);
}

function setupAddGroup(){
    let h2 = document.createElement("h2");
    h2.innerText = "Create Group";
    GROUPSPANEL.appendChild(h2);
    let text = document.createElement("input");
    text.type = "text";
    text.placeholder = "Group Name";
    text.id = "group-name";
    let submit = document.createElement("button");
    submit.innerText = "Create Group";
    submit.addEventListener("click", () => {
        let name = text.value;
        if(name == ""){
            text.setAttribute("placeholder", "Group Name cannot be empty");
            return;
        }
        let elements = GROUPSPANEL.getElementsByClassName("element");
        let elementsArr = {};
        for(let i = 0; i < elements.length; i++){
            elementsArr[elements[i].getAttribute("rid")] = elements[i].getAttribute("label");
            // elementsArr.push(elements[i].innerText);
        }
        vscode.postMessage({
            type: "createGroup",
            label: name,
            member: elementsArr,
        });
    });
    GROUPSPANEL.appendChild(text);
    GROUPSPANEL.appendChild(submit);
    let add = document.createElement("button");
    add.innerHTML = "Add Element";
    GROUPSPANEL.appendChild(add);
    add.addEventListener("click", () => {
        vscode.postMessage({
            type: "findElement"
        });
    })
    
}

function addCanvas(parent, code, key){
    let newElement = document.createElement("span");
    newElement.innerHTML = code;
    newElement.id = key;
    newElement.style.display = "none";
    newElement.style.background = "transparent";
    newElement.style.padding = "15px 10px";
    document.body.appendChild(newElement);
    
    html2canvas(document.getElementById(key), {
        allowTaint: true,
        onclone: function (clonedDoc) {
            let temp = clonedDoc.getElementById(key);
            temp.style.display = "";
        },
    })
    .then((canvas) => {
        //canvas.style.height = "50px";
        canvas.style.maxHeight = "100px";
        canvas.style.width = "auto";
        canvas.style.border = "1px solid black";
        parent.appendChild(canvas);
        document.body.removeChild(document.getElementById(key));
    })
    .catch((err) => {
        document.body.removeChild(document.getElementById(key));
        console.log(err);
    });
}

function setupViewGroups(data){
    clearAllChild(GROUPSPANEL);
    let h2 = document.createElement("h2");
    h2.innerHTML = "View Groups";
    GROUPSPANEL.appendChild(h2);
    console.log(data);
    for(let i = 0; i < data.length; i++){
        let curData = data[i];
        let div = document.createElement("li");
        div.classList.add("list-group-item", "group");
        let h3 = document.createElement("h3");
        h3.innerText = curData.label + " ⏷";
        div.appendChild(h3);
        // div.innerText = curData.label;
        div.setAttribute("rid", curData.rId);
        div.setAttribute("label", curData.label);
        //div.className = "group";
        let allcode = "";
        let keys = Object.keys(curData.member);
        for(let j = 0; j < keys.length; j++){
            allcode += curData.codes[keys[j]];
        }
        addCanvas(div, allcode, "group" + i);
        div.addEventListener("click", () => {showDetailGroup(div, curData, data);} );
        GROUPSPANEL.appendChild(div);
    }
    
}

function showDetailGroup(div, curData, data){
    {
        //get the keys in data.member
        if(CURRENTGROUP && CURRENTGROUP.getAttribute("rid") !== div.getAttribute("rid")){
            //find child with className "element"
            console.log(CURRENTGROUP);
            //remove all child of CURRENTGROUP except for text node
            clearAllChild(CURRENTGROUP);
            let h3 = document.createElement("h3");
            h3.innerText = CURRENTGROUP.getAttribute("label") + " ⏷";;
            CURRENTGROUP.appendChild(h3);
            let allcode = "";
            let oldData = data.find((e) => {return e.rId == CURRENTGROUP.getAttribute("rid")});
            let keys = Object.keys(oldData.member);
            for(let j = 0; j < keys.length; j++){
                allcode += oldData.codes[keys[j]];
            }
            addCanvas(CURRENTGROUP, allcode, "oldgroup" );
            //setupViewGroups(data);
            //CURRENTGROUP.appendChild(document.createTextNode(CURRENTGROUP.getAttribute("label")));
        }
        else if(CURRENTGROUP){
            return;
        }
        CURRENTGROUP = div;
        
        let add = document.createElement("button");
        add.innerText = "Add Element";
        div.appendChild(add);
        add.addEventListener("click", () => {
            vscode.postMessage({
                type: "findElement"
            });
        });
        let save = document.createElement("button");
        save.innerHTML = "Save";
        div.appendChild(save);
        save.addEventListener("click", () => {
            let members = CURRENTGROUP.getElementsByClassName("element");
            let membersArr = {};
            for(let i = 0; i < members.length; i++){
                membersArr[members[i].getAttribute("rid")] = members[i].getAttribute("label");
            }
            console.log(membersArr);
            console.log(CURRENTGROUP);
            vscode.postMessage({
                type: "saveGroup",
                member: membersArr,
                rid: CURRENTGROUP.getAttribute("rid")
            })
            clearAllChild(CURRENTGROUP);
            let h3 = document.createElement("h3");
            h3.innerText = CURRENTGROUP.getAttribute("label");
            CURRENTGROUP.appendChild(h3);
            // CURRENTGROUP.appendChild(document.createTextNode(CURRENTGROUP.getAttribute("label")));
            // CURRENTGROUP = null;
            
        });
        
        let keys = Object.keys(curData.member);
        //let allcode = "";
        for(let j = 0; j < keys.length; j++){
            let key = keys[j]
            let element = document.createElement("div");
            element.innerText = curData.member[key];
            element.setAttribute("rid", key);
            element.setAttribute("label", curData.member[key]);
            element.className = "element";
            let rmbtn = document.createElement("button");
            rmbtn.innerText = "Remove";
            rmbtn.addEventListener("click", () => {
                console.log("Remove");
                element.parentElement.removeChild(element);
            });
            element.appendChild(rmbtn);
            addCanvas(element, curData.codes[key], key);
            //allcode += curData.codes[key];
            div.appendChild(element);
        }
        //addCanvas(div, allcode, "group" + i);
        
        
        
        // vscode.postMessage({
        //     type: "viewGroup",
        //     rid: curData.rid,
        //     label: curData.label,
        // });
    }
}
let ALLDATA = null;
function displaySearchQuery(query, data){
    let h2 = document.createElement("h2");
    h2.innerText = "NLP: "+query;
    GROUPSPANEL.appendChild(h2);
    ALLDATA = data;
    for(let i = 0; i < data.length; i++){
        let curGroup = data[i];
        let div = document.createElement("div");
        let h3 = document.createElement("h3");
        h3.innerText = curGroup.label;
        div.appendChild(h3);
        div.setAttribute("rid", curGroup.rId);
        div.setAttribute("label", curGroup.label);
        div.className = "group";
        div.setAttribute("codes", JSON.stringify(curGroup.codes));
        div.setAttribute("member", JSON.stringify(curGroup.member));
        let keys = Object.keys(curGroup.member);
        for(let j = 0; j < keys.length; j++){
            let key = keys[j]
            let element = document.createElement("div");
            element.innerText = curGroup.member[key];
            element.setAttribute("rid", key);
            element.setAttribute("label", curGroup.member[key]);
            element.className = "element";
            let addbtn = document.createElement("button");
            addbtn.innerText = "Add";
            addbtn.addEventListener("click", () => {
                console.log("Add");
                //TODO
                vscode.postMessage({
                    type: "insertElement",
                    code: curGroup.codes[j],
                    rid: key, //maybe later
                });

            });
            element.appendChild(addbtn);
            addCanvas(element, curGroup.codes[j], key);
            div.appendChild(element);
        }
        GROUPSPANEL.appendChild(div);
    }
}