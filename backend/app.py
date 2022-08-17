# import numpy as np
from sqlite3 import Timestamp
from tracemalloc import start
from turtle import clone, ht
from flask import Flask, request
from flask_cors import CORS, cross_origin
import json
from matplotlib.pyplot import text
import nlpcloud
import pymongo
from bson.objectid import ObjectId
import json
import datetime
from txtai.embeddings import Embeddings
try:
    from BeautifulSoup import BeautifulSoup
except ImportError:
    from bs4 import BeautifulSoup
from html.parser import HTMLParser
import spacy
nlp = spacy.load('en_core_web_sm')

# Create embeddings model, backed by sentence-transformers & transformers
embeddings = Embeddings({"path": "sentence-transformers/nli-mpnet-base-v2"})

# Create flask app
flask_app = Flask(__name__)
cors = CORS(flask_app)
client = nlpcloud.Client(
    "fast-gpt-j", "aba1569138b09087b8a839356381010dd56d6679", gpu=True, lang="en")
client = pymongo.MongoClient(
    "mongodb://user:user@ac-yuhr5lt-shard-00-00.menscjh.mongodb.net:27017,ac-yuhr5lt-shard-00-01.menscjh.mongodb.net:27017,ac-yuhr5lt-shard-00-02.menscjh.mongodb.net:27017/?ssl=true&replicaSet=atlas-n1yyxs-shard-0&authSource=admin&retryWrites=true&w=majority")
db = client["copilot_plus_plus"]


@flask_app.route("/db/insertLog", methods=["POST"])
def insertLog():
    logCol = db["log"]
    body = request.json

    log = {
        "userId": body["userId"],  # user id
        "event": body["event"],  # event title
        "label": body["label"],  # label that user entered
        "details": body["details"],  # human readable comment
        "createDate": datetime.datetime.now()  # timestamp
    }
    if body["event"] == "insert":
        if "code" not in body or body["code"] == "":
            log["done"] = False
        else:
            log["code"] = body["code"]
        log["rId"] = body["rid"]
        log["scripts"] = []
        if body["madeFrom"] != "":
            newestLog = getNewestLogByRID(body["userId"], body["madeFrom"])
            if "scripts" in newestLog:
                log["scripts"] = newestLog["scripts"]
    else:
        log["code"] = body["code"]
        log["rId"] = body["rid"]
        newest = getNewestLogByRID(body["userId"], body["rid"])
        if "scripts" in newest:
            log["scripts"] = newest["scripts"]
        else:
            log["scripts"] = []
    result = logCol.insert_one(log)
    return str(result.inserted_id)  # return the id of the inserted document


@flask_app.route("/db/updateCode", methods=["POST"])
def updateCode():
    logCol = db["log"]
    body = request.json
    newest = getNewestLogByRID(body["userId"], body["rid"])

    newest["event"] = body["event"]
    newest["code"] = body["code"]
    newest["details"] = body["details"]
    newest["createDate"] = datetime.datetime.now()

    newest.pop('_id', None)

    result = logCol.insert_one(newest)
    return str(result.inserted_id)


@flask_app.route("/db/updateCodes", methods=["POST"])
def updateCodes():
    logCol = db["log"]
    body = request.json

    for rid in body["elements"]:
        # update code in db
        logCol.update_one({
            'rId': rid
        }, {
            '$set': {
                'code': body["elements"][rid]
            }
        }, upsert=False)

    return str("Completed")


@flask_app.route("/db/insertGroup", methods=["POST"])
def insertGroup():
    logCol = db["template"]
    body = request.json

    log = {
        "userId": body["userId"],  # user id
        "event": body["event"],  # event title
        "label": body["label"],  # label that user entered
        "member": body["member"],
        # "details": body["details"] , # human readable comment
        "createDate": datetime.datetime.now(),  # timestamp
        "rId": body["rId"]
    }

    result = logCol.insert_one(log)
    return json.dumps({"sucess": True})

# get all groups for a user


@flask_app.route("/db/getGroupsByUser", methods=["POST"])
def getGroupsByUser():
    body = request.json
    key = {'userId': body["userId"]}

    logCol = db["template"]
    cursor = logCol.find(key)
    results = []
    for result in cursor:
        results.append(result)
    return json.dumps(results)


@flask_app.route("/db/completeLog", methods=["POST"])
def completeLog():
    logCol = db["log"]
    body = request.json
    cursor = logCol.find(
        {"userId": body["userId"], "done": False, "event": "insert"})
    count = 0
    for result in cursor:
        if result["rId"] in body["inserted"].keys():
            logCol.update_one({
                '_id': result['_id']
            }, {
                '$set': {
                    'done': True,
                    'code': body["inserted"][result["rId"]]
                }
            }, upsert=False)
            count += 1
    return str(count)  # return the id of the inserted document


@flask_app.route("/db/appendScript", methods=["POST"])
def appendScript():
    logCol = db["log"]
    body = request.json
    newest = getNewestLogByRID(body["userId"], body["rid"])
    if "scripts" in newest:
        newest["scripts"].append(body["script"])
    else:
        newest["scripts"] = [body["script"]]
    newest["event"] = body["event"]
    newest["code"] = body["code"]
    newest["details"] = body["details"]
    newest["createDate"] = datetime.datetime.now()

    newest.pop('_id', None)

    result = logCol.insert_one(newest)
    return str(result.inserted_id)


@flask_app.route("/db/completeJSLog", methods=["POST"])
def completeJSLog():
    logCol = db["log"]
    body = request.json
    cursor = logCol.find(
        {"userId": body["userId"],  "event": "insert", "done": False})
    count = 0
    for result in cursor:
        if result["rId"] in body["inserted"].keys() and (
                not result["done"] or
                result["code"] != body["inserted"][result["rId"]]):
            logCol.update_one({
                '_id': result['_id']
            }, {
                '$set': {
                    'done': True,
                    'code': body["inserted"][result["rId"]],
                    'updateDate': datetime.datetime.now()
                }
            }, upsert=False)
            count += 1
    return str(count)  # return the id of the inserted document


@flask_app.route("/db/getLogs", methods=["GET"])
@cross_origin()
def getLogs():
    logCol = db["log"]
    userId = request.args.get('userId')

    cursor = logCol.find({"userId": userId})
    results = []
    for result in cursor:
        results.append(result)
    newList = sorted(results, key=lambda k: k['createDate'], reverse=True)
    return json.dumps(newList, default=str)


@flask_app.route("/db/deleteLogs", methods=["GET"])
@cross_origin()
def deleteLogs():
    logCol = db["log"]
    # userId = request.args.get('userId')
    dataId = request.args.get('dataId')

    result = logCol.delete_one({"_id": ObjectId(dataId)})

    return json.dumps(result.deleted_count, default=str)


# testing api
# @flask_app.route("/similarity", methods = ["GET"])
def similarity(userId, txt):
    data = getAllLabels(userId)
    if len(data) > 0:
        results = embeddings.similarity(txt, data)
        return True, results, data  # json.dumps(uid, default=str),
    # print("...")
    return False, False, False


def getAllLabels(userId):
    key = {'userId': userId}

    logCol = db["log"]
    cursor = logCol.find(key)
    results = []
    for result in cursor:
        if "label" in result and result["label"] not in results:
            results.append(result["label"])
    return results


def getAllGroups(userId):
    key = {'userId': userId}

    templateCol = db["template"]
    cursor = templateCol.find(key)
    results = []
    for result in cursor:
        if "label" in result and result["label"] not in results:
            results.append(result["label"])
    return results


@flask_app.route("/db/getTextByNLP", methods=["POST"])
def getTextByNLP():
    logCol = db["log"]
    body = request.json

    cursor = logCol.find({"userId": body["userId"], "nlp": body["nlp"]})
    success, similarities, allLabels = similarity(body["userId"], body["nlp"])
    if not success:
        return json.dumps({"success": False})

    if similarities[0][1] > 0.5:
        cursor = logCol.find(
            {"userId": body["userId"], "label": allLabels[similarities[0][0]]})
        results = []
        for result in cursor:
            results.append(result)
        newlist = sorted(results, key=lambda x: x["createDate"], reverse=True)
        return json.dumps({"success": True, "text": newlist[0]["text"], "all": newlist[0]}, default=str)
    else:
        return json.dumps({"success": False})


@flask_app.route("/db/getLogByRID", methods=["POST"])
def getLogByRID():
    logCol = db["log"]
    body = request.json

    cursor = logCol.find({"userId": body["userId"], "rId": body["rId"]})
    results = []
    for result in cursor:
        results.append(result)
    newlist = sorted(results, key=lambda x: x["createDate"], reverse=True)
    return json.dumps(newlist, default=str)


@flask_app.route("/db/getLogByNLP", methods=["POST"])
def getLogByNLP():
    logCol = db["log"]
    body = request.json
    print(body)

    cursor = logCol.find({"userId": body["userId"], "nlp": body["nlp"]})
    success, similarities, allLabels = similarity(body["userId"], body["nlp"])
    results = []

    if success:
        for i in range(len(similarities)):
            if similarities[i][1] > 0.5:
                cursor = logCol.find(
                    {"userId": body["userId"], "label": allLabels[similarities[i][0]]})
                newest = {}
                for log in cursor:
                    rId = log["rId"]
                    if rId not in newest or newest[rId]["createDate"] < log["createDate"]:
                        newest[rId] = log
                for log in newest.values():
                    log["isGroup"] = False
                    scripts = {}
                    if "scripts" in log:
                        for rid in log["scripts"]:
                            newestScript = getNewestLogByRID(
                                body["userId"], rid)
                            scripts[rid] = {
                                "code": newestScript["code"], "nlp": newestScript["label"]}
                    log["scripts"] = scripts
                    results.append(log)

    groups = getAllGroups(body["userId"])
    groupResults = []
    templateCol = db["template"]
    if len(groups) > 0:
        similarities = embeddings.similarity(body["nlp"], groups)
        for i in range(len(similarities)):
            if similarities[i][1] > 0.5:
                cursor = templateCol.find(
                    {"userId": body["userId"], "label": groups[similarities[i][0]]})
                newest = {}
                for log in cursor:
                    rId = log["rId"]
                    if rId not in newest or newest[rId]["createDate"] < log["createDate"]:
                        newest[rId] = log
                for log in newest.values():
                    members = log["member"].keys()
                    codes = []
                    scripts = {}
                    for member in members:
                        codes.append(getNewestCodeByRID(
                            body["userId"], member))
                        memberLog = getNewestLogByRID(body["userId"], member)
                        if "scripts" in memberLog:
                            for sid in memberLog["scripts"]:
                                newestScript = getNewestLogByRID(
                                    body["userId"], sid)
                                scripts[sid] = {
                                    "code": newestScript["code"], "nlp": newestScript["label"]}
                    log["codes"] = codes
                    log["isGroup"] = True
                    log["scripts"] = scripts
                    groupResults.append(log)

    if len(results) > 0 or len(groupResults) > 0:
        return json.dumps({"success": True, "all": results, "groups": groupResults}, default=str)
    else:
        return json.dumps({"success": False})


@flask_app.route("/db/getSuggestedGroups", methods=["POST"])
def getSuggestedGroups():
    logCol = db["template"]
    body = request.json
    cursor = logCol.find({"userId": body["userId"]})
    results = []
    for group in cursor:
        member = group["member"]
        repeated = []
        rids = list(member.keys()).copy()
        labels = list(member.values()).copy()
        allLabels = body["all"].copy()
        allLabels.insert(0, body["inserted"])
        for i in range(len(allLabels)):
            # print(allLabels[i])
            similarity = embeddings.similarity(allLabels[i], labels)[0]
            if similarity[1] > 0.5:
                oldLabel = labels[similarity[0]]
                repeated.append({"old": oldLabel, "new": allLabels[i]})
                labels.remove(oldLabel)
                rids.remove(rids[similarity[0]])
            elif i == 0:
                break

            if len(labels) == 0:
                break
        # print(repeated)

        if len(repeated) > 0:
            remaining = []
            for i in range(len(labels)):
                code = getNewestCodeByRID(body["userId"], rids[i])
                remaining.append(
                    {"label": labels[i], "rid": rids[i], "code": code})
            if len(remaining) > 0:
                # For Now Just assume no repeated scripts and all that stuff :(
                scripts = {}
                for m in remaining:
                    memberLog = getNewestLogByRID(body["userId"], m["rid"])
                    if "scripts" in memberLog:
                        for sid in memberLog["scripts"]:
                            newestScript = getNewestLogByRID(
                                body["userId"], sid)
                            scripts[sid] = {
                                "code": newestScript["code"], "nlp": newestScript["label"]}
                results.append({"group": group, "repeated": repeated,
                               "remaining": remaining, "scripts": scripts})
    sortedList = sorted(results, key=lambda x: len(
        x["repeated"]), reverse=True)
    return json.dumps(sortedList, default=str)


def getNewestCodeByRID(userId, rid):
    logCol = db["log"]

    cursor = logCol.find({"userId": userId, "rId": rid})
    results = []
    for result in cursor:
        results.append(result)
    newlist = sorted(results, key=lambda x: x["createDate"], reverse=True)
    return newlist[0]["code"]


def getNewestLogByRID(userId, rid):
    logCol = db["log"]

    cursor = logCol.find({"userId": userId, "rId": rid})
    results = []
    for result in cursor:
        results.append(result)
    newlist = sorted(results, key=lambda x: x["createDate"], reverse=True)
    return newlist[0]


@flask_app.route("/db/getGroupLogs", methods=["GET"])
@cross_origin()
def getGroupLogs():
    logCol = db["template"]
    userId = request.args.get('userId')

    cursor = logCol.find({"userId": userId})
    results = []
    for result in cursor:
        results.append(result)
    newList = sorted(results, key=lambda k: k['createDate'], reverse=True)
    return json.dumps(newList, default=str)


@flask_app.route("/db/getGroupLogsWithCode", methods=["GET"])
@cross_origin()
def getGroupLogsWithCode():
    logCol = db["template"]
    userId = request.args.get('userId')

    cursor = logCol.find({"userId": userId})
    results = []
    for result in cursor:
        codes = {}
        for member in result["member"]:
            memberLog = getNewestLogByRID(userId, member)
            codes[member] = memberLog["code"]
        result["codes"] = codes
        results.append(result)
    newList = sorted(results, key=lambda k: k['createDate'], reverse=True)
    return json.dumps(newList, default=str)


@flask_app.route("/db/editGroupLog", methods=["POST"])
@cross_origin()
def editGroupLog():
    logCol = db["template"]
    body = request.json
    cursor = logCol.find({"userId": body["userId"], "rId": body["rId"]})
    count = 0
    for result in cursor:
        count += 1
        logCol.update_one({
            '_id': result['_id']
        }, {
            '$set': {
                'member': body["member"],
                'createDate': datetime.datetime.now(),
            }
        }, upsert=False)
    return str(count)


@flask_app.route("/db/parseHTML", methods=["POST"])
def parseHTMLTest():
    htmlString = request.json["html"]
    return json.dumps(parseHTML(htmlString))


def parseHTML(htmlString):
    results = []
    soup = BeautifulSoup(htmlString, "html.parser")
    # print(soup.prettify())
    htmlString = soup.prettify()

    class MyHTMLParser(HTMLParser):
        def handle_starttag(self, tag, attrs):
            #print("Encountered a start tag:", tag)
            results.append(
                {"event": "start tag", "tag": tag, "attrs": parseAttrs(attrs)})

        def handle_endtag(self, tag):
            #print("Encountered an end tag :", tag)
            results.append({"event": "end tag", "tag": tag})

        def handle_data(self, data):
            #print("Encountered some data  :", data)
            results.append({"event": "innerText", "text": data})

        def handle_startendtag(self, tag, attrs):
            #print("Encountered start end tag  :", tag, attrs)
            results.append(
                {"event": "startend tag", "tag": tag, "attrs": parseAttrs(attrs)})

    parser = MyHTMLParser()
    parser.feed(htmlString)

    return results

# Assume <></>


def parseAttrs(attrs):
    formatedAttrs = attrs[:]
    formatedAttrs = [{"attr": x[0], "value": x[1], "isStyle": False}
                     for x in formatedAttrs if x[0].lower() != "style"]
    # print(formatedAttrs)
    # get the attrs with [0] = 'style'
    style = [attr for attr in attrs if attr[0].lower() == 'style']
    # print("style ", style)
    if len(style) > 0:
        style = style[0]
    if style:
        # split style on ;
        allStyles = style[1].split(';')
        #print("allStyles ", allStyles)
        for allStyle in allStyles:
            # split on :
            if allStyle.strip() == "":
                continue
            # print(allStyle.split(':'))
            splitStyle = allStyle.split(':')
            # remove whitespace
            styleName = splitStyle[0].strip()
            styleValue = splitStyle[1].strip()
            # add to attrs
            formatedAttrs.append(
                {"attr": styleName, "value": styleValue, "isStyle": True})
    return formatedAttrs


@flask_app.route("/db/parseHTMLs", methods=["POST"])
def compareHTMLTest():
    htmlStrings = request.json["htmls"]
    return json.dumps(compareHTML(htmlStrings))


@flask_app.route("/db/getProbabilities", methods=["POST"])
def getProbabilitiesPost():
    nlp = request.json["nlp"]
    body = request.json
    return json.dumps(getProbabilities(nlp, body["userId"]))


def getProbabilities(nlp, userId):
    logCol = db["log"]
    success, similarities, allLabels = similarity(request.json["userId"], nlp)
    if not success:
        return json.dumps({"success": False, "labels": allLabels})
    htmlCodes = []
    for i in range(len(similarities)):
        if similarities[i][1] > 0.5:
            label = allLabels[similarities[i][0]]

            cursor = logCol.find(
                {"userId": userId, "label": allLabels[similarities[i][0]]})
            newest = {}
            for log in cursor:
                rId = log["rId"]
                if rId not in newest or newest[rId]["createDate"] < log["createDate"] and ("done" not in log or log["done"]):
                    newest[rId] = log
            for log in newest.values():
                if "code" in log and log["code"].strip() != "":
                    htmlCodes.append({"html": log["code"]})
        else:
            break
    # print(htmlCodes)

    return compareHTML(htmlCodes)


def compareHTML(htmlStrings):
    parsed = []
    count = []
    ignore = ['width', 'height', 'transform']
    for htmlString in htmlStrings:
        # ret = parseHTML(htmlString["html"])[2:4]
        # ret[0]['innerText'] = ret[1]['text']
        # recordToCount(count, 'tag', ret[0]['tag'])
        # recordToCount(count, 'innerText', ret[0]['innerText'])

        # for attr in ret[0]['attrs']:
        #     if attr['attr'] not in ignore:
        #         recordToCount(count, attr['attr'], attr['value'])
        # parsed.append(ret[0])
        ret = parseHTML(htmlString["html"])

        for r in ret:
            print(r)
        print("result ", recordElementToCount(ret, count))
    # print("------------------------------")
    # print(count)
    # print("------------------------------")
    # get keys in count
    # keys = list(count.keys())
    # validOptions = {}
    # for key in keys:
    #     keys2 = list(count[key].keys())
    #     for key2 in keys2:
    #         if count[key][key2] >= len(htmlStrings)*0.3:
    #             if key not in validOptions:
    #                 validOptions[key] = {}
    #             validOptions[key][key2] = count[key][key2]/len(htmlStrings)
    # print(validOptions)

    # return validOptions
    validOptions = getValidOptionsFromCount(count, len(htmlStrings))
    print(validOptions)
    return validOptions

# count tag:{value:#}, attr: {value: #}, child: [firstchild, secondchild, ...]
# firstchild: {tag: #, attr: {value: #}, child: [firstchild, secondchild, ...]}, basically another "count"


def getValidOptionsFromCount(count, total):
    validOptions = []
    for element in count:
        print(element)
        keys = list(element.keys())
        validOptionsSub = {}
        for key in keys:  # stuff like tag, attr, child
            # check if count[key] is a list
            print("element key")
            print(element[key])
            if isinstance(element[key], list):
                # loop and recursion
                validOptionsSub[key] = []
                # for item in element[key]:
                #   if item != {}:
                # print(item)
                childOptions = getValidOptionsFromCount(element[key], total)
                if childOptions != {}:
                    validOptionsSub[key].append(childOptions)
            else:
                keys2 = list(element[key].keys())
                for key2 in keys2:
                    if element[key][key2] >= total*0.3:
                        if key not in validOptionsSub:
                            validOptionsSub[key] = {}
                        validOptionsSub[key][key2] = element[key][key2]/total
        if validOptionsSub != {}:
            validOptions.append(validOptionsSub)
    # print(validOptions)
    return validOptions


IGNORE_ATTRS = ['width', 'height', 'transform',
                "nlp", "rid", "position", "top", "left"]

# Just ignore child element & innerText for now...


def recordElementToCount(parsedHTML, count):
    if count == None:
        count = []

    numChild = 0  # child count
    i = 1  # log count
    while i < len(parsedHTML):
        element = parsedHTML[i]

        # if the element is "event": "end tag"
        if element['event'] == 'end tag':
            #print(element["event"]+" "+element["tag"])
            return i  # The number of records this element takes up

        # probably should make a working version first then a clean version, but whatever
        child_count = {}
        if numChild+1 > len(count):
            count.append(child_count)
        else:
            print(numChild)
            print(count)
            child_count = count[numChild]

        # if the element is "event": "innerText"
        if element['event'] == 'innerText':
            # print(element["event"])
            # questionable, but assume innerText is a tag
            textEdited = element['text'].translate(
                {ord(c): None for c in ' \n\t'})
            if textEdited != "":
                recordToCount(child_count, 'tag', "innerText")
                recordToCount(child_count, 'innerText_text', element['text'])
            # print(count["element_childrens"])

        # if the element is "event": "startend tag"
        if element['event'] == 'startend tag':
            #print(element["event"]+" "+element["tag"])
            # record tag and attrs, no child
            recordToCount(child_count, 'tag', element['tag'])

            for attr in element['attrs']:
                if attr['attr'] not in IGNORE_ATTRS:
                    recordToCount(child_count, attr['attr'], attr['value'])

        # if the element is "event": "start tag" :(
        if element['event'] == 'start tag':
            #print(element["event"]+" "+element["tag"])
            index = parsedHTML.index(element)
           # print("index: ", index)
            splicedParsedHTML = parsedHTML[index:]
            print("splicedParsedHTML: ", splicedParsedHTML)
            start = splicedParsedHTML[0]
            recordToCount(child_count, 'tag', start['tag'])
            for attr in start['attrs']:
                if attr['attr'] not in IGNORE_ATTRS:
                    recordToCount(child_count, attr['attr'], attr['value'])

            if "element_childrens" not in child_count:
                child_count["element_childrens"] = []

            i += recordElementToCount(splicedParsedHTML,
                                      child_count["element_childrens"])

        numChild += 1
        i += 1
    print(count)
    return i

# def recordElementToCount(parsedHTML, count):
#     # assume the first element in parsedHTML is always "event": "start tag"
#     start = parsedHTML[0]
#     # count is going to be the count dic for this element
#     if count == None:
#         count = {}
#     # record the element's tag to count
#     recordToCount(count, 'tag', start['tag'])
#     # if the element has attributes, record them to count
#     for attr in start['attrs']:
#         if attr['attr'] not in IGNORE_ATTRS:
#             recordToCount(count, attr['attr'], attr['value'])

#     numChild = 0  # child count
#     i = 1  # log count
#     if "element_childrens" not in count:
#         count["element_childrens"] = []
#     #print("starting with tag, ", start['tag'])
#     #print("inital count: ", count)

#     # loop over all the elements in parsedHTML
#     while i < len(parsedHTML):
#         element = parsedHTML[i]

#         # if the element is "event": "end tag"
#         if element['event'] == 'end tag':
#             #print(element["event"]+" "+element["tag"])
#             return i+2  # The number of records this element takes up

#         # probably should make a working version first then a clean version, but whatever
#         child_count = {}
#         if numChild+1 > len(count["element_childrens"]):
#             count["element_childrens"].append(child_count)
#         else:
#             child_count = count["element_childrens"][numChild]

#         # if the element is "event": "innerText"
#         if element['event'] == 'innerText':
#             # print(element["event"])
#             # questionable, but assume innerText is a tag
#             textEdited = element['text'].translate(
#                 {ord(c): None for c in ' \n\t'})
#             if textEdited != "":
#                 recordToCount(child_count, 'tag', "innerText")
#                 recordToCount(child_count, 'innerText_text', element['text'])
#             # print(count["element_childrens"])

#         # if the element is "event": "startend tag"
#         if element['event'] == 'startend tag':
#             #print(element["event"]+" "+element["tag"])
#             # record tag and attrs, no child
#             recordToCount(child_count, 'tag', element['tag'])

#             for attr in element['attrs']:
#                 if attr['attr'] not in IGNORE_ATTRS:
#                     recordToCount(child_count, attr['attr'], attr['value'])

#         # if the element is "event": "start tag" :(
#         if element['event'] == 'start tag':
#             #print(element["event"]+" "+element["tag"])
#             # recursion
#             # I really doubt this will work, but whatever...
#             index = parsedHTML.index(element)
#            # print("index: ", index)
#             splicedParsedHTML = parsedHTML[index:]
#             # print("child parsedHTML: ", splicedParsedHTML)
#            # print("i: ", i)
#            # print(splicedParsedHTML)
#             i += recordElementToCount(splicedParsedHTML, child_count) - 2

#         numChild += 1
#         i += 1
#     return "yeah this means there is a bug or the user's html is wrong"


def recordToCount(count, key, value):
    if key in count:
        valueEdited = value.translate({ord(c): None for c in ' \n\t'})
        valueStripped = value.strip().strip('\n')
        if valueStripped in count[key] and valueEdited != "":
            count[key][valueStripped] += 1
        else:
            count[key][valueStripped] = 1
    else:
        count[key] = {value: 1}


@flask_app.route('/split_text', methods=['POST'])
@cross_origin()
def split_text():
    body = request.json
    text = body["text"]
    PRONOUNS = ["i", "me", "my", "mine", "you", "he", "she", "it",
                "they", "them", "we", "us", "our", "ours"
                "her", "his", "hers", "its",
                "their", "yours", "theirs", "your"]

    result = []
    for sentence in text:
        doc = nlp(sentence)
        parsed = []
        for chunk in doc.noun_chunks:
            if chunk.text.lower() not in PRONOUNS:
                parsed.append(
                    {"chunk": chunk.text, "probabilities": getProbabilities(chunk.text, body["userId"])})
        result.append(parsed)
    return json.dumps({"text": text, "result": result})


if __name__ == "__main__":
    flask_app.run(debug=True)
