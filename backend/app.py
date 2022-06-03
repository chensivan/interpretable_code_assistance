# import numpy as np
from sqlite3 import Timestamp
from flask import Flask, request
import json
import nlpcloud
import pymongo
import json
import datetime

# Create flask app
flask_app = Flask(__name__)
client = nlpcloud.Client("fast-gpt-j", "aba1569138b09087b8a839356381010dd56d6679", gpu=True, lang="en")
client = pymongo.MongoClient("mongodb+srv://user:user@cluster.menscjh.mongodb.net/?retryWrites=true&w=majority")
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

    log = { "userId": body["userId"], "event": body["event"], 
    "details": body["details"] , "createDate": datetime.datetime.now(), "updateDate": datetime.datetime.now() }

    result = logCol.insert_one(log)
    return str(result.inserted_id)

@flask_app.route("/db/getLogs", methods = ["GET"])
def getLogs():
    logCol = db["log"]
    userId = request.args.get('userId')

    cursor = logCol.find({"userId": userId})
    results = []
    for result in cursor:
        results.append(result)
    return json.dumps(results, default=str)


@flask_app.route("/db/updatePreset", methods = ["POST"])
def updatePreset():
    presetCol = db["preset"]
    body = request.json

    key = {'userId':body["userId"], "tag":body["tag"]}
    data = {'userId':body["userId"], "tag":body["tag"], "style": body["style"], 'updateDate':datetime.datetime.now()};
    result = presetCol.update(key, data, upsert=True); 

    return str(result)

@flask_app.route("/db/getPreset", methods = ["GET"])
def getPreset():
    presetCol = db["preset"]
    userId = request.args.get('userId')
    tag = request.args.get('tag')

    key = {'userId':userId, "tag": tag}

    cursor = presetCol.find(key); 
    results = []
    for result in cursor:
        results.append(result)
    return json.dumps(results[0], default=str)

if __name__ == "__main__":
    flask_app.run(debug=True)