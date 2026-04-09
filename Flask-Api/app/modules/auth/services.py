from flask import request, current_app
from firebase_admin import auth
from app.extensions.firebase import db
from app.extensions.jwt import generate_access_token, generate_refresh_token
from app.utils.hashing import hash_password, verify_password
from datetime import datetime, timezone
import jwt
from google.cloud.firestore_v1 import FieldFilter

blacklist = set()



def unified_login():
    try:
        auth_header = request.headers.get("Authorization")
        data = request.get_json(silent=True)

        # CASE 1: Firebase login (token present)
        if auth_header:
            token = auth_header.split(" ")[1]

            decoded = auth.verify_id_token(token)

            if not decoded.get("email_verified"):
                return {"error": "Email not verified"}, 403

            uid = decoded["uid"]
            email = decoded.get("email")

            user_ref = db.collection("users").document(uid)

            if not user_ref.get().exists:
                user_ref.set({
                    "uid": uid,
                    "email": email,
                    "provider": "firebase",
                    "role": "user",
                    "created_at": datetime.now(timezone.utc)
                })

            user_data = user_ref.get().to_dict()

            #  inject role
            decoded["role"] = user_data.get("role", "user")

            access = generate_access_token(decoded)
            refresh = generate_refresh_token(decoded)

            return {"access": access, "refresh": refresh}

        # CASE 2: Email/password login
        elif data:
            email = data.get("email")
            password = data.get("password")

            users_ref = db.collection("users")

            user_query = users_ref.where(
                filter=FieldFilter("email", "==", email)
            ).get()

            if not user_query:
                return {"error": "Invalid credentials"}, 401

            user = user_query[0].to_dict()

            # If Firebase user → fallback automatically
            if "password" not in user:
                return {"error": "Please login with Google"}, 400

            if not verify_password(password, user["password"]):
                return {"error": "Invalid credentials"}, 401

            user["role"] = user.get("role", "user")

            access = generate_access_token(user)
            refresh = generate_refresh_token(user)

            return {"access": access, "refresh": refresh}

        return {"error": "Invalid request"}, 400

    except Exception as e:
        return {"error": str(e)}, 500




# Google Login
def firebase_login():
    token = request.headers.get("Authorization")

    if not token:
        return {"error": "Missing token"}, 401
    
    token = token.split(" ")[1]

    decoded = auth.verify_id_token(token, clock_skew_seconds=5)

    if not decoded.get("email_verified"):
        return {"error": "Email not verified"}, 403

    uid = decoded["uid"]
    email = decoded.get("email")

    user_ref = db.collection("users").document(uid)

    # Create user if not exists
    if not user_ref.get().exists:
        user_ref.set({
            "uid": uid,
            "email": email,
            "provider": "google",
            "role": "user",  # default role
            "created_at": datetime.now(timezone.utc)
        })

    # Fetch user data
    user_doc = user_ref.get()
    user_data = user_doc.to_dict()

    role = user_data.get("role", "user")

    # Inject role into JWT payload
    decoded["role"] = role

    access = generate_access_token(decoded)
    refresh = generate_refresh_token(decoded)

    # store refresh token
    db.collection("tokens").document(uid).set({
        "refresh": refresh
    })

    return {"access": access, "refresh": refresh}

# Function to create an admin user
def create_admin(current_user):
    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return {"error": "Email and password required"}, 400

    # Check if user already exists
    users_ref = db.collection("users")
    existing = users_ref.where(filter=FieldFilter("email", "==", email)) 

    if existing:
        return {"error": "User already exists"}, 400

# Function for the registration
def register_user():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return {"error": "Missing fields"}, 400
    
    users = db.collection("users").where("email", "==", email).stream()
    if any(users):
        return {"error": "User exists"}, 400
    
    hashed = hash_password(password)

    doc = db.collection("users").document()
    doc.set({
        "uid": doc.id,
        "email": email,
        "password": hashed,
        "role":"user",
        "provider":"local",
        "created_by": datetime.now(timezone.utc)
    })

    return {"message":"Registered"}, 201

# # Function of user login
# def login_user():
#     data = request.json
#     email = data.get("email")
#     password = data.get("password")

#     users = db.collection("users").where("email", "==", email).stream()

#     user = None
#     for u in users:
#         user = u.to_dict()
#         break

#     if not user:
#         return {"error": "User not found"}, 404

#     # ❗ Check if password exists
#     if "password" not in user:
#         return {"error": "Use Google/api/auth/firebase-login login for this account"}, 400

#     if not verify_password(password, user["password"]):
#         return {"error": "Invalid credentials"}, 401
    
#     access = generate_access_token(user)
#     refresh = generate_refresh_token(user)

#     db.collection("tokens").document(user["uid"]).set({
#         "refresh":refresh
#     })

#     return {"access":access, "refresh": refresh}

# Function for the refresh token
def refresh_token():
    token = request.json.get("refresh")

    try:
        decoded = jwt.decode(
            token,
            current_app.config["JWT_SECRET"],
            algorithms=["HS256"]
        )
        uid = decoded["uid"]

        stored = db.collection("tokens").document(uid).get().to_dict()

        if stored["refresh"] != token:
            return {"error": "Invalid refresh token"}, 401
        
        return {"access": generate_access_token(decoded)}
    
    except Exception as e:
        return {"error": str(e)}, 401
    

# Function for logout

def logout_user():
    token = request.headers.get("Authorization").split(" ")[1]
    blacklist.add(token)

    return {"message": "Logged out"}
