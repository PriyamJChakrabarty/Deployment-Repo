import os

from pymongo import MongoClient

MONGO_URI = os.getenv("MONGO_URI")

if not MONGO_URI:
    print("MongoDB connection skipped: MONGO_URI is not set.")
    db = None
else:
    try:
        client = MongoClient(MONGO_URI)
        db = client.get_default_database()

        if db is None:
            db = client["zudia"]

        print("MongoDB connection established successfully.")
    except Exception as e:
        print("MongoDB connection failed:", e)
        db = None


def get_database():
    if db is None:
        raise ConnectionError("Database connection not established.")
    return db
