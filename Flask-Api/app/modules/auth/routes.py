from flask import Blueprint
from .services import (
    google_login,
    register_user,
    login_user,
    refresh_token,
    logout_user
)


auth_bp = Blueprint("auth", __name__)

auth_bp.route("/google", methods=["POST"])(google_login)
auth_bp.route("/register", methods=["POST"])(register_user)
auth_bp.route("/login", methods=["POST"])(login_user)
auth_bp.route("/refresh", methods=["POST"])(refresh_token)
auth_bp.route("logout", methods=["POST"])(logout_user)