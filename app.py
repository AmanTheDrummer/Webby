from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import requests
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
CORS(app)

QUESTIONS = [
    {"key": "site_name", "question": "What is the name of your website?"},
    {"key": "color_scheme", "question": "What color scheme do you want? (light/dark/custom)"},
    {"key": "site_type", "question": "What type of website is it? (blog, ecommerce, portfolio, etc.)"},
    {"key": "vibe", "question": "What vibe or mood should it have? (professional, fun, minimalist, etc.)"},
]

user_session = {
    "current_step": 0,
    "answers": {}
}

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
OUTPUT_DIR = "backend/generated_sites"  # Match your folder structure
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Serve the main HTML page
@app.route('/')
def index():
    return send_from_directory('templates', 'index.html')

# Serve static files (CSS, JS)
@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

# Serve generated websites
@app.route('/backend/generated_sites/<path:filename>')
def serve_generated(filename):
    print(f"[INFO] Serving generated file: {filename}")
    return send_from_directory('backend/generated_sites', filename)

@app.route('/chat', methods=['POST'])
def chat():
    global user_session

    data = request.json
    message = data.get("message", "").strip()
    print(f"[USER INPUT] Step {user_session['current_step']}: {message}")

    if user_session["current_step"] >= len(QUESTIONS):
        print("[WARN] All questions already answered.")
        return jsonify({"reply": "We already collected your answers. Please restart to begin again."})

    current_key = QUESTIONS[user_session["current_step"]]["key"]
    user_session["answers"][current_key] = message
    print(f"[INFO] Saved answer: {current_key} → {message}")

    user_session["current_step"] += 1

    if user_session["current_step"] < len(QUESTIONS):
        next_question = QUESTIONS[user_session["current_step"]]["question"]
        print(f"[BOT] Next question: {next_question}")
        return jsonify({"reply": next_question})
    else:
        print("[INFO] All answers collected.")
        answers = user_session['answers']
        
        prompt = (
            f"Generate a complete and functional single HTML file with embedded CSS and JavaScript "
            f"that matches these specifications: "
            f"Site name: {answers['site_name']}, "
            f"Color scheme: {answers['color_scheme']}, "
            f"Type: {answers['site_type']}, "
            f"Vibe: {answers['vibe']}. "
            f"Only output valid HTML code, nothing else. No explanations."
        )

        print("[INFO] Sending prompt to Gemini...")
        gemini_response = call_gemini(prompt)
        
        if gemini_response:
            filename = f"{OUTPUT_DIR}/website.html"
            with open(filename, "w", encoding="utf-8") as f:
                f.write(gemini_response)
            print(f"[SUCCESS] Website generated and saved to {filename}")
            
            return jsonify({
                "reply": "Here is your website code!",
                "code": gemini_response,
                "url": "/backend/generated_sites/website.html"  # Use relative URL
            })
        else:
            print("[ERROR] Failed to get response from Gemini.")
            return jsonify({"reply": "Something went wrong while generating the website. Please try again."})

@app.route('/restart', methods=['POST'])
def restart():
    global user_session
    print("[INFO] Restarting session.")
    user_session = {
        "current_step": 0,
        "answers": {}
    }
    first_question = QUESTIONS[0]["question"]
    print(f"[BOT] First question: {first_question}")
    return jsonify({"reply": f"Let's start over. {first_question}"})

def call_gemini(prompt):
    print("[INFO] Calling Gemini API...")
    print(f"[DEBUG] GEMINI_API_KEY: {GEMINI_API_KEY}")
    url = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [
            {"parts": [{"text": prompt}]}
        ]
    }
    try:
        response = requests.post(url, json=payload)
        print(f"[DEBUG] Response status: {response.status_code}")
        print(f"[DEBUG] Response text: {response.text}")
        response.raise_for_status()
        data = response.json()
        content = (
            data.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [{}])[0]
                .get("text", "")
        )
        print("[INFO] Gemini API response received.")
        return content
    except Exception as e:
        print(f"[ERROR] Error calling Gemini: {e}")
        return None


if __name__ == "__main__":
    print("[INFO] Starting Flask app...")
    app.run(debug=True, host='0.0.0.0', port=5000)