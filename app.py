from flask import Flask, request, jsonify, send_from_directory, redirect, url_for, flash, session, render_template
from flask_cors import CORS
import os
import requests
import psycopg2

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

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# Database connection function - creates fresh connection each time
def get_db_connection():
    return psycopg2.connect(
        user='postgres.bwbhmlrzygaxcdllmrfb',
        password='$5K7aifH',
        host='aws-0-ap-south-1.pooler.supabase.com',
        port=5432,
        dbname='postgres',
        sslmode='require'
    )

app.secret_key = 'supersecret' 

def init_chat_session():
    """Initialize chat session data if not exists"""
    if 'chat_step' not in session:
        session['chat_step'] = 0
    if 'chat_answers' not in session:
        session['chat_answers'] = {}

# Serve the main HTML page
@app.route('/')
def welcome():
    return render_template('welcome.html')

# Handle signup requests and logic
@app.route('/signup', methods=('GET', 'POST'))
def signup():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        try:
            cur.execute("""
                INSERT INTO "Accounts" (username, email, password_hash)
                VALUES (%s, %s, %s)
            """, (username, email, password))
            conn.commit()
            print('✅ Account created successfully! Please log in.')
            session.clear()
            return redirect(url_for('login'))

        except psycopg2.Error as e:
            conn.rollback()
            print(f'❌ Error creating account: {e.pgerror}')
            return redirect(url_for('signup'))

        finally:
            cur.close()
            conn.close()
    
    return render_template('signup.html')

# Handle login requests and logic
@app.route('/login', methods=('GET', 'POST'))
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']

        conn = get_db_connection()
        cur = conn.cursor()

        try:
            cur.execute("""
                SELECT id, username FROM "Accounts"
                WHERE email=%s AND password_hash=%s
            """, (email, password))
            user = cur.fetchone()

            if user:
                # login successful
                session['user_id'] = user[0]
                session['username'] = user[1]
                init_chat_session()
                return redirect(url_for('home'))
            else:
                # login failed
                flash('❌ Invalid email or password')
                return redirect(url_for('login'))

        except psycopg2.Error as e:
            flash(f'❌ Error: {e.pgerror}')
            return redirect(url_for('login'))

        finally:
            cur.close()
            conn.close()

    return render_template('login.html')

@app.route('/logout')
def logout():
    print(f"[DEBUG] Before logout - Session: {dict(session)}")
    session.clear()
    print(f"[DEBUG] After logout - Session: {dict(session)}")
    session.modified = True
    session.permanent = False
    return redirect(url_for('login'))

@app.route('/home')
def home():
    print(f"[DEBUG] /home accessed")
    print(f"[DEBUG] Session contents: {dict(session)}")
    
    if 'user_id' not in session:
        print("[DEBUG] No user_id in session, redirecting to login")
        return redirect(url_for('login'))
    
    init_chat_session()
    print("[DEBUG] User authorized, rendering home page")
    return render_template('index.html')

# Serve static files (CSS, JS)
@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

@app.route('/backend/generated_sites/<path:filename>')
def serve_generated(filename):
    if 'user_id' not in session:
        return "Unauthorized", 401

    user_id = session['user_id']

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT html_code
            FROM websites
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT 1
        """, (user_id,))
        
        result = cur.fetchone()
        cur.close()
        conn.close()

        if result:
            html_code = result[0]
            print(f"[INFO] Serving website from DB for user {user_id}")
            return html_code, 200, {"Content-Type": "text/html"}
        else:
            print(f"[WARN] No websites found for user {user_id}")
            return "No website found for this user.", 404

    except Exception as e:
        print(f"[ERROR] Failed to serve website for user {user_id}: {e}")
        return "Internal server error", 500

@app.route('/chat', methods=['POST'])
def chat():
    if 'user_id' not in session:
        return jsonify({"reply": "Please log in to continue."}), 401
    
    init_chat_session()

    data = request.json
    message = data.get("message", "").strip()
    print(f"[USER INPUT] Step {session['chat_step']}: {message}")

    if session["chat_step"] >= len(QUESTIONS):
        print("[WARN] All questions already answered.")
        return jsonify({"reply": "We already collected your answers. Please restart to begin again."})

    current_key = QUESTIONS[session["chat_step"]]["key"]
    session["chat_answers"][current_key] = message
    print(f"[INFO] Saved answer: {current_key} → {message}")

    session["chat_step"] += 1
    session.modified = True

    if session["chat_step"] < len(QUESTIONS):
        next_question = QUESTIONS[session["chat_step"]]["question"]
        print(f"[BOT] Next question: {next_question}")
        return jsonify({"reply": next_question})
    else:
        print("[INFO] All answers collected.")
        answers = session['chat_answers']
        
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
            user_id = session['user_id']
            site_name = session['chat_answers'].get('site_name', 'untitled')
            html_code = gemini_response
            
            # Save to database
            try:
                conn = get_db_connection()
                cur = conn.cursor()
                cur.execute("""
                    INSERT INTO websites (user_id, site_name, prompt, html_code)
                    VALUES (%s, %s, %s, %s)
                """, (user_id, site_name, prompt, html_code))
                conn.commit()
                cur.close()
                conn.close()
                print("[DB] Website saved in Supabase.")
            except Exception as e:
                print(f"[DB ERROR] {e}")

            return jsonify({
                "reply": "Here is your website code!",
                "code": html_code,
                "url": f"/backend/generated_sites/website_{user_id}.html"
            })
        else:
            print("[ERROR] Failed to get response from Gemini.")
            return jsonify({"reply": "Something went wrong while generating the website. Please try again."})

@app.route('/restart', methods=['POST'])
def restart():
    if 'user_id' not in session:
        return jsonify({"reply": "Please log in to continue."}), 401
    
    print("[INFO] Restarting chat session.")
    session['chat_step'] = 0
    session['chat_answers'] = {}
    session.modified = True
    
    first_question = QUESTIONS[0]["question"]
    print(f"[BOT] First question: {first_question}")
    return jsonify({"reply": f"Let's start over. {first_question}"})

def call_gemini(prompt):
    print("[INFO] Calling Gemini API...")
    url = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [
            {"parts": [{"text": prompt}]}
        ]
    }
    try:
        response = requests.post(url, json=payload)
        print(f"[DEBUG] Response status: {response.status_code}")
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
