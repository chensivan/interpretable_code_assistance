# import numpy as np
from sqlite3 import Timestamp
from flask import Flask, request
import json
import nlpcloud
import pymongo
import json
import datetime
from txtai.embeddings import Embeddings

# Create embeddings model, backed by sentence-transformers & transformers
embeddings = Embeddings({"path": "sentence-transformers/nli-mpnet-base-v2"})

# Create flask app
flask_app = Flask(__name__)
client = nlpcloud.Client("fast-gpt-j", "aba1569138b09087b8a839356381010dd56d6679", gpu=True, lang="en")
client = pymongo.MongoClient("mongodb://user:user@ac-yuhr5lt-shard-00-00.menscjh.mongodb.net:27017,ac-yuhr5lt-shard-00-01.menscjh.mongodb.net:27017,ac-yuhr5lt-shard-00-02.menscjh.mongodb.net:27017/?ssl=true&replicaSet=atlas-n1yyxs-shard-0&authSource=admin&retryWrites=true&w=majority")
db = client["copilot_plus_plus"]

@flask_app.route("/paraphrase", methods = ["POST"])
def paraphrase():
    body = request.json
    text = body["text"]
    paraphrased_text = paraphrase_text(text)
    return json.dumps(paraphrased_text)

def paraphrase_text(text):
    paraphrased_text = client.paraphrasing(text)
    return paraphrased_text

@flask_app.route("/db/insertLog", methods = ["POST"])
def insertLog():
    logCol = db["log"]
    body = request.json

    log = { 
        "userId": body["userId"], # user id
        "event": body["event"], # event title
        "label": body["label"], # label that user entered
        "text": body["text"], # text to feed to copilot
        "details": body["details"] , # something to link the label and element? I guess maybe the id of the element?
        "createDate": datetime.datetime.now() # timestamp
        }

    result = logCol.insert_one(log)
    return str(result.inserted_id) # return the id of the inserted document

@flask_app.route("/db/getLogs", methods = ["GET"])
def getLogs():
    logCol = db["log"]
    userId = request.args.get('userId')

    cursor = logCol.find({"userId": userId})
    results = []
    for result in cursor:
        results.append(result)
    return json.dumps(results, default=str)

# testing api
#@flask_app.route("/similarity", methods = ["GET"])
def similarity(userId, txt):
    data = getAllLabels(userId)
    results = embeddings.similarity(txt, data)
    return results, data#json.dumps(uid, default=str), 

def getAllLabels(userId):
    key = {'userId':userId}

    logCol = db["log"]
    cursor = logCol.find(key); 
    results = []
    for result in cursor:
        if "label" in result:
            results.append(result["label"])
    return results


@flask_app.route("/db/getTextByNLP", methods = ["POST"])
def getTextByNLP():
    logCol = db["log"]
    body = request.json

    cursor = logCol.find({"userId": body["userId"], "nlp": body["nlp"]})
    similarities, allLabels = similarity(body["userId"], body["nlp"])
    if similarities[0][1] > 0.5:
        cursor = logCol.find({"userId": body["userId"], "label":allLabels[similarities[0][0]]})
        results = []
        for result in cursor:
            results.append(result)
        newlist = sorted(results, key=lambda x: x["createDate"], reverse=True)
        return json.dumps({"success": True, "text": newlist[0]["text"]}, default=str)
    else:
        return json.dumps({"success": False})


if __name__ == "__main__":
    flask_app.run(debug=True)