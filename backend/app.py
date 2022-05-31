# import numpy as np
from flask import Flask, request
import json
import nlpcloud
import pymongo
import json

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
def test():
    mycol = db["log"]
    body = request.json

    mydict = { "userId": body["userId"], "event": body["event"], "details": body["details"] }

    x = mycol.insert_one(mydict)
    return str(x.inserted_id)

if __name__ == "__main__":
    flask_app.run(debug=True)