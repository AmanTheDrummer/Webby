from flask import Flask, request, jsonify, send_from_directory, redirect, url_for, flash, session, render_template
from flask_cors import CORS
import os
import requests
import psycopg2
import uuid

from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
CORS(app)

# Hardcoded questions for the chat session
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

# Secret key for session management
app.secret_key = 'supersecret' 

def generate_custom_prompt_with_ai(answers):
    """Generate a concise creative prompt for Gemini based on user answers."""
    
    MAX_PROMPT_LENGTH = 2000  # Maximum allowed length for the final prompt
    
    # Compact instruction to avoid long Gemini processing times
    prompt_generator_input = (
        f"You are a prompt engineering expert.\n"
        f"Create a short, creative, and detailed prompt for Gemini AI "
        f"to generate a single HTML file with embedded CSS and JavaScript.\n"
        f"Site name: {answers['site_name']}\n"
        f"Color scheme: {answers['color_scheme']}\n"
        f"Type: {answers['site_type']}\n"
        f"Vibe: {answers['vibe']}\n"
        f"Include design style, layout techniques, animations, and trends.\n"
        f"Keep the entire prompt under {MAX_PROMPT_LENGTH} characters.\n"
        "Output ONLY the generated prompt, no explanations."
    )
    
    print("[INFO] Generating custom prompt with AI...")
    
    # Call Gemini without the timeout parameter
    ai_generated_prompt = call_gemini(prompt_generator_input)
    
    if ai_generated_prompt and ai_generated_prompt.strip():
        generated_prompt = ai_generated_prompt.strip()
        
        # Enforce length limit
        if len(generated_prompt) > MAX_PROMPT_LENGTH:
            print(f"[WARN] Generated prompt too long ({len(generated_prompt)} chars), truncating...")
            generated_prompt = (
                generated_prompt[:MAX_PROMPT_LENGTH] +
                "... OUTPUT: Complete HTML file with embedded CSS and JavaScript. "
                "No explanations, only the HTML code."
            )
        
        print(f"[INFO] Custom prompt generated successfully ({len(generated_prompt)} characters)")
        return generated_prompt
    
    else:
        print("[WARN] AI prompt generation failed, using fallback...")
        # Fallback to a basic safe prompt
        return (
            f"Generate a complete HTML file with embedded CSS and JavaScript "
            f"for a website named '{answers['site_name']}' "
            f"using a {answers['color_scheme']} color scheme, "
            f"type: {answers['site_type']}, vibe: {answers['vibe']}. "
            "Only output valid HTML code, no explanations."
        )
        
# Serve static files (CSS, JS)
@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

def init_chat_session():
    """Initialize chat session data if not exists"""
    
    # Initialize chat session counter for steps
    if 'chat_step' not in session:
        session['chat_step'] = 0
        
    # Initialize chat answers dictionary to be empty if it doesnt exist
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
        
        # Generate UUID for new account
        user_uuid = str(uuid.uuid4())
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        try:
            cur.execute("""
                INSERT INTO "Accounts" (id, username, email, password_hash)
                VALUES (%s, %s, %s, %s)
            """, (user_uuid, username, email, password))
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
                # login successful - user[0] is UUID string
                session['user_id'] = str(user[0])  # Ensure it's stored as string
                session['username'] = user[1]
                init_chat_session()
                print(f"[LOGIN] User logged in: {session['user_id']}")
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

# logout route to clear session
@app.route('/logout')
def logout():
    print(f"[DEBUG] Before logout - Session: {dict(session)}")
    session.clear()
    print(f"[DEBUG] After logout - Session: {dict(session)}")
    session.modified = True
    session.permanent = False
    return redirect(url_for('login'))

# Home route - checks if user is logged in
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

# Serve the generated website from the database
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

# Chat route to handle user input and generate website
@app.route('/chat', methods=['POST'])
def chat():
    if 'user_id' not in session:
        return jsonify({"reply": "Please log in to continue."}), 401
    
    # Initialize chat session again for safety
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
        
        # Generate custom prompt with AI
        prompt = generate_custom_prompt_with_ai(answers)
        print(f"[INFO] AI-generated custom prompt created")

        print("[INFO] Sending prompt to Gemini...")
        gemini_response = call_gemini(prompt)
        
        if gemini_response:
            user_id = session['user_id']  # This is now a UUID string
            site_name = session['chat_answers'].get('site_name', 'untitled')
            html_code = gemini_response
            
            # Save to database with proper UUID handling
            try:
                conn = get_db_connection()
                cur = conn.cursor()
                
                # Let PostgreSQL auto-generate the id, pass user_id as UUID
                cur.execute("""
                    INSERT INTO websites (user_id, site_name, prompt, html_code, css_code, js_code)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (user_id, site_name, prompt, html_code, '', ''))  # Empty CSS and JS for now
                
                site_id = cur.fetchone()[0]
                conn.commit()
                cur.close()
                conn.close()
                print(f"[DB] Website saved in Supabase with ID: {site_id}")
                
            except Exception as e:
                print(f"[DB ERROR] {e}")
                return jsonify({"reply": "Database error occurred while saving your site."}), 500

            return jsonify({
                "reply": "Here is your website code!",
                "site_id": site_id
            })
        else:
            print("[ERROR] Failed to get response from Gemini.")
            return jsonify({"reply": "Something went wrong while generating the website. Please try again."})

# Serve the generated website from the database by ID
@app.route('/sitepreview/<int:site_id>', methods=['GET'])
def site_preview(site_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT html_code FROM websites WHERE id = %s
        """, (site_id,))
        site = cur.fetchone()
        cur.close()
        conn.close()
        
        if site:
            html_code = site[0]
            return html_code, 200, {"Content-Type": "text/html"}
        else:
            return "<h2>Website not found.</h2>", 404
        
    except Exception as e:
        print(f"[ERROR] {e}")
        return "<h2>Something went wrong while loading the website.</h2>", 500
     
# Serve the latest generated website for preview   
@app.route('/sitepreview/latest')
def site_preview_latest():
    if 'user_id' not in session:
        return "Please log in to preview your site.", 401

    try:
        user_id = session['user_id']
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT id, html_code
            FROM websites
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT 1
        """, (user_id,))
        result = cur.fetchone()
        cur.close()
        conn.close()

        if result:
            site_id, html_code = result
            return html_code, 200, {"Content-Type": "text/html"}
        else:
            return "<h2>You haven't generated any websites yet.</h2>", 404

    except Exception as e:
        print(f"[ERROR] {e}")
        return "<h2>Something went wrong while loading the website.</h2>", 500

# Update the latest site with new HTML code
@app.route('/update_site', methods=['POST'])
def update_site():
    data = request.get_json()
    html_code = data.get('html_code', '').strip()
    
    if 'user_id' not in session:
        return jsonify({"reply": "Please log in to update your site."}), 401
    
    user_id = session['user_id']
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT id FROM websites
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT 1
        """, (user_id,))
        
        row = cur.fetchone()
        
        if not row:
            cur.close()
            conn.close()
            return jsonify({"reply": "No website found to update."}), 404
        
        site_id = row[0]
        cur.execute("""
            UPDATE websites
            SET html_code = %s
            WHERE id = %s
        """, (html_code, site_id))

        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({"message": "Site updated successfully!"}), 200
        
    except Exception as e:
        print(f"[ERROR] Update site failed: {e}")
        return jsonify({"reply": "Failed to update site."}), 500
    
# Restart chat session route
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

# Call the Gemini API to generate content based on the prompt
def call_gemini(prompt):
    print("[INFO] Calling Gemini API...")
    url = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [
            {"parts": [{"text": prompt}]}
        ]
    }
    try:
        # Ensure timeout is a positive number
        timeout_value = 180
        if timeout_value <= 0:
            timeout_value = 60  # fallback to 60 seconds
            
        response = requests.post(url, json=payload, timeout=timeout_value)
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
    except requests.exceptions.Timeout:
        print(f"[ERROR] Gemini API timeout after {timeout_value} seconds")
        return None
    except Exception as e:
        print(f"[ERROR] Error calling Gemini: {e}")
        return None
    
# run the main app
if __name__ == "__main__":
    print("[INFO] Starting Flask app...")
    app.run(debug=True, host='0.0.0.0', port=5000)