# used in the generate random letters from ASCII for the forget password
import string
from psycopg2.extras import RealDictCursor
# we used for the random password generation in case of forget password
import random
# used for add or subtract for date time
from datetime import datetime
# Micro web framework to create web APIs.
# the jsonify to Return JSON responses
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_cors import cross_origin
# used to use the globale vatiable from the env file
import os
# for PostgreSQL database
import psycopg2
import openai
# Loads environment variables from a .env file
from dotenv import load_dotenv
# used for regualr expression to compare values
import re
# Access HTTP request data
import requests
# JSON Web Tokens — often used to create access tokens for user authentication
import jwt
from datetime import datetime, timedelta
# used to generate the token to generate random variable
import secrets
# Used to securely hash and verify passwords (never store plain text passwords!).
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
# to use the openai api
from openai import OpenAI
# used for the connection with the email to send email
import smtplib
from email.mime.text import MIMEText
from flask import request


JWT_SECRET_KEY = secrets.token_urlsafe(32)  # Generates a 32-byte URL-safe token
print(JWT_SECRET_KEY)

load_dotenv()


app = Flask(__name__)
# CORS(app)
# CORS(app, supports_credentials=True)
# CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True, methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
# ✅ Allow only your Vercel frontend
CORS(app, origins=[
    r"https://bloodbank-[a-z0-9\-]+\.vercel\.app",
    "http://localhost:8080"
], supports_credentials=True)


# Generate JWT Token
def generate_jwt_token(user_id):
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=1)  # Token expires in 1 day
    }
    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm='HS256')
    return token

def get_user_by_email(email):
    cursor.execute("SELECT * FROM Users WHERE email = %s", (email,))
    return cursor.fetchone()  # This will return None if user does not exist

# Register Donor
def register_hospital(data):
    # Hash the password before saving
    hashed_password = generate_password_hash(data['password'])
    
    cursor.execute("""
        INSERT INTO Users (email, password_hash, role, name, phone, address)
        VALUES (%s, %s, 'hospital', %s, %s, %s)
        RETURNING user_id
    """, (data['email'], hashed_password, data['hospitalName'], data['phone'], data['address']))
    
    user_id = cursor.fetchone()[0]
    conn.commit()
    return user_id

def register_donor(data):
    # Hash the password before saving
    hashed_password = generate_password_hash(data['password'])
    
    # Insert into Users table
    cursor.execute("""
        INSERT INTO Users (email, password_hash, role, name, phone, address)
        VALUES (%s, %s, 'donor', %s, %s, %s)
        RETURNING user_id
    """, (
        data['email'],
        hashed_password,
        data['name'],
        data['phone'],
        data['address']
    ))
    
    # Fetch the new user_id
    user_id = cursor.fetchone()[0]

    # Insert into DonorDetails using values from data
    cursor.execute("""
        INSERT INTO DonorDetails (
            donor_id, blood_type, birth_date, gender,
            last_donation, next_eligible, health_status
        ) VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, (
        user_id,
        data['bloodType'],
        data['dateOfBirth'],
        data['gender'],
        data.get('lastDonation'),     # might be null
        data.get('nextEligible'),     # might be null
        data['healthStatus']
    ))

    conn.commit()
    return user_id


# Decorator to check if the user is authenticated
def token_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')  # Get the token from Authorization header
        if not token:
            return jsonify({"message": "Token is missing!"}), 403
        try:
            # Remove 'Bearer ' prefix and decode the token
            token = token.split(" ")[1]
            data = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Token has expired!"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"message": "Invalid token!"}), 401

        return f(data, *args, **kwargs)  # Pass the decoded token (user data) to the function

    return decorated_function

# # Route to get the current user profile
# @app.route('/user/profile', methods=['GET'])
# @token_required
# def get_user_profile(decoded_token):
#     user_id = decoded_token['user_id']  # Extract user ID from decoded token

#     # Fetch user data from your database
#     # Replace this with your actual database query
#     user_data = {
#         "id": user_id,
#         "email": "user@example.com",  # Example data
#         "name": "John Doe",
#     }

#     return jsonify(user_data), 200  # Return user profile data as a response

# Route to get donor profile
@app.route('/donor/profile/<user_id>', methods=['GET'])
@token_required
def get_donor_profile(decoded_token, user_id):
    # Fetch donor profile from your database based on user_id
    # Replace this with your actual database query
    donor_profile = {
        "id": user_id,
        "blood_type": "A+",  # Example data
        "medical_conditions": "No known conditions",
    }

    return jsonify(donor_profile), 200  # Return donor profile data as a response



# PostgreSQL connection
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cursor = conn.cursor()

# OpenAI config
# openai.api_key = os.getenv("OPENAI_API_KEY")

# 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


# openai.api_key = "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"  # store securely in env in production

# client = OpenAI(api_key=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)
# set client=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
openai.api_key = os.getenv("OPENAI_API_KEY")

# print("Hello!", os.getenv("OPENAI_API_KEY"))


@app.route('/ai-chatbot-response', methods=['POST'])
def ai_chatbot_response():
    try:
        user_input = request.json.get("message")

        if not user_input:
            return jsonify({"error": "No message provided"}), 400

        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": (
        "You are an assistant for a blood donation web application called LifeFlow. "
        "You help users navigate the platform and answer questions related to donations, appointments, eligibility, and logistics. "
        "If the user asks a question like 'How can I donate?', respond with both an answer and a suggested navigation path such as `/donate`. "
        "Provide short, clear answers."
    )},
                {"role": "user", "content": user_input}
            ]
        )

        content = response.choices[0].message.content

        # You can use basic rule-based logic here to add navigation hints
        navigate = None
        if "donate" in user_input.lower():
            navigate = "/donate"
        elif "request" in user_input.lower():
            navigate = "/request"

        return jsonify({"response": content, "navigate": navigate}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500


@app.route('/chatbot', methods=['POST'])
def chatbot_suggestions():
    try:
        prompt = request.json.get("message") or "Give me 5 suggested questions related to blood donation."

        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that only returns a list of questions."},
                {"role": "user", "content": prompt}
            ]
        )

        content = response.choices[0].message.content

        return jsonify({"response": content}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500


# @app.route('/chat', methods=['POST'])
# def chat():
#     try:
#         data = request.get_json()
#         message = data.get("message", "")

#         # Get inventory info
#         cursor.execute("""
#             SELECT blood_type, COUNT(*) AS units
#             FROM BloodInventory
#             WHERE status = 'stored'
#             GROUP BY blood_type
#             ORDER BY blood_type
#         """)
#         inventory_data = cursor.fetchall()

#         # Get hospital (donation center) info
#         cursor.execute("""
#             SELECT name, city, address
#             FROM Users
#             WHERE role = 'hospital'
#             LIMIT 10
#         """)
#         center_data = cursor.fetchall()

#         # Get demand info
#         cursor.execute("""
#             SELECT blood_type, urgency
#             FROM BloodRequests
#             WHERE status = 'pending'
#             ORDER BY urgency DESC
#             LIMIT 3
#         """)
#         demand_data = cursor.fetchall()

#         # Format context
#         inventory_context = (
#             "Current blood inventory status:\n" +
#             "\n".join([f"{bt}: {units} units" for bt, units in inventory_data])
#         ) if inventory_data else "Blood inventory data not available."

#         center_context = (
#             "Available donation centers:\n" +
#             "\n".join([f"{name} - {city}, {address}" for name, city, address in center_data])
#         ) if center_data else "Donation center data not available."

#         demand_context = (
#             "Current blood demand priorities:\n" +
#             "\n".join([f"{bt}: {urgency} urgency" for bt, urgency in demand_data])
#         ) if demand_data else "Demand data not available."

#         # Build prompt
#         system_instructions = f"""
#         You are a helpful blood donation assistant for LifeFlow.
#         Use the following real-time information in your responses:

#         {inventory_context}

#         {center_context}

#         {demand_context}

#         Respond in 3-4 friendly, informative sentences. If needed, use [NAVIGATE:/route] to suggest paths.
#         """

#         messages = [
#             {"role": "system", "content": system_instructions},
#             {"role": "user", "content": message}
#         ]

#         response = openai.ChatCompletion.create(
#             model="gpt-4o",
#             messages=messages,
#             temperature=0.7,
#             max_tokens=300
#         )

#         reply = response.choices[0].message.content
#         clean_reply = re.sub(r"\[NAVIGATE:[^\]]+\]", "", reply)
#         nav_match = re.search(r"\[NAVIGATE:([^\]]+)\]", reply)

#         return jsonify({
#             "response": clean_reply.strip(),
#             "navigate": nav_match.group(1) if nav_match else None
#         })

#     except Exception as e:
#         print("Error:", str(e))
#         return jsonify({"error": str(e)}), 500

# @app.route('/blood_inventory', methods=['GET'])
# def get_blood_inventory():
#     try:
#         # Your code to fetch data from database
#         cursor.execute("SELECT blood_type, COUNT(*) AS units FROM BloodInventory WHERE status = 'stored' GROUP BY blood_type")
#         inventory_data = cursor.fetchall()
        
#         # Return the result as JSON
#         return jsonify([
#             {"blood_type": bt, "units": units} for bt, units in inventory_data
#         ])
#     except Exception as e:
#         print(f"Error fetching blood inventory: {e}")
#         return jsonify({"error": "Failed to fetch blood inventory"}), 500


# @app.route('/api/inventory', methods=['GET'])
# def get_inventory():
#     try:
#         cursor.execute("""
#             SELECT blood_unit_id, blood_type, units_ml, collected_date, expiry_date, status, current_location
#             FROM BloodInventory
#             ORDER BY expiry_date ASC
#         """)
#         rows = cursor.fetchall()
#         result = [
#             {
#                 "id": row[0],
#                 "blood_type": row[1],
#                 "units": row[2],
#                 "donation_date": row[3].isoformat() if row[3] else None,
#                 "expiry_date": row[4].isoformat() if row[4] else None,
#                 "status": row[5],
#                 "location_name": row[6] or "Unknown"
#             }
#             for row in rows
#         ]
#         return jsonify(result), 200
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500


# @app.route('/api/inventory', methods=['GET'])
# def get_blood_inventory():
#     try:
#         cursor.execute("""
#             SELECT 
#                 blood_unit_id, 
#                 blood_type, 
#                 units_ml, 
#                 collected_date, 
#                 expiry_date, 
#                 status, 
#                 current_location 
#             FROM BloodInventory
#             ORDER BY expiry_date ASC
#         """)
#         rows = cursor.fetchall()

#         result = []
#         for row in rows:
#             result.append({
#                 "id": row[0],
#                 "blood_type": row[1],
#                 "units": row[2],
#                 "donation_date": row[3].isoformat() if row[3] else None,
#                 "expiry_date": row[4].isoformat() if row[4] else None,
#                 "status": row[5],
#                 "location_name": row[6]
#             })

#         return jsonify(result), 200

#     except Exception as e:
#         return jsonify({"error": str(e)}), 500
@app.route('/api/inventory', methods=['GET'])
def get_blood_inventory():
    try:
        # Make sure to use a new cursor for each request
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    blood_unit_id, 
                    blood_type, 
                    units_ml, 
                    collected_date, 
                    expiry_date, 
                    status, 
                    current_location 
                FROM BloodInventory
                ORDER BY expiry_date ASC
            """)
            rows = cursor.fetchall()

        result = []
        for row in rows:
            if len(row) < 7:
                continue

            result.append({
                "id": row[0],
                "blood_type": row[1],
                "units": row[2],
                "donation_date": row[3].isoformat() if row[3] else None,
                "expiry_date": row[4].isoformat() if row[4] else None,
                "status": row[5],
                "location_name": row[6] if row[6] else "Unknown"
            })

        return jsonify(result), 200

    except Exception as e:
        conn.rollback()  # Rollback in case of error to clear broken transaction
        print("Error in /api/inventory:", str(e))
        return jsonify({"error": str(e)}), 500


@app.route('/api/blood_inventory', methods=['POST'])
def add_blood_inventory():
    data = request.get_json()
    try:
        cursor.execute("""
            INSERT INTO BloodInventory (
                donor_id, hospital_id, blood_type, units_ml, 
                collected_date, expiry_date, status, current_location, request_id
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            None,  # donor_id - optional or fetched later
            None,  # hospital_id - optional or fetched later
            data['blood_type'],
            data['units'] * 500,  # Convert units to ml
            data['donation_date'],
            data['expiry_date'],
            data['status'],
            data['location_name'],
            None  # request_id - optional
        ))
        conn.commit()
        return jsonify({"message": "Blood inventory added successfully"}), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500




@app.route('/api/requests', methods=['GET'])
def get_blood_requests():
    try:
        cursor.execute("""
            SELECT request_id, hospital_id, blood_type, units_needed, urgency, status
            FROM BloodRequests
            WHERE status = 'pending'
        """)
        requests = cursor.fetchall()
        return jsonify([
            {
                "request_id": r[0],
                "hospital_id": r[1],
                "blood_type": r[2],
                "units_needed": r[3],
                "urgency": r[4],
                "status": r[5]
            } for r in requests
        ])
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/centers', methods=['GET'])
def get_centers():
    try:
        cursor.execute("SELECT user_id, name, city, address FROM Users WHERE role = 'hospital'")
        centers = cursor.fetchall()
        return jsonify([
            {
                "id": c[0],
                "name": c[1],
                "city": c[2],
                "address": c[3]
            } for c in centers
        ])
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

# @app.route('/api/appointments', methods=['POST'])
# def create_appointment():
#     try:
#         data = request.get_json()
#         cursor.execute("""
#             INSERT INTO Appointments (donor_id, hospital_id, scheduled_date, status)
#             VALUES (%s, %s, %s, 'scheduled')
#         """, (data['donor_id'], data['hospital_id'], data['scheduled_date']))
#         conn.commit()
#         return jsonify({"message": "Appointment created successfully"}), 201
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500

# @app.route('/api/notify', methods=['POST'])
# def send_notification():
#     try:
#         data = request.get_json()

#         # Support both Deno and existing Flask structure
#         recipients = data.get('recipients') or data.get('to')
#         subject = data.get('subject')
#         message = data.get('message') or data.get('body')
#         sender = data.get('from') or os.getenv("EMAIL_SENDER", "noreply@blooddonation.com")

#         email_service_url = os.getenv("EMAIL_SERVICE_URL")
#         email_api_key = os.getenv("EMAIL_API_KEY")

#         if not email_service_url or not email_api_key:
#             raise Exception("Email service configuration missing")

#         if not recipients or not subject or not message:
#             raise Exception("Missing required email fields")

#         if isinstance(recipients, str):
#             recipients = [recipients]  # Convert to list if single email provided

#         email_response = requests.post(
#             email_service_url,
#             headers={
#                 "Content-Type": "application/json",
#                 "Authorization": f"Bearer {email_api_key}"
#             },
#             json={
#                 "to": recipients,
#                 "subject": subject,
#                 "body": message,
#                 "from": sender,
#                 "isMultiple": True
#             }
#         )

#         if not email_response.ok:
#             raise Exception(f"Email API responded with {email_response.status_code}")

#         return jsonify({"success": True, "data": email_response.json()})

#     except Exception as e:
#         return jsonify({"error": str(e)}), 400


@app.route('/api/donors', methods=['GET'])
def get_donors():
    try:
        cursor.execute("SELECT donor_id, blood_type, gender, birth_date, last_donation FROM DonorDetails")
        donors = cursor.fetchall()
        return jsonify([{
            "donor_id": d[0],
            "blood_type": d[1],
            "gender": d[2],
            "birth_date": str(d[3]),
            "last_donation": str(d[4]) if d[4] else None
        } for d in donors])
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/predictive_demand', methods=['GET'])
def get_predictive_demand():
    try:
        # Fetch predictive demand data (you can replace this with your own query or logic)
        cursor.execute("""
            SELECT blood_type, urgency, units_needed
            FROM BloodRequests
            WHERE status = 'pending'
            ORDER BY urgency DESC
            LIMIT 5
        """)
        demand_data = cursor.fetchall()

        # Return the fetched data as JSON
        return jsonify([
            {
                "blood_type": bt,
                "urgency": urgency,
                "units_needed": units_needed
            }
            for bt, urgency, units_needed in demand_data
        ])
    except Exception as e:
        conn.rollback()
        print(f"Error fetching predictive demand: {e}")
        return jsonify({"error": "Failed to fetch predictive demand data"}), 500



@app.route('/expiring_inventory', methods=['GET'])
def get_expiring_inventory():
    try:
        # Get the expiry_before parameter from the query string
        expiry_before_str = request.args.get('expiry_before')
        
        # Check if the expiry_before parameter is provided
        if not expiry_before_str:
            return jsonify({"error": "Missing 'expiry_before' query parameter"}), 400

        # Convert the expiry_before string to a datetime object
        expiry_before = datetime.fromisoformat(expiry_before_str.replace('Z', '+00:00'))  # Handling ISO 8601 format

        # Fetch inventory data expiring before the provided date
        cursor.execute("""
            SELECT blood_type, expiry_date, COUNT(*) AS units
            FROM BloodInventory
            WHERE expiry_date < %s
            GROUP BY blood_type, expiry_date
            ORDER BY expiry_date
        """, (expiry_before,))
        inventory_data = cursor.fetchall()

        # Return the fetched data as JSON
        if not inventory_data:
            return jsonify({"message": "No expiring inventory found"}), 200

        return jsonify([
            {
                "blood_type": bt,
                "expiry_date": str(expiry_date),
                "units": units
            }
            for bt, expiry_date, units in inventory_data
        ])
    
    except Exception as e:
        conn.rollback()
        print(f"Error fetching expiring inventory: {e}")
        return jsonify({"error": "Failed to fetch expiring inventory data"}), 500


@app.route('/api/donors', methods=['POST'])
def create_donor():
    try:
        data = request.get_json()
        email = data['email']

        # Check if user exists
        cursor.execute("SELECT user_id FROM Users WHERE email = %s", (email,))
        user = cursor.fetchone()
        if not user:
            return jsonify({"error": "User not found. Please register first."}), 400

        user_id = user[0]

        cursor.execute("""
            INSERT INTO DonorDetails (donor_id, blood_type, health_status, last_donation)
            VALUES (%s, %s, %s, CURRENT_DATE)
        """, (user_id, data['blood_type'], str(data.get('medical_history') or '')))

        conn.commit()
        return jsonify({"message": "Donor profile created"}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/donors/<int:donor_id>', methods=['PUT'])
def update_donor(donor_id):
    try:
        data = request.get_json()

        cursor.execute("""
            UPDATE DonorDetails
            SET blood_type = %s,
                health_status = %s
            WHERE donor_id = %s
        """, (
            data['blood_type'],
            str(data.get('medical_history') or ''),
            donor_id
        ))

        conn.commit()
        return jsonify({"message": "Donor updated successfully"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/donation_centers', methods=['GET'])
def get_donation_centers():
    try:
        cursor.execute("SELECT id, name FROM donation_centers")  # Assuming you have a table called donation_centers
        donation_centers = cursor.fetchall()
        
        result = [
            {"id": center[0], "name": center[1]} for center in donation_centers
        ]
        return jsonify(result), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

# @app.route('/api/inventory', methods=['GET'])
# def get_inventory():
#     try:
#         cursor.execute("SELECT blood_unit_id, blood_type, units_ml, expiry_date, collected_date, current_location, status FROM bloodinventory") 
#         inventory_data = cursor.fetchall()
        
#         result = [
#             {
#                 "id": item[0],
#                 "blood_type": item[1],
#                 "units": item[2],
#                 "expiry_date": item[3],
#                 "donation_date": item[4],
#                 "location_name": item[5],
#                 "status": item[6]
#             } for item in inventory_data
#         ]
#         return jsonify(result), 200
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()

    # Check if email and password are provided
    if not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password are required'}), 400

    # Fetch user from database
    user = get_user_by_email(data['email'])

    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Validate password (use your hashing function for password comparison)
    if not check_password_hash(user[3], data['password']):  # Assuming password is at index 3
        return jsonify({'error': 'Incorrect password'}), 401

    # Generate JWT token
    token = generate_jwt_token(user[0])  # Assuming user ID is at index 0

    return jsonify({
        'message': 'Login successful',
        'token': token,
        'user_id': user[0],  # Assuming user ID is at index 0
        'role': user[4]  # Assuming role is at index 4

    }), 200



@app.route('/api/register', methods=['POST'])
def register():
    
    print("Register route hit")

    data = request.get_json()

    print(data)

    # Check if required fields are provided
    if not data.get('email') or not data.get('password') or not data.get('userRole'):
        return jsonify({'error': 'Email, password, and user role are required'}), 400

    # Check if email already exists
    existing_user = get_user_by_email(data['email'])
    if existing_user:
        return jsonify({'error': 'Email already exists'}), 400

    # Handle registration based on user role
    if data['userRole'] == 'donor':
        if not data.get('name') or not data.get('bloodType'):
            return jsonify({'error': 'Name and blood type are required for donors'}), 400

        donor_id = register_donor(data)
        return jsonify({'message': 'Donor registered successfully'}), 201

    elif data['userRole'] == 'hospital':
        if not data.get('hospitalName') or not data.get('licenseNumber'):
            return jsonify({'error': 'Hospital name and license number are required for hospitals'}), 400

        hospital_id = register_hospital(data)
        return jsonify({'message': 'Hospital registered successfully'}), 201

    return jsonify({'error': 'Invalid user role'}), 400

@app.route('/api/donors/<int:donor_id>', methods=['DELETE'])
def delete_donor(donor_id):
    try:
        cursor.execute("DELETE FROM DonorDetails WHERE donor_id = %s", (donor_id,))
        conn.commit()
        return jsonify({"message": "Donor deleted successfully"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

# Route to create an appointment
@app.route('/appointments', methods=['POST'])
@token_required
def create_appointment(decoded_token):
    try:
        data = request.get_json()

        # Extract data from request
        donor_id = data.get('donor_id')
        center_id = data.get('center_id')
        appointment_date = data.get('appointment_date')
        time_slot = data.get('time_slot')
        status = data.get('status')

        # Validate required fields
        if not donor_id or not center_id or not appointment_date or not time_slot:
            return jsonify({"error": "Required fields are missing"}), 400

        # ✅ Check for existing upcoming appointment
        cursor.execute("""
            SELECT 1 FROM appointments
            WHERE donor_id = %s AND scheduled_date >= CURRENT_DATE and status = 'scheduled'
            LIMIT 1
        """, (donor_id,))
        existing = cursor.fetchone()
        if existing:
            return jsonify({
                "error": "You already have an upcoming appointment"
            }), 409  # Conflict

        # Insert appointment and get ID
        cursor.execute("""
            INSERT INTO Appointments (donor_id, hospital_id, scheduled_date, time_slot, status)
            VALUES (%s, %s, %s, %s, %s) RETURNING appointment_id
        """, (donor_id, center_id, appointment_date, time_slot, status))
        
        appointment_id = cursor.fetchone()[0]
        conn.commit()

        # Fetch full appointment for return
        cursor.execute("""
            SELECT appointment_id, donor_id, hospital_id, scheduled_date, time_slot, status
            FROM Appointments WHERE appointment_id = %s
        """, (appointment_id,))
        appointment = cursor.fetchone()

        return jsonify({
            "id": appointment[0],
            "donor_id": appointment[1],
            "center_id": appointment[2],
            "appointment_date": appointment[3].isoformat(),
            "time_slot": appointment[4],
            "status": appointment[5]
        }), 201

    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        return jsonify({"error": "Failed to create appointment", "message": str(e)}), 500


@app.route('/auth/me', methods=['GET'])
@token_required
def get_current_user(decoded_token):
    user_id = decoded_token['user_id']  # Extract user ID from decoded token

    try:
        # Fetch user data from the database
        cursor.execute("SELECT name, email, phone FROM Users WHERE user_id = %s", (user_id,))
        user_data = cursor.fetchone()

        if not user_data:
            return jsonify({"message": "User not found!"}), 404
        
        # Map the fetched data to a dictionary and return it as a response
        user_profile = {
            "name": user_data[0],
            "email": user_data[1],
            "phone": user_data[2]
        }

        return jsonify({"user": user_profile}), 200

    except Exception as e:
        conn.rollback()
        print(f"Error fetching user data: {e}")
        return jsonify({"message": "Failed to fetch user data"}), 500


@app.route('/auth/profile', methods=['PUT'])
@token_required
def update_profile(decoded_token):
    user_id = decoded_token['user_id']
    data = request.get_json()

    name = data.get('name')
    phone = data.get('phone')

    if not name or not phone:
        return jsonify({'message': 'Name and phone are required'}), 400

    try:
        # Update user profile in DB
        cursor.execute("""
            UPDATE Users
            SET name = %s, phone = %s
            WHERE user_id = %s
        """, (name, phone, user_id))

        conn.commit()

        # Return updated profile
        updated_profile = {
            'name': name,
            'phone': phone
        }

        return jsonify(updated_profile), 200

    except Exception as e:
        conn.rollback()
        print(f"Error updating profile: {e}")
        return jsonify({'message': 'Failed to update profile'}), 500

@app.route('/appointments/latest/<int:donor_id>', methods=['GET'])
@token_required
def get_latest_appointment(decoded_token, donor_id):
    try:
        cursor.execute("""
            SELECT a.scheduled_date, a.time_slot, a.status, d.name AS location
            FROM appointments a
            JOIN donation_centers d ON CAST(a.hospital_id AS TEXT) = d.id
            WHERE a.donor_id = %s
            ORDER BY a.scheduled_date DESC
            LIMIT 1;
        """, (donor_id,))

        result = cursor.fetchone()

        if not result:
            return jsonify({"message": "No appointment found"}), 404

        appointment = {
            "appointment_date": result[0],
            "time_slot": result[1],
            "status": result[2],
            "location": result[3]
        }

        return jsonify(appointment), 200

    except Exception as e:
        conn.rollback()
        print(f"Error fetching latest appointment: {e}")
        return jsonify({"error": "Failed to fetch latest appointment", "message": str(e)}), 500


@app.route('/appointments/donor', methods=['GET'])
@token_required
def get_donor_appointments(decoded_token):
    donor_id = decoded_token['user_id']

    cursor.execute("""
        SELECT a.appointment_id, a.scheduled_date, a.time_slot, a.status, d.name AS location
        FROM appointments a
        JOIN donation_centers d ON CAST(a.hospital_id AS TEXT) = d.id
        WHERE a.donor_id = %s
        ORDER BY a.scheduled_date DESC
    """, (donor_id,))
    rows = cursor.fetchall()

    appointments = [
        {
            "id": row[0],
            "appointment_date": row[1].isoformat(),
            "time_slot": row[2],
            "status": row[3],
            "location": row[4]
        }
        for row in rows
    ]

    return jsonify(appointments), 200

# @app.route('/api/donations/<int:donor_id>', methods=['GET', 'OPTIONS'])
# def get_donations(donor_id):
#     try:
#         # cursor.execute("""
#         #     SELECT scheduled_date, time_slot, status
#         #     FROM appointments
#         #     WHERE donor_id = %s
#         #     ORDER BY scheduled_date DESC
#         # """, (donor_id,))
#         cursor = conn.cursor(dictionary=True)

#         cursor.execute("""
#             SELECT a.scheduled_date, a.time_slot, a.status, d.name AS location
#             FROM appointments a
#             JOIN donation_centers d ON CAST(a.hospital_id AS TEXT) = d.id
#             WHERE a.donor_id = %s
#             ORDER BY a.scheduled_date DESC;
#         """, (donor_id,))
        

#         donations = cursor.fetchall()

#         result = [
#             {
#                 "date": row[0].strftime("%Y-%m-%d %I:%M %p"),  # Formats datetime properly
#                 "type": row[1],  # time_slot
#                 "status": row[2],
#                 "location": row[3]
#             }
#             for row in donations
#         ]

#         return jsonify(result), 200

#     except Exception as e:
#         conn.rollback()
#         return jsonify({"error": str(e)}), 500
    

@app.route('/api/donations/<int:donor_id>', methods=['GET', 'OPTIONS'])
@cross_origin(origins='http://localhost:8080', methods=['GET', 'OPTIONS'])
def get_donations(donor_id):
    if request.method == 'OPTIONS':
        return '', 204  # Respond to preflight

    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT a.scheduled_date, a.time_slot, a.status, d.name AS location
            FROM appointments a
            JOIN donation_centers d ON CAST(a.hospital_id AS TEXT) = d.id
            WHERE a.donor_id = %s
            ORDER BY a.scheduled_date DESC;
        """, (donor_id,))

        donations = cursor.fetchall()

        result = [
            {
                "date": row['scheduled_date'].strftime("%Y-%m-%d %I:%M %p"),
                "type": row['time_slot'],
                "status": row['status'],
                "location": row['location']
            }
            for row in donations
        ]

        return jsonify(result), 200

    except Exception as e:
        conn.rollback()
        print("Error in /api/donations:", e)
        return jsonify({"error": str(e)}), 500
 
    
    
@app.route('/api/hospital/requests/<int:hospital_id>', methods=['GET'])
def get_hospital_requests(hospital_id):
    try:
        cursor.execute("""
            SELECT requested_date, blood_type, units_needed, status
            FROM BloodRequests
            WHERE hospital_id = %s
            ORDER BY requested_date DESC
        """, (hospital_id,))
        
        rows = cursor.fetchall()

        result = [
            {
                "date": row[0].strftime("%Y-%m-%d"),
                "type": row[1],
                "units": row[2],
                "status": row[3]
            }
            for row in rows
        ]

        return jsonify(result), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/hospital_inventory/<int:hospital_id>', methods=['GET'])
def get_hospital_inventory(hospital_id):

    cursor.execute("""
        SELECT 
            blood_type, 
            FLOOR(SUM(units_ml) / 450) AS approx_units
        FROM 
            BloodInventory
        WHERE 
            status = 'stored'
        GROUP BY 
            blood_type;
    """, (hospital_id,))
    
    data = cursor.fetchall()

    inventory = {row[0]: row[1] for row in data}

    return jsonify({
        'inventory': inventory,
        'last_updated': datetime.now().isoformat()
    })

@app.route('/api/hospitals')
def get_hospitals():
    cursor.execute("SELECT user_id, name FROM Users WHERE role = 'hospital'")
    hospitals = cursor.fetchall()
    return jsonify([{'id': h[0], 'name': h[1]} for h in hospitals])

@app.route('/api/allrequests', methods=['GET'])
def get_requests():
    hospital_id = request.args.get('hospital_id')
    if not hospital_id:
        return jsonify({'error': 'hospital_id is required'}), 400

    cursor.execute("""
        SELECT * FROM BloodRequests WHERE hospital_id = %s ORDER BY requested_date DESC
    """, (hospital_id,))
    
    rows = cursor.fetchall()

    result = []
    for row in rows:
        result.append({
            "request_id": row[0],
            "hospital_id": row[1],
            "blood_type": row[2],
            "units_needed": row[3],
            "urgency": row[4],
            "status": row[5],
            "requested_date": row[6].isoformat() if row[6] else None,
            "fulfilled_date": row[7].isoformat() if row[7] else None
        })

    return jsonify(result), 200

@app.route('/api/requests/<int:request_id>/approve', methods=['POST'])
def approve_request(request_id):
    try:
        cursor.execute("UPDATE BloodRequests SET status = 'approved' WHERE request_id = %s", (request_id,))
        conn.commit()
        return jsonify({"message": "Request approved"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

# @app.route('/api/requests/<int:request_id>/reject', methods=['POST'])
# def reject_request(request_id):
#     try:
#         cursor.execute("UPDATE BloodRequests SET status = 'rejected' WHERE request_id = %s", (request_id,))
#         conn.commit()
#         return jsonify({"message": "Request rejected"}), 200
#     except Exception as e:
#         conn.rollback()
#         return jsonify({"error": str(e)}), 500


@app.route('/api/requests/<int:request_id>/reject', methods=['POST'])
def reject_request(request_id):
    try:
        # Fetch request and hospital info
        cursor.execute("""
            SELECT u.email, u.name, r.blood_type, r.units_needed
            FROM BloodRequests r
            JOIN Users u ON r.hospital_id = u.user_id
            WHERE r.request_id = %s
        """, (request_id,))
        row = cursor.fetchone()

        if not row:
            return jsonify({"message": "Request not found"}), 404

        hospital_email, hospital_name, blood_type, units = row

        # Update status to 'rejected'
        cursor.execute("UPDATE BloodRequests SET status = 'rejected' WHERE request_id = %s", (request_id,))
        conn.commit()

        # Send rejection email
        subject = "Blood Request Rejected"
        message = f"Dear {hospital_name},\n\nWe regret to inform you that your request for {units} unit(s) of {blood_type} has been rejected.\n\nRegards,\nLifeFlow Team"
        send_email_notification(hospital_email, subject, message)

        return jsonify({"message": "Request rejected and email sent"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500


@app.route('/api/requests', methods=['POST'])
def submit_blood_request():
    data = request.json
    hospital_id = data.get('hospital_id')
    blood_type = data.get('blood_type')
    units_needed = data.get('units_needed')
    urgency = data.get('urgency')
    status = data.get('status')
    request_date = datetime.now()

    try:
        cursor.execute("""
            INSERT INTO BloodRequests (hospital_id, blood_type, units_needed, urgency, status, requested_date)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (hospital_id, blood_type, units_needed, urgency, status, request_date))
        conn.commit()
        return jsonify({"message": "Request submitted successfully"}), 201
    except Exception as e:
        conn.rollback()
        print(e)
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/dashboard/<admin_id>', methods=['GET'])
def get_admin_dashboard(admin_id):
    cursor = conn.cursor()

    try:
        # 1. Total donors
        cursor.execute("SELECT COUNT(*) FROM Users WHERE role = 'donor'")
        total_donors = cursor.fetchone()[0]

        # 2. Total requests
        cursor.execute("SELECT COUNT(*) FROM BloodRequests")
        total_requests = cursor.fetchone()[0]

        # 3. Pending approvals
        cursor.execute("SELECT COUNT(*) FROM BloodRequests WHERE status = 'pending'")
        pending_approvals = cursor.fetchone()[0]

        # 4. Low stock alerts (< 2 units per blood type)
        cursor.execute("""
            SELECT COUNT(*) FROM (
                SELECT blood_type
                FROM BloodInventory
                WHERE status = 'stored'
                GROUP BY blood_type
                HAVING COUNT(*) < 2
            ) AS low_stock
        """)
        low_stock_alerts = cursor.fetchone()[0]

        # 5. Recent donors (last 3 based on last_donation)
        cursor.execute("""
            SELECT u.name, d.blood_type, d.last_donation
            FROM DonorDetails d
            JOIN Users u ON d.donor_id = u.user_id
            ORDER BY d.last_donation DESC NULLS LAST
            LIMIT 3
        """)
        recent_donors = [
            {
                "name": row[0],
                "type": row[1],
                "date": row[2].strftime("%Y-%m-%d") if row[2] else None,
                "status": "pending"
            }
            for row in cursor.fetchall()
        ]

        # 6. Recent requests (last 3)
        cursor.execute("""
            SELECT u.name, r.requested_date, r.blood_type, r.units_needed, r.status
            FROM BloodRequests r
            JOIN Users u ON r.hospital_id = u.user_id
            ORDER BY r.requested_date DESC
            LIMIT 3
        """)
        recent_requests = [
            {
                "hospital": row[0],
                "date": row[1].strftime("%Y-%m-%d"),
                "type": row[2],
                "units": row[3],
                "status": row[4]
            }
            for row in cursor.fetchall()
        ]

        return jsonify({
            "totalDonors": total_donors,
            "totalRequests": total_requests,
            "pendingApprovals": pending_approvals,
            "lowStockAlerts": low_stock_alerts,
            "recentDonors": recent_donors,
            "recentRequests": recent_requests
        })

    except Exception as e:
        conn.rollback()
        print("Error fetching admin dashboard:", e)
        return jsonify({"error": str(e)}), 500


@app.route('/api/system/health', methods=['GET'])
def get_system_health():
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor()

    try:
        # Check DB connectivity
        cursor.execute("SELECT 1")
        db_status = "operational"

        # Check AI Matching Table
        try:
            cursor.execute("SELECT COUNT(*) FROM AIMatchingLog")
            ai_status = "operational"
        except:
            ai_status = "down"

        # Notification system status (mocked for now)
        notification_status = "degraded"

        # API response
        return jsonify([
            { "name": "Database Connectivity", "status": db_status, "value": 100 },
            { "name": "API Performance", "status": "operational", "value": 95 },
            { "name": "AI Matching Service", "status": ai_status, "value": 98 },
            { "name": "Notification System", "status": notification_status, "value": 82 }
        ])
    except Exception as e:
        conn.rollback()
        print("Error:", e)
        return jsonify({"error": str(e)}), 500

@app.route("/api/v1/donors", methods=["GET"])
def get_donors_details():
    
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor()
    
    try:
        query = """
            SELECT 
                u.user_id,
                u.name,
                u.email,
                d.donor_id,
                d.blood_type,
                d.last_donation,
                d.health_status
            FROM Users u
            JOIN DonorDetails d ON u.user_id = d.donor_id
            WHERE u.role = 'donor'
        """
        cursor.execute(query)

        donors = cursor.fetchall()
        return jsonify(donors)
    except Exception as e:
        conn.rollback()
        print(e)
        return jsonify({"error": str(e)}), 500


@app.route('/api/v1/donors/<int:donor_id>', methods=['PUT'])
def update_admin_donor(donor_id):
    try:
        data = request.get_json()
        name = data.get('name')
        email = data.get('email')
        blood_type = data.get('blood_type')
        medical_history = data.get('medical_history')

        if not (name and email and blood_type):
            return jsonify({"error": "Missing required fields"}), 400

        cursor = conn.cursor()

        # Update Users table (name, email)
        cursor.execute("""
            UPDATE Users
            SET name = %s, email = %s
            WHERE user_id = %s
        """, (name, email, donor_id))

        # Update DonorDetails table (blood type, health_status)
        cursor.execute("""
            UPDATE DonorDetails
            SET blood_type = %s,
                health_status = %s
            WHERE donor_id = %s
        """, (blood_type, medical_history, donor_id))

        conn.commit()
        return jsonify({"message": "Donor updated successfully"}), 200

    except Exception as e:
        conn.rollback()
        print("Error:", e)
        return jsonify({"error": str(e)}), 500

# @app.route('/api/requests/all', methods=['GET'])
# def get_all_blood_requests():
#     try:
#         cursor = conn.cursor()
#         cursor.execute("""
#            SELECT 
#                 br.request_id,
#                 u.name AS hospital_name,
#                 br.blood_type,
#                 br.units_needed,
#                 br.urgency,
#                 br.status,
#                 br.requested_date
#             FROM bloodrequests br
#             JOIN users u ON br.hospital_id = u.user_id
#         """)
#         results = cursor.fetchall()
#         return jsonify(results)
#     except Exception as e:
#         conn.rollback()
#         print("Error fetching all blood requests:", e)
#         return jsonify({"error": str(e)}), 500

@app.route('/api/requests/all', methods=['GET'])
def get_all_blood_requests():
    try:
        hospital_id = request.args.get('hospital_id')
        cursor = conn.cursor()

        if hospital_id:
            cursor.execute("""
                SELECT 
                    br.request_id,
                    u.name AS hospital_name,
                    br.blood_type,
                    br.units_needed,
                    br.urgency,
                    br.status,
                    br.requested_date
                FROM bloodrequests br
                JOIN users u ON br.hospital_id = u.user_id
                WHERE br.hospital_id = %s
            """, (hospital_id,))
        else:
            cursor.execute("""
                SELECT 
                    br.request_id,
                    u.name AS hospital_name,
                    br.blood_type,
                    br.units_needed,
                    br.urgency,
                    br.status,
                    br.requested_date
                FROM bloodrequests br
                JOIN users u ON br.hospital_id = u.user_id
            """)

        results = cursor.fetchall()
        return jsonify(results)

    except Exception as e:
        conn.rollback()
        print("Error fetching blood requests:", e)
        return jsonify({"error": str(e)}), 500


@app.route('/api/notifications', methods=['GET'])
@token_required
def get_notifications(decoded_token):
    user_id = decoded_token['user_id']

    # Fetch user role and email
    cursor.execute("SELECT role, email FROM Users WHERE user_id = %s", (user_id,))
    user = cursor.fetchone()

    if not user:
        return jsonify({"error": "User not found"}), 404

    role, email = user

    if role == 'admin':
        cursor.execute("SELECT * FROM notifications ORDER BY timestamp DESC")
    else:
        cursor.execute("SELECT * FROM notifications WHERE recipient = %s ORDER BY timestamp DESC", (email,))

    rows = cursor.fetchall()
    columns = [desc[0] for desc in cursor.description]
    notifications = [dict(zip(columns, row)) for row in rows]

    return jsonify(notifications)



def send_email_notification(recipient, subject, message):
    smtp_server = 'smtp.gmail.com'
    smtp_port = 587
    sender_email = '12231897@students.liu.edu.lb'
    sender_password = 'srse tnzi qgqv dvub'  # Use App Password for Gmail

    msg = MIMEText(message)
    msg['Subject'] = subject
    msg['From'] = sender_email
    msg['To'] = recipient

    try:
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, recipient, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        conn.rollback()
        print("Failed to send email:", e)
        return False

# @app.route('/api/send-notification', methods=['POST'])
# def send_notification():
#     data = request.get_json()
#     recipient = data.get('recipient')
#     subject = data.get('subject')
#     message = data.get('message')
#     event = data.get('event', 'general')
#     blood_type = data.get('bloodType')
#     units = data.get('units')
#     type = data.get('type', 'email')

#     try:
#         if recipient == "all":
#             cursor.execute("SELECT email FROM Users WHERE email_notifications_enabled = TRUE")
#             recipients = [row[0] for row in cursor.fetchall()]
#         else:
#             recipients = [recipient]

#         success_count = 0
#         fail_count = 0

#         for email in recipients:
#             success = send_email_notification(email, subject, message)

#             cursor.execute("""
#                 INSERT INTO notifications (recipient, subject, message, event, blood_type, units, type, status)
#                 VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
#             """, (
#                 email, subject, message, event, blood_type, units, type,
#                 'sent' if success else 'failed'
#             ))

#             if success:
#                 success_count += 1
#             else:
#                 fail_count += 1

#         conn.commit()

#         return jsonify({
#             'success': True,
#             'message': f"Notification sent to {success_count} users. Failed: {fail_count}"
#         })

#     except Exception as e:
#         conn.rollback()
#         print("Error in sending notification:", e)
#         return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/user/preferences', methods=['PATCH'])
@token_required
def update_notification_preference(decoded_token):
    user_id = decoded_token['user_id']
    data = request.get_json()
    email_enabled = data.get('email_notifications_enabled')

    try:
        cursor.execute("""
            UPDATE Users
            SET email_notifications_enabled = %s
            WHERE user_id = %s
        """, (email_enabled, user_id))
        conn.commit()
        return jsonify({"message": "Preferences updated"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500


@app.route('/api/system-settings', methods=['GET'])
@token_required
def get_system_settings(decoded_token):
    try:
        cursor.execute("SELECT * FROM SystemSettings LIMIT 1")
        settings = cursor.fetchone()
        if not settings:
            return jsonify({
                "critical_stock_alerts": True,
                "appointment_reminders": True,
                "donation_thank_you": True
            })
        return jsonify(dict(zip([desc[0] for desc in cursor.description], settings)))
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500



@app.route('/api/system-settings', methods=['PUT'])
@token_required
def update_system_settings(decoded_token):
    data = request.get_json()

    # Validate input
    if not data or len(data) != 1:
        return jsonify({"success": False, "message": "Only one setting can be updated at a time"}), 400

    key, value = next(iter(data.items()))
    allowed_keys = ['critical_stock_alerts', 'appointment_reminders', 'donation_thank_you']

    if key not in allowed_keys:
        return jsonify({"success": False, "message": "Invalid setting key"}), 400

    # Update only the provided field
    cursor = conn.cursor()
    cursor.execute(f"""
        UPDATE systemsettings
        SET {key} = %s
    """, (value,))
    conn.commit()

    return jsonify({"success": True, "message": f"{key} updated to {value}"})

    data = request.get_json()
    # Example fields expected
    critical = data.get('critical_stock_alerts')
    appointment = data.get('appointment_reminders')
    thank_you = data.get('donation_thank_you')

    # Update DB or config file accordingly
    # Example (PostgreSQL):
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE systemsettings SET
        critical_stock_alerts = %s,
        appointment_reminders = %s,
        donation_thank_you = %s
    """, (critical, appointment, thank_you))
    conn.commit()
    return jsonify({"success": True, "message": "Settings updated"})


# @app.route('/api/send-notification', methods=['POST'])
# @token_required
# def send_low_stock_alert(decoded_token):
#     data = request.get_json()
#     blood_type = data.get("bloodType")
#     units = data.get("units")

#     if not blood_type:
#         return jsonify({"success": False, "message": "Missing blood type"}), 400

#     try:
#         # Only donors who:
#         # - are in DonorDetails
#         # - have email_notifications_enabled = TRUE
#         # - have email IS NOT NULL
#         # - are eligible (e.g., last_donation at least 60 days ago)
#         query = '''
#             SELECT u.email
#             FROM Users u
#             JOIN DonorDetails d ON u.user_id = d.donor_id
#             WHERE u.email_notifications_enabled = TRUE
#               AND u.email IS NOT NULL
#               AND d.last_donation IS NOT NULL
#               AND d.last_donation <= (CURRENT_DATE - INTERVAL '60 days')
#               AND d.blood_type = %s
#         '''

#         cursor.execute(query, (blood_type,))
#         recipients = [row[0] for row in cursor.fetchall()]

#         if not recipients:
#             return jsonify({"success": False, "message": "No eligible donors found"}), 200

#         for email in recipients:
#             send_email_notification(
#                 to=email,
#                 subject=f"Urgent Need for {blood_type} Blood",
#                 body=f"Our inventory for {blood_type} blood is low ({units} units). If you’re eligible, please donate today."
#             )

#         return jsonify({"success": True, "sent_to": recipients}), 200

#     except Exception as e:
#         print("Error sending alert:", str(e))
#         return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/send-notification', methods=['POST'])
@token_required
def send_notification(decoded_token):
    data = request.get_json()

    subject = data.get('subject')
    message = data.get('message')
    event = data.get('event', 'general')
    blood_type = data.get('bloodType')
    units = data.get('units')
    type = data.get('type', 'email')
    recipient_input = data.get('recipient')

    # Basic input validation
    if not subject or not message:
        return jsonify({"success": False, "message": "Missing subject or message"}), 400

    try:
        # Step 1: Determine recipients
        recipients = []

        if recipient_input == "all":
            cursor.execute("SELECT email FROM Users WHERE email_notifications_enabled = TRUE AND email IS NOT NULL")
            recipients = [row[0] for row in cursor.fetchall()]

        elif event == 'lowStock' and blood_type:
            cursor.execute('''
                SELECT u.email
                FROM Users u
                JOIN DonorDetails d ON u.user_id = d.donor_id
                WHERE u.email_notifications_enabled = TRUE
                  AND u.email IS NOT NULL
                  AND d.last_donation IS NOT NULL
                  AND d.last_donation <= (CURRENT_DATE - INTERVAL '121 days')
                  AND d.blood_type = %s
            ''', (blood_type,))
            recipients = [row[0] for row in cursor.fetchall()]

        elif recipient_input:
            recipients = [recipient_input]

        else:
            return jsonify({"success": False, "message": "Missing recipient or unsupported mode"}), 400

        # Step 2: Check if anyone should be notified
        if not recipients:
            return jsonify({"success": False, "message": "No eligible recipients found"}), 200

        # Step 3: Send email and log it
        success_count = 0
        for email in recipients:
            if not email:
                print(f"⚠️ Skipping invalid email: {email}")
                continue

            print(f"📧 Sending to: {email}")
            print(f"📝 Subject: {subject}")
            print(f"📝 Message: {message}")

            try:
                success = send_email_notification(email, subject, message)
            except Exception as e:
                print(f"❌ Error sending to {email}: {e}")
                success = False

            status = 'sent' if success else 'failed'

            cursor.execute("""
                INSERT INTO notifications (recipient, subject, message, event, blood_type, units, type, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (email, subject, message, event, blood_type, units, type, status))

            if success:
                success_count += 1

        conn.commit()

        return jsonify({
            "success": True,
            "message": f"✅ Notified {success_count} users.",
        }), 200

    except Exception as e:
        conn.rollback()
        print(f"❌ Server error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500



@app.route('/api/tracking/logs', methods=['GET'])
@token_required
def get_tracking_logs(decoded_token):
    try:
        cursor.execute("""
            SELECT 
                t.blood_unit_id,
                t.status,
                t.location,          -- Hospital name
                t.timestamp,         -- Expected arrival time
                t.from_location,     -- Donation center
                t.units_dispatched   -- How many units (in standard 450ml units)
            FROM Tracking t
            ORDER BY t.timestamp DESC
        """)

        rows = cursor.fetchall()

        logs = []
        for row in rows:
            logs.append({
                "blood_unit_id": row[0],
                "status": row[1],
                "location": row[2] or "Unknown",
                "expected_arrival": row[3].isoformat() if row[3] else None,
                "from_location": row[4] or "Unknown",
                "units_dispatched": row[5] or 0
            })

        return jsonify(logs), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500



@app.route('/api/hospital/approve-request/<int:request_id>', methods=['POST'])
@token_required
def approve_hospital_request(decoded_token, request_id):
    try:
        # Step 1: Get request details and hospital name
        cursor.execute("""
            SELECT r.blood_type, r.units_needed, r.hospital_id, u.name, r.urgency
            FROM BloodRequests r
            JOIN Users u ON r.hospital_id = u.user_id
            WHERE r.request_id = %s AND r.status = 'pending'
        """, (request_id,))
        result = cursor.fetchone()

        if not result:
            return jsonify({"success": False, "message": "Request not found"}), 404

        blood_type, units_needed, hospital_id, hospital_name, urgency = result
        required_ml = units_needed * 450

        # Step 2: Fetch inventory
        cursor.execute("""
            SELECT blood_unit_id, units_ml, current_location
            FROM BloodInventory
            WHERE blood_type = %s AND status = 'stored'
            ORDER BY expiry_date ASC
        """, (blood_type,))
        rows = cursor.fetchall()

        total_ml = 0
        selected_units = []

        for blood_unit_id, units_ml, from_location in rows:
            if total_ml >= required_ml:
                break
            dispatch_ml = min(units_ml, required_ml - total_ml)
            units_dispatched = round(dispatch_ml / 450, 2)
            new_units_ml = units_ml - dispatch_ml
            total_ml += dispatch_ml

            selected_units.append((blood_unit_id, dispatch_ml, new_units_ml, units_dispatched, from_location))

        if total_ml < required_ml:
            return jsonify({"success": False, "message": "Not enough units available"}), 400

        # Step 3: Process selected units
        urgency_days = 1 if urgency == 'urgent' else 2
        expected_arrival = datetime.utcnow() + timedelta(days=urgency_days)

        for blood_unit_id, dispatch_ml, new_units_ml, units_dispatched, from_location in selected_units:
            cursor.execute("""
                UPDATE BloodInventory
                SET units_ml = %s
                WHERE blood_unit_id = %s
            """, (new_units_ml, blood_unit_id))

            cursor.execute("""
                INSERT INTO Tracking (
                    blood_unit_id, status, location, request_id, 
                    units_dispatched, from_location, timestamp
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                blood_unit_id,
                'in_transit',
                hospital_name,
                request_id,
                units_dispatched,
                from_location,
                expected_arrival.isoformat()
            ))

        # Step 4: Mark request as approved
        cursor.execute("""
            UPDATE BloodRequests
            SET status = 'approved', fulfilled_date = CURRENT_TIMESTAMP
            WHERE request_id = %s
        """, (request_id,))
        
        # Get hospital email
        cursor.execute("SELECT email FROM Users WHERE user_id = %s", (hospital_id,))
        email_row = cursor.fetchone()
        if email_row:
            hospital_email = email_row[0]
            subject = f"Your Blood Request for {blood_type} is Approved"
            message = f"Dear {hospital_name},\n\nYour blood request for {units_needed} unit(s) of {blood_type} has been approved and is on the way.\n\nRegards,\nLifeFlow Team"
            send_email_notification(hospital_email, subject, message)


        conn.commit()
        return jsonify({"success": True, "message": f"{units_needed} units dispatched to {hospital_name}"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500




@app.route('/api/admin/approve-donor/<int:appointment_id>', methods=['POST'])
def approve_donor_request(appointment_id):
    try:
        cursor = conn.cursor()

        # 1. Get appointment details
        cursor.execute('''
            SELECT a.donor_id, u.name, dd.blood_type
            FROM Appointments a
            JOIN DonorDetails dd ON dd.donor_id = a.donor_id
            JOIN Users u ON u.user_id = a.donor_id
            WHERE a.appointment_id = %s AND a.status = 'scheduled'
        ''', (appointment_id,))
        result = cursor.fetchone()

        if not result:
            return jsonify({"success": False, "message": "Donation not found or already approved"}), 404

        donor_id, name, blood_type = result
        today = datetime.utcnow().date()
        expiry = today + timedelta(days=42)
        units_ml = 450  # 1 unit

        # 2. Check for existing inventory
        cursor.execute('''
            SELECT blood_unit_id, units_ml FROM BloodInventory
            WHERE blood_type = %s AND status = 'stored'
            ORDER BY expiry_date ASC LIMIT 1
        ''', (blood_type,))
        existing = cursor.fetchone()

        if existing:
            blood_unit_id, current_ml = existing
            cursor.execute('''
                UPDATE BloodInventory SET units_ml = %s
                WHERE blood_unit_id = %s
            ''', (current_ml + units_ml, blood_unit_id))
        else:
            cursor.execute('''
                INSERT INTO BloodInventory (
                    donor_id, hospital_id, blood_type, units_ml, 
                    collected_date, expiry_date, status, current_location
                ) VALUES (%s, %s, %s, %s, %s, %s, 'stored', %s)
            ''', (donor_id, 1, blood_type, units_ml, today, expiry, "Central Storage"))

        # 3. Update appointment status
        cursor.execute('''
            UPDATE Appointments SET status = 'completed'
            WHERE appointment_id = %s
        ''', (appointment_id,))

        conn.commit()
        return jsonify({"success": True, "message": "Donation approved and added to inventory"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


# @app.route('/api/admin/reject-donor/<int:request_id>', methods=['POST'])
# def reject_donor_request(request_id):
#     try:
#         cursor = conn.cursor()

#         cursor.execute("""
#             UPDATE BloodInventory
#             SET status = 'rejected'
#             WHERE blood_unit_id = %s
#         """, (request_id,))

#         conn.commit()
#         return jsonify({"success": True, "message": "Donation rejected."}), 200

#     except Exception as e:
#         conn.rollback()
#         return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/admin/reject-donor/<int:request_id>', methods=['POST'])
def reject_donor_request(request_id):
    try:
        cursor = conn.cursor()

        # ✅ Fix the correct table name
        cursor.execute("""
            UPDATE appointments
            SET status = 'rejected'
            WHERE appointment_id = %s
        """, (request_id,))

        conn.commit()
        return jsonify({"success": True, "message": "Donation request rejected."}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/admin/missed-donor/<int:request_id>', methods=['POST'])
def mark_appointment_missed(request_id):
    try:
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE Appointments
            SET status = 'missed'
            WHERE appointment_id = %s
        """, (request_id,))

        conn.commit()
        return jsonify({"success": True, "message": "Appointment marked as missed."}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/admin/donor-requests', methods=['GET'])
def get_donor_requests():
    try:
        cursor = conn.cursor()

        query = """
            SELECT 
                a.appointment_id AS donation_id,
                u.user_id AS donor_id,
                u.name AS donor_name,
                dd.blood_type,
                a.status,
                a.scheduled_date AS created_at
            FROM Appointments a
            JOIN DonorDetails dd ON a.donor_id = dd.donor_id
            JOIN Users u ON u.user_id = dd.donor_id
            WHERE a.status IN ('scheduled', 'completed')
            ORDER BY a.scheduled_date DESC;
        """

        cursor.execute(query)
        columns = [desc[0] for desc in cursor.description]
        rows = [dict(zip(columns, row)) for row in cursor.fetchall()]

        return jsonify(rows), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"message": str(e)}), 500



@app.route('/appointments/history/<int:donor_id>', methods=['GET'])
@token_required
def get_donation_history(decoded_token, donor_id):
    try:
        cursor.execute("""
            SELECT a.scheduled_date, a.time_slot, a.status, d.name AS location
            FROM appointments a
            JOIN donation_centers d ON CAST(a.hospital_id AS TEXT) = d.id
            WHERE a.donor_id = %s AND a.status = 'completed'
            ORDER BY a.scheduled_date DESC;
        """, (donor_id,))

        results = cursor.fetchall()

        if not results:
            return jsonify([]), 200  # Return empty list if no history

        history = []
        for row in results:
            history.append({
                "appointment_date": row[0].strftime("%Y-%m-%d"),
                "time_slot": row[1],
                "status": row[2],
                "location": row[3]
            })

        return jsonify(history), 200

    except Exception as e:
        conn.rollback()
        print(f"Error fetching donation history: {e}")
        return jsonify({"error": "Failed to fetch donation history", "message": str(e)}), 500

@app.route('/settings/contact-info')
def get_contact_info():
    return jsonify({
        "address": "Martyrs' Square, Downtown Beirut",
        "city": "Beirut, Lebanon",
        "phone": "+961 1 123 456",
        "email": "contact@lifeflow.lb"
    })

@app.route('/settings/social-links')
def get_social_links():
    return jsonify([
        {"id": "1", "platform": "Facebook", "url": "https://facebook.com", "icon": "facebook"},
        {"id": "2", "platform": "Twitter", "url": "https://twitter.com", "icon": "twitter"},
        {"id": "3", "platform": "Instagram", "url": "https://instagram.com", "icon": "instagram"},
        {"id": "4", "platform": "LinkedIn", "url": "https://linkedin.com", "icon": "linkedin"}
    ])


def generate_random_password(length=8):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

@app.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')

    if not email:
        return jsonify({"error": "Email is required"}), 400
    
    if email == 'admin@lifeflow.com':
        return jsonify({'message': 'Something went wrong!'}), 403


    cursor = conn.cursor()
    cursor.execute("SELECT user_id FROM users WHERE email = %s", (email,))
    user = cursor.fetchone()

    if not user:
        return jsonify({"message": "If this email exists, a new password has been sent."}), 200

    new_password = generate_random_password()
    hashed_password = generate_password_hash(new_password)

    cursor.execute("UPDATE users SET password_hash = %s WHERE email = %s", (hashed_password, email))
    conn.commit()

    # Send email with the new password
    subject = "Password Resset"
    message = f"Hello,\n\nYour new temporary password is: {new_password}\n\nPlease log in and change it immediately."

    send_email_notification(email, subject, message)

    return jsonify({"message": "A new password has been sent to your email."}), 200

@app.route('/appointments/cancel/<int:appointment_id>', methods=['PATCH'])
def cancel_appointment(appointment_id):
    try:
        cursor = conn.cursor()

        # Fix: use `appointment_id` instead of `id`
        cursor.execute("SELECT appointment_id FROM appointments WHERE appointment_id = %s", (appointment_id,))
        appointment = cursor.fetchone()

        if not appointment:
            return jsonify({"message": "Appointment not found"}), 404

        cursor.execute("UPDATE appointments SET status = %s WHERE appointment_id = %s", ('cancelled', appointment_id))
        conn.commit()

        return jsonify({"message": "Appointment cancelled successfully"}), 200

    except Exception as e:
        conn.rollback()
        print("Error cancelling appointment:", e)
        return jsonify({"message": "Internal server error"}), 500


if __name__ == '__main__':
    app.run(port=5000, debug=True)


