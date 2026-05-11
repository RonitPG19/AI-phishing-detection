from functools import wraps
from flask import jsonify

def role_required(required_role):
    def decorator(f):
        @wraps(f)
        def wrapper(current_user, *args, **kwargs):
            if current_user.get("role") != required_role:
                return jsonify({"error": "Unauthorized"}), 403
            return f(current_user, *args, **kwargs)
        return wrapper
    return decorator