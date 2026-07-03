from utils.db_client import get_database

def test_connection():
    db = get_database()
    print("Database name:", db.name)

    # Example: test listing collections
    print("Available collections:", db.list_collection_names())

if __name__ == "__main__":
    test_connection()
