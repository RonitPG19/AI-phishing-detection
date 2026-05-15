from flask import Blueprint

from app.middleware.auth_middleware import jwt_required
from app.middleware.role_middleware import role_required
from .services import dashboard_summary, delete_user, list_users, update_user

admin_bp = Blueprint("admin", __name__)

admin_bp.route("/dashboard/summary", methods=["GET"])(
    jwt_required(role_required("admin")(dashboard_summary))
)
admin_bp.route("/users", methods=["GET"])(
    jwt_required(role_required("admin")(list_users))
)
admin_bp.route("/users/<user_id>", methods=["PATCH"])(
    jwt_required(role_required("admin")(update_user))
)
admin_bp.route("/users/<user_id>", methods=["DELETE"])(
    jwt_required(role_required("admin")(delete_user))
)
