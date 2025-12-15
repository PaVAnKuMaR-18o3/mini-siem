from pymongo import MongoClient
from .config import settings

# Connect synchronously (local dev)
_client = MongoClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
db = _client[settings.DB_NAME]

# Collections (sync objects)
logs_coll = db["logs"]
alerts_coll = db["alerts"]
