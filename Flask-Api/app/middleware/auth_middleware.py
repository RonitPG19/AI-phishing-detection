from functools import wraps
from flask import request, jsonify, current_app
import jwt
from app.modules.auth.services import blacklist

def jwt_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization")

        if not token:
            return jsonify({"error":"Missing token"}), 401
        
        token = token.split(" ")[1]

        if token in blacklist:
            return jsonify({"error":"Token revoked"}), 401
        
        try:
            decoded = jwt.decode(
                token,
                current_app.config["JWT_SECRET"],
                algorithms=["HS256"]
            )
        except:
            return jsonify({"error": "Invalid token"}), 401
        
        return f(decoded, *args, **kwargs)
    
    return decorated