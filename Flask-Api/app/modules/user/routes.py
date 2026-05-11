from flask import Blueprint
from app.middleware.auth_middleware import jwt_required
from app.middleware.role_middleware import role_required

user_bp = Blueprint("user", __name__)

@user_bp.route("/profile")
@jwt_required
def profile(current_user):
    return {"user": current_user}

# ✅ Admin-only route
@user_bp.route("/admin")
@jwt_required
@role_required("admin")
def admin_dashboard(current_user):
    return {"message": "Welcome Admin"}