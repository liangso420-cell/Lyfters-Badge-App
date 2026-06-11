import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import bcrypt
from pymongo import MongoClient

MONGO_URI = "mongodb+srv://asdsdiaw_db_user:UKbR6CZAkpTyg6QR@cluster0.twaz77j.mongodb.net/lyfter_db?retryWrites=true&w=majority"

client = MongoClient(MONGO_URI)
db = client["lyfter_db"]

admin_hash = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode()
user_hash  = bcrypt.hashpw(b"user123",  bcrypt.gensalt()).decode()

db["users"].update_many({"role": "admin"},       {"$set": {"password_hash": admin_hash}})
db["users"].update_many({"role": "participant"}, {"$set": {"password_hash": user_hash}})

print("Passwords actualizados en Atlas:")
print("  admin@lyfter.app  -> admin123")
print("  ana@lyfter.app    -> user123")
print("  carlos@lyfter.app -> user123")
