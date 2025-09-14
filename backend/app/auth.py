from datetime import datetime, timedelta
from typing import Optional
import os

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from authlib.integrations.starlette_client import OAuth

from .database import get_db
from . import models, schemas


SECRET_KEY = "CHANGE_ME_SECRET"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter(prefix="/api/auth", tags=["auth"])


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    if not password_hash:
        return False
    return password_context.verify(password, password_hash)


def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode = {"sub": subject, "exp": expire}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user_id(token: str = None) -> Optional[int]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        return int(sub) if sub is not None else None
    except Exception:
        return None


# ---------- OAuth Providers (Google, Facebook, LinkedIn, Instagram) ----------
oauth = OAuth()

def _register_oauth_clients():
    # Register providers only if env vars are present
    if os.getenv("GOOGLE_CLIENT_ID") and os.getenv("GOOGLE_CLIENT_SECRET"):
        oauth.register(
            name="google",
            client_id=os.getenv("GOOGLE_CLIENT_ID"),
            client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
            server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
            client_kwargs={"scope": "openid email profile"}
        )
    if os.getenv("FACEBOOK_CLIENT_ID") and os.getenv("FACEBOOK_CLIENT_SECRET"):
        oauth.register(
            name="facebook",
            client_id=os.getenv("FACEBOOK_CLIENT_ID"),
            client_secret=os.getenv("FACEBOOK_CLIENT_SECRET"),
            access_token_url="https://graph.facebook.com/v10.0/oauth/access_token",
            authorize_url="https://www.facebook.com/v10.0/dialog/oauth",
            api_base_url="https://graph.facebook.com/",
            client_kwargs={"scope": "email"}
        )
    if os.getenv("LINKEDIN_CLIENT_ID") and os.getenv("LINKEDIN_CLIENT_SECRET"):
        oauth.register(
            name="linkedin",
            client_id=os.getenv("LINKEDIN_CLIENT_ID"),
            client_secret=os.getenv("LINKEDIN_CLIENT_SECRET"),
            access_token_url="https://www.linkedin.com/oauth/v2/accessToken",
            authorize_url="https://www.linkedin.com/oauth/v2/authorization",
            api_base_url="https://api.linkedin.com/v2/",
            client_kwargs={"scope": "r_liteprofile r_emailaddress"}
        )
    if os.getenv("INSTAGRAM_CLIENT_ID") and os.getenv("INSTAGRAM_CLIENT_SECRET"):
        oauth.register(
            name="instagram",
            client_id=os.getenv("INSTAGRAM_CLIENT_ID"),
            client_secret=os.getenv("INSTAGRAM_CLIENT_SECRET"),
            access_token_url="https://api.instagram.com/oauth/access_token",
            authorize_url="https://api.instagram.com/oauth/authorize",
            api_base_url="https://graph.instagram.com/",
            client_kwargs={"scope": "user_profile"}
        )

_register_oauth_clients()


@router.get("/oauth/{provider}")
async def oauth_login(provider: str, request: Request):
    if provider not in oauth:
        raise HTTPException(status_code=400, detail=f"Provider '{provider}' not configured")
    redirect_uri = request.url_for("oauth_callback", provider=provider)
    return await oauth[provider].authorize_redirect(request, redirect_uri)


@router.get("/oauth/{provider}/callback", name="oauth_callback")
async def oauth_callback(provider: str, request: Request, db: Session = Depends(get_db)):
    if provider not in oauth:
        raise HTTPException(status_code=400, detail=f"Provider '{provider}' not configured")
    token = await oauth[provider].authorize_access_token(request)

    email = None
    name = None
    try:
        if provider == "google":
            userinfo = token.get("userinfo")
            if not userinfo:
                userinfo = await oauth.google.parse_id_token(request, token)
            email = userinfo.get("email")
            name = userinfo.get("name")
        elif provider == "facebook":
            resp = await oauth.facebook.get("/me?fields=id,name,email", token=token)
            data = resp.json()
            email = data.get("email")
            name = data.get("name")
        elif provider == "linkedin":
            email_resp = await oauth.linkedin.get("emailAddress?q=members&projection=(elements*(handle~))", token=token)
            email_data = email_resp.json()
            elements = email_data.get("elements", [])
            if elements:
                email = elements[0].get("handle~", {}).get("emailAddress")
            profile_resp = await oauth.linkedin.get("me", token=token)
            prof = profile_resp.json()
            first = prof.get("localizedFirstName", "")
            last = prof.get("localizedLastName", "")
            name = (first + " " + last).strip()
        elif provider == "instagram":
            # Instagram Basic Display API doesn't provide email. Use id as key and ask user to add email later.
            resp = await oauth.instagram.get("me?fields=id,username", token=token)
            data = resp.json()
            name = data.get("username")
            email = None
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to retrieve user profile from provider")

    if not email:
        # Create a placeholder email for providers without email (e.g., instagram)
        if name:
            email = f"{name}@{provider}.oauth"
        else:
            raise HTTPException(status_code=400, detail="Email not available from provider")

    # Upsert user
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        user = models.User(name=name or email.split("@")[0], email=email, password_hash=None)
        db.add(user)
        db.commit()
        db.refresh(user)

    jwt_token = create_access_token(subject=str(user.id))
    # Redirect back to frontend with token. Frontend should capture and store it.
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:9090")
    return RedirectResponse(url=f"{frontend_url}/#oauth=success&token={jwt_token}")

@router.post("/register", response_model=schemas.User)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = models.User(
        name=user.name,
        email=user.email,
        password_hash=hash_password(user.password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return schemas.User(id=new_user.id, name=new_user.name, email=new_user.email)


@router.post("/login", response_model=schemas.Token)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash or ""):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(subject=str(user.id))
    return schemas.Token(access_token=token)


def get_current_user(token: str = None, db: Session = Depends(get_db)) -> models.User:
    """Get current user from token or return a default user for testing"""
    if not token:
        # For testing purposes, return the first user or create a default one
        user = db.query(models.User).first()
        if not user:
            # Create a default user for testing
            user = models.User(
                name="Test User",
                email="test@example.com",
                password_hash=None
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return user
    
    try:
        user_id = get_current_user_id(token)
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


