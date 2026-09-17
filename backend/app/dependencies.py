from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session
import os

from .database import SessionLocal
from . import models

security = HTTPBearer()

ALGORITHM = "HS256"
SECRET_KEY = os.getenv("SECRET_KEY")


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

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token"
        )

    db: Session = SessionLocal()

    student = db.query(models.Student).filter(
        models.Student.id == int(student_id)
    ).first()

    db.close()

    if not student:
        raise HTTPException(
            status_code=401,
            detail="Student not found"
        )

    return student