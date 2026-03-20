from flask import Flask
from .congig import Config
from .extensions.firebase import init_firebase

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    init_firebase()

    from .modules.auth.routes import auth_bp
    from .modules.user.routes import user_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(user_bp, url_prefix="/api/user")

    return app