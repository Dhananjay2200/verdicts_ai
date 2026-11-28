"""
Admin Authentication routes with Bearer JWT + production HTTPS cookie support.
"""

import hashlib
import jwt
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.config import get_settings
from app.database.session import get_db
from app.database.models import AdminUser

router = APIRouter(prefix="/auth", tags=["Auth"])
settings = get_settings()
SESSION_COOKIE_NAME = "verdicts_admin_session"


class LoginRequest(BaseModel):
    username: str
    password: str


def hash_pw(pw: str) -> str:
    return hashlib.sha256(pw.encode("utf-8")).hexdigest()


@router.post("/login")
def login(req: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(AdminUser).filter(AdminUser.username == req.username).first()
    if not user or user.password_hash != hash_pw(req.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid administrative credentials.",
        )

    expire = datetime.utcnow() + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user.username,
        "role": user.role,
        "exp": expire,
    }
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    cookie_domain = (
        settings.COOKIE_DOMAIN
        if settings.APP_ENV == "production" and settings.COOKIE_DOMAIN
        else None
    )
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.cookie_secure_flag,
        samesite=settings.COOKIE_SAMESITE,
        domain=cookie_domain,
        max_age=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "username": user.username,
        "role": user.role,
    }


@router.post("/logout")
def logout(response: Response):
    cookie_domain = (
        settings.COOKIE_DOMAIN
        if settings.APP_ENV == "production" and settings.COOKIE_DOMAIN
        else None
    )
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        domain=cookie_domain,
        path="/",
    )
    return {"status": "logged_out"}
