from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import os

from .database import SessionLocal
from . import models

load_dotenv()

security = HTTPBearer()

ALGORITHM = "HS256"
SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY is not configured")


def get_current_student(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        student_id = payload.get("sub")

        if student_id is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token"
            )

        try:
            student_id = int(student_id)
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token"
            )

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token"
        )

    db: Session = SessionLocal()

    try:
        student = db.query(models.Student).filter(
            models.Student.id == student_id
        ).first()
    finally:
        db.close()

    if not student:
        raise HTTPException(
            status_code=401,
            detail="Student not found"
        )

    return student