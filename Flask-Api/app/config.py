import os

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "secret")
    JWT_SECRET = os.getenv("JWT_SECRET", "jwtsecret")
    