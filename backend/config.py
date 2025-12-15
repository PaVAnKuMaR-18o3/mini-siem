# backend/config.py
# Simple config loader that reads .env and environment variables
# Avoids pydantic BaseSettings to sidestep pydantic-settings dependency.

import os
from dotenv import load_dotenv

load_dotenv()  # loads .env in current directory if present

def _env(name, default=None):
    v = os.getenv(name)
    return v if v is not None else default

MONGO_URI = _env("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = _env("DB_NAME", "mini_siem")
API_KEY = _env("API_KEY", "testkey123")
SLACK_WEBHOOK = _env("SLACK_WEBHOOK", "") or None
SMTP_SERVER = _env("SMTP_SERVER", "") or None
SMTP_PORT = int(_env("SMTP_PORT", "587"))
SMTP_USER = _env("SMTP_USER", "") or None
SMTP_PASS = _env("SMTP_PASS", "") or None

# grouping for compatibility with previous code that expected `settings`
class Settings:
    def __init__(self):
        self.MONGO_URI = MONGO_URI
        self.DB_NAME = DB_NAME
        self.API_KEY = API_KEY
        self.SLACK_WEBHOOK = SLACK_WEBHOOK
        self.SMTP_SERVER = SMTP_SERVER
        self.SMTP_PORT = SMTP_PORT
        self.SMTP_USER = SMTP_USER
        self.SMTP_PASS = SMTP_PASS

settings = Settings()
