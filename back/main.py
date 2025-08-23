import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from supabase import create_client, Client
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends

print("Starting the application...")
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # في الإنتاج حط دومين فرونت إند هنا
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/register")
async def register_user(request: Request):
    data = await request.json()
    data.pop("id", None)  # نتأكد أن الفرونت ما يرسل id

    try:
        response = supabase.table("users").insert(data).execute()

        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to insert user")

        return {
            "message": "User registered successfully",
            "data": response.data,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

SECRET_KEY = "1234"  
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@app.post("/login")
async def login_user(request: Request):
    data = await request.json()
    email, password = data.get("email"), data.get("password")

    response = supabase.table("users").select("*").eq("email", email).eq("password", password).execute()
    if not response.data:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = response.data[0]
    token = create_access_token(
        {"sub": str(user["id"])}, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return {"access_token": token, "token_type": "bearer"}


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return int(user_id)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@app.get("/users/me/projects")
async def get_my_projects(current_user: int = Depends(get_current_user)):
    response = supabase.table("projects").select("*").eq("user_id", current_user).execute()
    return {"projects": response.data}
