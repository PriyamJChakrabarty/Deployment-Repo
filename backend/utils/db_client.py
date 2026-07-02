from pymongo import MongoClient
import os

# ✅ Set up MongoDB URI (replace with your own or use environment variable)
MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb+srv://7:7@hi.h1oyc5m.mongodb.net/?appName=hi"
)

# ✅ Initialize MongoDB client once
try:
    client = MongoClient(MONGO_URI)
    db = client["hi"]  # choose your database name (here “hi”)
    print("✅ MongoDB connection established successfully.")
except Exception as e:
    print("❌ MongoDB connection failed:", e)
    db = None


def get_database():
    """
    Returns the connected MongoDB database instance.
    """
    if db is None:
        raise ConnectionError("Database connection not established.")
    return db
