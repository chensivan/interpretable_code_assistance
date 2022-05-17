# import numpy as np
from flask import Flask, request
import json
# import pickle

# pip install --upgrade openai

# Create flask app
flask_app = Flask(__name__)
# gpt3_model = pickle.load(open("GPT_3_model.pkl", "rb"))  # Todo: Change this to new model

@flask_app.route("/paraphrase", methods = ["POST"])
def paraphrase():
    body = request.json
    text = body["text"]
    return json.dumps(text)


if __name__ == "__main__":
    flask_app.run(debug=True)