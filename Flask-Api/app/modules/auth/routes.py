from flask import Blueprint
from .services import (
    unified_login,
    register_user,
    refresh_token,
    logout_user,
    create_admin,
    firebase_login
)
from app.middleware.auth_middleware import jwt_required
from app.middleware.role_middleware import role_required


auth_bp = Blueprint("auth", __name__)

auth_bp.route("/firebase-login", methods=["POST"])(firebase_login)
auth_bp.route("/register", methods=["POST"])(register_user)
auth_bp.route("/login", methods=["POST"])(unified_login)
auth_bp.route("/refresh", methods=["POST"])(refresh_token)
auth_bp.route("/logout", methods=["POST"])(logout_user)

auth_bp.route("/create-admin", methods=["POST"])(
    jwt_required(
        role_required("admin")(create_admin)
    )
)