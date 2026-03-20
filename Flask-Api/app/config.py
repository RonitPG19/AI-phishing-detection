import os

class config:
    SECRET_KEY = os.getenv("SECRET_KEY")
    FIREBASE_CREDENTIALS = os.getenv("FIREBASE_CREDENTIALS")
    JWT_SECRET = os.getenv("JWT_SECRET")