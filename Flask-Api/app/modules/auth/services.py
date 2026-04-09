from flask import request, current_app
from firebase_admin import auth
from app.extensions.firebase import db
from app.extensions.jwt import generate_access_token, generate_refresh_token
from app.utils.hashing import hash_password, verify_password
from datetime import datetime, timezone
import jwt

blacklist = set()

# Google Login
def firebase_login():
    token = request.headers.get("Authorization")

    if not token:
        return {"error": "Missing token"}, 401
    
    token = token.split(" ")[1]
    decoded = auth.verify_id_token(token)

    if not decoded.get("email_verified"):
        return {"error": "Email not verified"}, 403

    uid = decoded["uid"]
    email = decoded.get("email")

    user_ref = db.collection("uesrs").document(uid)

    if not user_ref.get().exists:
        user_ref.set({
            "uid": uid,
            "email": email,
            "provider": "google",
            "created_at": datetime.now(timezone.utc)
        })

    access = generate_access_token(decoded)
    refresh = generate_refresh_token(decoded)

    # store refresh token
    db.collection("tokens").document(uid).set({
        "refresh": refresh
    })

    return {"access":access, "refresh": refresh}

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
        "provider":"local",
        "created_by": datetime.now(timezone.utc)
    })

    return {"message":"Registered"}, 201

# Function of user login
def login_user():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    users = db.collection("users").where("email", "==", email).stream()

    user = None
    for u in users:
        user = u.to_dict()
        break

    if not user or not verify_password(password, user["password"]):
        return {"error":"Invalid credentials"}, 401
    
    access = generate_access_token(user)
    refresh = generate_refresh_token(user)

    db.collection("tokens").document(user["uid"]).set({
        "refresh":refresh
    })

    return {"access":access, "refresh": refresh}

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
