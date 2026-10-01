from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, ".env")

load_dotenv(ENV_PATH)

from routes.document_routes import document_bp
from database.db import init_db
from routes.chat_routes import chat_bp
from routes.conversation_routes import conversation_bp
from routes.search_routes import search_bp
from routes.summary_routes import summary_bp
from routes.compare_routes import compare_bp
app = Flask(__name__)
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
            ]
        }
    }
)



app.config["UPLOAD_FOLDER"] = "uploads"
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024


# Register document routes
app.register_blueprint(document_bp)
app.register_blueprint(chat_bp)
app.register_blueprint(summary_bp)
app.register_blueprint(conversation_bp)
app.register_blueprint(search_bp)
app.register_blueprint(compare_bp)


@app.route("/")
def home():
    return jsonify({
        "name": "Astra Intel API",
        "status": "running"
    })


@app.route("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "message": "Astra Intel backend is running"
    })

init_db()  # Initialize the database if it doesn't exist




if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )