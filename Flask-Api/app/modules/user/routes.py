from flask import Blueprint
from app.middleware.auth_middleware import jwt_required

user_bp = Blueprint("user", __name__)

@user_bp.route("/profile")
@jwt_required
def profile(current_user):
    return {"user": current_user}