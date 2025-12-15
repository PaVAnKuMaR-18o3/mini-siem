# backend/auth.py
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt  # PyJWT
from pydantic import BaseModel

# ---- SIMPLE SETTINGS (for demo) ----
# In a real project, move these to config/env.
SECRET_KEY = "change-this-to-a-long-random-secret"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# ---- SIMPLE IN-MEMORY USER ----
# You can change username/password here and also in the login docs/use.
FAKE_USER = {
    "username": "admin",
    "password": "admin123",  # plain text for simplicity
    "full_name": "Mini SIEM Admin",
}

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class LoginRequest(BaseModel):
    username: str
    password: str

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def authenticate_user(username: str, password: str) -> Optional[Dict[str, Any]]:
    if username != FAKE_USER["username"] or password != FAKE_USER["password"]:
        return None
    # return a safe copy
    return {"username": FAKE_USER["username"], "full_name": FAKE_USER["full_name"]}

async def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str | None = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    if username != FAKE_USER["username"]:
        raise credentials_exception
        
    return {"username": username, "full_name": FAKE_USER["full_name"]}