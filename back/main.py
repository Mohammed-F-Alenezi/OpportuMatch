from supabase import create_client,Client
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# user1 = {
#     "id": 1,
#     'firstName': "John",
#     'middleName': "Michael",
#     'lastName': "Doe",
#     "email": "johndoe@example.com",
#     "password": "password123",
#     "phoneNumber": "+1234567890",
#     "age": 30,
#     "gender":'male',
#     "employment": "unemployed"   # or "student", "developer", etc.

# }

# user2 = {
#     "id": 1,
#     'firstName': "ahmed",
#     'middleName': "m",
#     'lastName': "Doe",
#     "email": "aa@example.com",
#     "password": "2345",
#     "phoneNumber": "+1234567890",
#     "age": 30,
#     "gender":'male',
#     "employment": "unemployed"   # or "student", "developer", etc.
# }
# supabase.table("users").insert(user1).execute()

print(supabase.table("users").select("*").execute())