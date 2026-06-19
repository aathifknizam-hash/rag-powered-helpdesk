import sqlite3
import os

db_path = 'db.sqlite3'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
tables = cursor.fetchall()

print("All database tables:")
for table in tables:
    print(f"  - {table[0]}")

print("\n✓ User-related tables:")
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%user%';")
user_tables = cursor.fetchall()
for table in user_tables:
    print(f"  - {table[0]}")

if ('authentication_user',) in user_tables:
    print("\n✓ SUCCESS: Custom user table 'authentication_user' exists!")
else:
    print("\n✗ ERROR: Custom user table 'authentication_user' NOT found!")

conn.close()
