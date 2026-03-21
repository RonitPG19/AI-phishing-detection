from flask import Flask
from app.config import Config
from app.extensions.firebase import init_firebase
from app.extensions.limiter import limiter
from app.utils.logger import setup_logger

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    setup_logger()
    init_firebase()
    limiter.init_app(app)

    from app.modules.auth.routes import auth_bp
    from app.modules.user.routes import user_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(user_bp, url_prefix="/api/user")

    return app