import jwt
from datetime import datetime, timedelta, timezone
from flask import current_app

def generate_token(email, token_type):
    payload = {
        "email": email,
        "type": token_type,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=60)
    }
    return jwt.encode(payload, current_app.config["JWT_SECRET"], algorithm="HS256")

def verify_token(token, expected_type):
    try:
        decoded = jwt.decode(
            token,
            current_app.config["JWT_SECRET"],
            algorithms=["HS256"]
        )

        if decoded["type"] != expected_type:
            return None
        
        return decoded
    
    except:
        return None