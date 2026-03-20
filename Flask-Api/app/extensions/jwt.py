import jwt
from datetime import datetime, timedelta, timezone
from flask import current_app

def generate_access_token(user):
    payload = {
        "uid": user["uid"],
        "email": user.get("email"),
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15)
    }
    return jwt.encode(payload, current_app.config["JWT_SECRET"], algorithm="HS256")

def generate_refresh_token(user):
    payload = {
        "uid": user["uid"],
        "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, current_app.config["JWT_SECRET"], algorithm="HS256")