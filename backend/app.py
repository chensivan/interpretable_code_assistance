# import numpy as np
from sqlite3 import Timestamp
from turtle import clone
from flask import Flask, request
from flask_cors import CORS, cross_origin
import json
import nlpcloud
import pymongo
from bson.objectid import ObjectId
import json
import datetime
from txtai.embeddings import Embeddings

# Create embeddings model, backed by sentence-transformers & transformers
embeddings = Embeddings({"path": "sentence-transformers/nli-mpnet-base-v2"})

# Create flask app
flask_app = Flask(__name__)
cors = CORS(flask_app)
client = nlpcloud.Client("fast-gpt-j", "aba1569138b09087b8a839356381010dd56d6679", gpu=True, lang="en")
client = pymongo.MongoClient("mongodb://user:user@ac-yuhr5lt-shard-00-00.menscjh.mongodb.net:27017,ac-yuhr5lt-shard-00-01.menscjh.mongodb.net:27017,ac-yuhr5lt-shard-00-02.menscjh.mongodb.net:27017/?ssl=true&replicaSet=atlas-n1yyxs-shard-0&authSource=admin&retryWrites=true&w=majority")
db = client["copilot_plus_plus"]

@flask_app.route("/db/insertLog", methods = ["POST"])
def insertLog():
    logCol = db["log"]
    body = request.json

    log = { 
        "userId": body["userId"], # user id
        "event": body["event"], # event title
        "label": body["label"], # label that user entered
        "text": body["text"], # text to feed to copilot
        "details": body["details"] , # human readable comment
        "createDate": datetime.datetime.now() # timestamp
        }
    if body["event"] == "insert":
        log["done"] = False
        log["rId"] = body["code"]
    else:
        log["code"] = body["code"]
        log["rId"] = body["rid"]

    result = logCol.insert_one(log)
    return str(result.inserted_id) # return the id of the inserted document

@flask_app.route("/db/insertGroup", methods = ["POST"])
def insertGroup():
    logCol = db["template"]
    body = request.json

    log = {
        "userId": body["userId"], # user id
        "event": body["event"], # event title
        "label": body["label"], # label that user entered
        "member": body["member"],
        # "details": body["details"] , # human readable comment
        "createDate": datetime.datetime.now(), # timestamp
        "rId": body["rId"]
        }

    result = logCol.insert_one(log)
    return str(result.inserted_id) # return the id of the inserted document

@flask_app.route("/db/completeLog", methods = ["POST"])
def completeLog():
    logCol = db["log"]
    body = request.json
    cursor = logCol.find({"userId": body["userId"], "done": False, "event": "insert"})
    count = 0
    for result in cursor:
        if result["rId"] in body["inserted"].keys():
            logCol.update_one({
                '_id': result['_id']
                    },{
                    '$set': {
                        'done': True,
                        'code': body["inserted"][result["rId"]]
                        }
                    }, upsert=False)
            count += 1
    return str(count) # return the id of the inserted document

@flask_app.route("/db/completeJSLog", methods = ["POST"])
def completeJSLog():
    logCol = db["log"]
    body = request.json
    cursor = logCol.find({"userId": body["userId"],  "event": "insert"})
    count = 0
    for result in cursor:
        if result["rId"] in body["inserted"].keys() and (
            not result["done"] or 
            result["code"] != body["inserted"][result["rId"]]):
            logCol.update_one({
                '_id': result['_id']
                    },{
                    '$set': {
                        'done': True,
                        'code': body["inserted"][result["rId"]],
                        'updateDate': datetime.datetime.now()
                        }
                    }, upsert=False)
            count += 1
    return str(count) # return the id of the inserted document


@flask_app.route("/db/getLogs", methods = ["GET"])
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

@flask_app.route("/db/deleteLogs", methods = ["GET"])
@cross_origin()
def deleteLogs():
    logCol = db["log"]
    # userId = request.args.get('userId')
    dataId = request.args.get('dataId')

    result = logCol.delete_one({"_id": ObjectId(dataId)})

    return json.dumps(result.deleted_count, default=str)


# testing api
#@flask_app.route("/similarity", methods = ["GET"])
def similarity(userId, txt):
    data = getAllLabels(userId)
    if len(data) > 0:
        results = embeddings.similarity(txt, data)
        return True, results, data#json.dumps(uid, default=str), 
    print("...")
    return False, False, False

def getAllLabels(userId):
    key = {'userId':userId}

    logCol = db["log"]
    cursor = logCol.find(key); 
    results = []
    for result in cursor:
        if "label" in result and result["label"] not in results:
            results.append(result["label"])
    return results


def getAllGroups(userId):
    key = {'userId':userId}

    templateCol = db["template"]
    cursor = templateCol.find(key); 
    results = []
    for result in cursor:
        if "label" in result and result["label"] not in results:
            results.append(result["label"])
    return results
    

@flask_app.route("/db/getTextByNLP", methods = ["POST"])
def getTextByNLP():
    logCol = db["log"]
    body = request.json

    cursor = logCol.find({"userId": body["userId"], "nlp": body["nlp"]})
    success, similarities, allLabels = similarity(body["userId"], body["nlp"])
    if not success:
        return json.dumps({"success": False})

    if similarities[0][1] > 0.5:
        cursor = logCol.find({"userId": body["userId"], "label":allLabels[similarities[0][0]]})
        results = []
        for result in cursor:
            results.append(result)
        newlist = sorted(results, key=lambda x: x["createDate"], reverse=True)
        return json.dumps({"success": True, "text": newlist[0]["text"], "all": newlist[0]}, default=str)
    else:
        return json.dumps({"success": False})

@flask_app.route("/db/getLogByRID", methods = ["POST"])
def getLogByRID():
    logCol = db["log"]
    body = request.json

    cursor = logCol.find({"userId": body["userId"], "rId": body["rId"]})
    results = []
    for result in cursor:
        results.append(result)
    newlist = sorted(results, key=lambda x: x["createDate"], reverse=True)
    return json.dumps(newlist, default=str)


@flask_app.route("/db/getLogByNLP", methods = ["POST"])
def getLogByNLP():
    logCol = db["log"]
    body = request.json

    cursor = logCol.find({"userId": body["userId"], "nlp": body["nlp"]})
    success, similarities, allLabels = similarity(body["userId"], body["nlp"])
    results = []
    
    if success:
        for i in range(len(similarities)):
            if similarities[i][1] > 0.5:
                cursor = logCol.find({"userId": body["userId"], "label":allLabels[similarities[i][0]]})
                newest = {}
                for log in cursor:
                    rId = log["rId"]
                    if rId not in newest or newest[rId]["createDate"] < log["createDate"]:
                        newest[rId] = log
                for log in newest.values():
                    log["isGroup"] = False
                    results.append(log)
    
    groups = getAllGroups(body["userId"])
    groupResults = []
    templateCol = db["template"]
    if len(groups) > 0:
        similarities = embeddings.similarity(body["nlp"], groups)
        for i in range(len(similarities)):
            if similarities[i][1] > 0.5:
                cursor = templateCol.find({"userId": body["userId"], "label":groups[similarities[i][0]]})
                newest = {}
                for log in cursor:
                    rId = log["rId"]
                    if rId not in newest or newest[rId]["createDate"] < log["createDate"]:
                        newest[rId] = log
                for log in newest.values():
                    members = log["member"].keys()
                    codes = []
                    for member in members:
                        codes.append(getNewestCodeByRID(body["userId"], member))
                    log["codes"] = codes
                    log["isGroup"] = True
                    groupResults.append(log)
        
    if len(results) > 0 or len(groupResults) > 0:
        return json.dumps({"success": True, "all": results, "groups": groupResults}, default=str)
    else:
        return json.dumps({"success": False})

@flask_app.route("/db/getSuggestedGroups", methods = ["POST"])
def getSuggestedGroups():
    logCol = db["template"]
    body = request.json
    cursor = logCol.find({"userId": body["userId"]})
    results = []
    for group in cursor:
        member = group["member"]
        repeated = []
        rids = list(member.keys())
        labels = list(member.values())
        allLabels =body["all"]
        allLabels.insert(0, body["inserted"])
        
        for i in range(len(allLabels)):
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
            
        if len(repeated) > 0:
            remaining = []
            for i in range(len(labels)): # TODO get the code of this element
                code = getNewestCodeByRID(body["userId"], rids[i])
                remaining.append({"label": labels[i], "rid": rids[i], "code": code})
            if len(remaining) > 0:
                results.append({"group": group, "repeated": repeated, "remaining": remaining})
    sortedList = sorted(results, key=lambda x: len(x["repeated"]), reverse=True)
    return json.dumps(sortedList, default=str)

def getNewestCodeByRID(userId, rid):
    logCol = db["log"]

    cursor = logCol.find({"userId": userId, "rId": rid})
    results = []
    for result in cursor:
        results.append(result)
    newlist = sorted(results, key=lambda x: x["createDate"], reverse=True)
    return newlist[0]["code"]

@flask_app.route("/db/getGroupLogs", methods = ["GET"])
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

@flask_app.route("/db/editGroupLog", methods = ["POST"])
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
                },{
                '$set': {
                    'member': body["member"],
                    'createDate': datetime.datetime.now(),
                    }
                }, upsert=False)
    return str(count)

if __name__ == "__main__":
    flask_app.run(debug=True)