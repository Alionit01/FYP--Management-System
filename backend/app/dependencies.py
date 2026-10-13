from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
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

    except jwt.PyJWTError:
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


def get_current_admin(
    current_student=Depends(get_current_student),
):
    """Require the current token holder to be an administrator.

    The role is read from the database on every request (not from the
    JWT), so granting or revoking 'admin' takes effect immediately
    without reissuing tokens. Students get 403; missing/invalid
    credentials are rejected earlier with 401 by get_current_student.
    """
    if current_student.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Administrator access required"
        )

    return current_student