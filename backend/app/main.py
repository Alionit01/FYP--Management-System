import hashlib
import os
import secrets
import time
from collections import deque
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, text
from sqlalchemy.exc import IntegrityError
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy.orm import Session

from .database import SessionLocal
from . import schemas

from .database import engine, Base
from . import models, database
from .schemas import (
    StudentCreate,
    TeamCreate,
    StudentLogin,
    VerificationRequest,
    StudentUpdate,
    TeamUpdate,
    PasswordResetRequest,
    PasswordReset,
    MAX_TEAM_MEMBERS
)
from .auth import hash_password, verify_password, create_access_token
from .email import send_verification_email, send_password_reset_email
from fastapi import FastAPI, HTTPException, Depends, Request
from .dependencies import get_current_student

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://fypms-psi.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROGRAMS = {
    "BSCS",
    "BSAI",
    "BSCB",
    "BSSE",
    "BESE",
}

FYP_STATUSES = {
    "Looking for a team",
    "Already in a team",
}

TEAM_DEPARTMENT_OPTIONS = PROGRAMS | {"Any"}


# Create database tables
Base.metadata.create_all(bind=engine)

# Lightweight column migrations for existing databases.
# New users are created with email_verified=False explicitly; existing
# rows are grandfathered in as verified so they are not locked out.
try:
    with engine.begin() as conn:
        conn.execute(text(
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS "
            "email_verified BOOLEAN NOT NULL DEFAULT FALSE"
        ))
        conn.execute(text(
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS "
            "verification_token VARCHAR"
        ))
        conn.execute(text(
            "UPDATE students SET email_verified = TRUE "
            "WHERE verification_token IS NULL"
        ))
        conn.execute(text(
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS "
            "profile_completed BOOLEAN NOT NULL DEFAULT TRUE"
        ))
except Exception:
    pass


@app.get("/")
def root():
    return {"message": "FYP Finder API is running!"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault(
        "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
    )
    return response


# =========================
# AUTHENTICATION
# =========================

VERIFICATION_TTL = timedelta(hours=1)


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


@app.post("/students", status_code=202)
def create_student(student: StudentCreate):
    university_domain = os.getenv("UNIVERSITY_EMAIL_DOMAIN")
    if not university_domain:
        raise HTTPException(status_code=500, detail="University email domain is not configured")

    email = student.email.lower()
    if not email.endswith("@" + university_domain.lower()):
        raise HTTPException(status_code=403, detail="University email required")

    # The university email local part is the authoritative university ID.
    if student.university_id.strip().lower() != email.rsplit("@", 1)[0]:
        raise HTTPException(
            status_code=400, detail="University ID must match your email address"
        )
    if student.program not in PROGRAMS:
        raise HTTPException(status_code=400, detail="Invalid program")
    if student.fyp_status and student.fyp_status not in FYP_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid FYP status")

    db = database.SessionLocal()
    token = secrets.token_urlsafe(32)
    try:
        db.query(models.PendingRegistration).filter(
            models.PendingRegistration.expires_at <= datetime.now(timezone.utc)
        ).delete()
        if db.query(models.Student).filter(
            models.Student.email_verified.is_(True),
            (models.Student.email == email) |
            (func.lower(models.Student.university_id) == student.university_id.strip().lower())
        ).first():
            raise HTTPException(status_code=400, detail="Email or university ID already registered")

        data = student.model_dump()
        data["email"] = email
        data["university_id"] = student.university_id.strip().upper()
        pending = models.PendingRegistration(
            token_hash=_token_hash(token),
            expires_at=datetime.now(timezone.utc) + VERIFICATION_TTL,
            student_data=data,
        )
        db.add(pending)
        db.commit()

        try:
            send_verification_email(email, token)
        except Exception:
            # SMTP libraries raise several types of errors. Do not expose
            # the message or token in a response or log.
            db.delete(pending)
            db.commit()
            raise HTTPException(status_code=503, detail="Could not send verification email") from None

        return {"message": "Check your university email for a verification link."}
    finally:
        db.close()


@app.post("/verify-email")
def verify_email(request: VerificationRequest):
    token = request.token
    db = database.SessionLocal()
    try:
        pending = db.query(models.PendingRegistration).filter(
            models.PendingRegistration.token_hash == _token_hash(token)
        ).with_for_update().first()
        if not pending:
            raise HTTPException(status_code=400, detail="Invalid or expired verification token")

        expires_at = pending.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) >= expires_at:
            db.delete(pending)
            db.commit()
            raise HTTPException(status_code=400, detail="Invalid or expired verification token")

        data = dict(pending.student_data)
        data["password"] = hash_password(request.password)
        existing = db.query(models.Student).filter(
            (models.Student.email == data["email"]) |
            (func.lower(models.Student.university_id) == data["university_id"].lower())
        ).with_for_update().all()
        if any(student.email_verified for student in existing):
            raise HTTPException(status_code=409, detail="Email or university ID already registered")
        if len(existing) > 1:
            # Conflicting legacy, unverified records require manual review;
            # never overwrite or discard multiple accounts automatically.
            raise HTTPException(status_code=409, detail="Conflicting unverified accounts; contact support")

        if existing:
            # Allow the verified mailbox owner to reclaim a legacy unverified
            # row that was previously reserving this identity.
            for field, value in data.items():
                setattr(existing[0], field, value)
            existing[0].email_verified = True
            existing[0].verification_token = None
        else:
            db.add(models.Student(**data, email_verified=True))
        db.delete(pending)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=409, detail="Email or university ID already registered")

        return {"message": "Email verified successfully"}
    finally:
        db.close()


_LOGIN_ATTEMPTS: dict = {}
LOGIN_MAX_ATTEMPTS = 5
LOGIN_WINDOW_SECONDS = 60
_MAX_TRACKED_IPS = 10000


def _client_ip(request: Request) -> str:
    # Trust X-Forwarded-For only because the app is deployed behind a
    # proxy; use the first (client) hop.
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _record_login_failure(request: Request) -> None:
    ip = _client_ip(request)
    now = time.monotonic()
    attempts = _LOGIN_ATTEMPTS.setdefault(ip, deque())
    while attempts and now - attempts[0] > LOGIN_WINDOW_SECONDS:
        attempts.popleft()
    attempts.append(now)
    # Bound memory usage
    if len(_LOGIN_ATTEMPTS) > _MAX_TRACKED_IPS:
        for key in [k for k, v in _LOGIN_ATTEMPTS.items() if not v]:
            del _LOGIN_ATTEMPTS[key]


def _check_login_rate_limit(request: Request) -> None:
    ip = _client_ip(request)
    now = time.monotonic()
    attempts = _LOGIN_ATTEMPTS.get(ip)
    if not attempts:
        return
    while attempts and now - attempts[0] > LOGIN_WINDOW_SECONDS:
        attempts.popleft()
    if len(attempts) >= LOGIN_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail="Too many login attempts. Please try again later."
        )


@app.post("/login")
def login(student: StudentLogin, request: Request):

    _check_login_rate_limit(request)

    db = database.SessionLocal()

    try:
        user = db.query(models.Student).filter(
            models.Student.email == student.email.lower()
        ).first()

        if not user or not verify_password(
            student.password, user.password
        ):
            _record_login_failure(request)
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        if not user.email_verified:
            raise HTTPException(
                status_code=403,
                detail="Please verify your email before logging in"
            )

        token = create_access_token(user.id)

        return {
            "access_token": token,
            "token_type": "bearer",
            "student_id": user.id
        }
    finally:
        db.close()


@app.post("/forgot-password")
def forgot_password(request: schemas.PasswordResetRequest):
    db = database.SessionLocal()

    try:
        student = db.query(models.Student).filter(
            models.Student.email == request.email.lower(),
            models.Student.email_verified.is_(True),
        ).first()

        if student:
            # Invalidate any previous reset links for this account.
            db.query(models.PasswordResetToken).filter(
                models.PasswordResetToken.student_id == student.id
            ).delete()

            token = secrets.token_urlsafe(32)
            db.add(models.PasswordResetToken(
                token_hash=_token_hash(token),
                student_id=student.id,
                expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            ))
            db.commit()

            try:
                send_password_reset_email(student.email, token)
            except Exception:
                db.query(models.PasswordResetToken).filter(
                    models.PasswordResetToken.student_id == student.id
                ).delete()
                db.commit()
                raise HTTPException(
                    status_code=503,
                    detail="Could not send password reset email",
                ) from None
    finally:
        db.close()

    # Always return the same generic message so account existence is not
    # revealed.
    return {
        "message": "If that email is registered, a password reset link has been sent."
    }


@app.post("/reset-password")
def reset_password(request: schemas.PasswordReset):
    db = database.SessionLocal()

    try:
        row = db.query(models.PasswordResetToken).filter(
            models.PasswordResetToken.token_hash == _token_hash(request.token)
        ).first()

        if not row:
            raise HTTPException(
                status_code=400, detail="Invalid or expired reset link"
            )

        expires_at = row.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if datetime.now(timezone.utc) >= expires_at:
            db.delete(row)
            db.commit()
            raise HTTPException(
                status_code=400, detail="Invalid or expired reset link"
            )

        student = db.query(models.Student).filter(
            models.Student.id == row.student_id
        ).first()

        if not student:
            raise HTTPException(
                status_code=400, detail="Invalid or expired reset link"
            )

        student.password = hash_password(request.password)
        db.delete(row)
        db.commit()

        return {"message": "Password updated. You can now sign in."}
    finally:
        db.close()


# =========================
# STUDENTS
# =========================

def _clamp_spots_available(db, team) -> None:
    """Keep spots_available consistent with the actual member count."""
    db.flush()  # ensure pending add/delete of memberships is counted
    member_count = db.query(models.TeamMember).filter(
        models.TeamMember.team_id == team.id
    ).count()
    team.spots_available = max(
        0,
        min(team.spots_available, MAX_TEAM_MEMBERS - member_count)
    )


@app.get("/students")
def get_students(skip: int = 0, limit: int = 50):

    limit = min(max(limit, 1), 100)
    skip = max(skip, 0)

    db = database.SessionLocal()

    students = db.query(models.Student).offset(skip).limit(limit).all()

    result = []

    for student in students:
        result.append({
            "id": student.id,
            "name": student.name,
            "university_id": student.university_id,
            "program": student.program,
            "profile_picture": student.profile_picture,
            "bio": student.bio,
            "github": student.github,
            "linkedin": student.linkedin,
            "skills": student.skills,
            "interests": student.interests,
            "fyp_status": student.fyp_status
        })

    db.close()

    return result


@app.get("/students/{student_id}")
def get_student(student_id: int):

    db = database.SessionLocal()

    student = db.query(models.Student).filter(
        models.Student.id == student_id
    ).first()

    db.close()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    return {
        "id": student.id,
        "name": student.name,
        "university_id": student.university_id,
        "program": student.program,
        "profile_picture": student.profile_picture,
        "bio": student.bio,
        "github": student.github,
        "linkedin": student.linkedin,
        "skills": student.skills,
        "interests": student.interests,
        "fyp_status": student.fyp_status
    }

@app.get("/students/{student_id}/contact")
def get_student_contact(
    student_id: int,
    current_student=Depends(get_current_student)
):

    db = database.SessionLocal()

    student = db.query(models.Student).filter(
        models.Student.id == student_id
    ).first()

    db.close()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    return {
        "email": student.email,
        "whatsapp": student.whatsapp
    }

@app.put("/my-profile")
def update_my_profile(
    student_data: StudentUpdate,
    current_student=Depends(get_current_student)
):
    db = database.SessionLocal()

    try:
        student = db.query(models.Student).filter(
            models.Student.id == current_student.id
        ).first()

        if not student:
            raise HTTPException(
                status_code=404,
                detail="Student not found"
            )

        if student_data.program not in PROGRAMS:
            raise HTTPException(
                status_code=400,
                detail="Invalid program"
            )

        if (
                student_data.fyp_status
                and student_data.fyp_status not in FYP_STATUSES
        ):
            raise HTTPException(
                status_code=400,
                detail="Invalid FYP status"
            )

        student.name = student_data.name
        student.program = student_data.program
        student.profile_picture = student_data.profile_picture
        student.bio = student_data.bio
        student.github = student_data.github
        student.linkedin = student_data.linkedin
        student.whatsapp = student_data.whatsapp
        student.skills = student_data.skills
        student.interests = student_data.interests
        student.fyp_status = student_data.fyp_status

        # One-way: flip to TRUE once the required fields are present.
        # Never downgrade so grandfathered users are not locked out.
        if (
            not student.profile_completed
            and student.skills
            and student.skills.strip()
            and student.fyp_status
        ):
            student.profile_completed = True

        db.commit()

        profile = {
            "id": student.id,
            "name": student.name,
            "university_id": student.university_id,
            "email": student.email,
            "program": student.program,
            "profile_picture": student.profile_picture,
            "bio": student.bio,
            "github": student.github,
            "linkedin": student.linkedin,
            "whatsapp": student.whatsapp,
            "skills": student.skills,
            "interests": student.interests,
            "fyp_status": student.fyp_status,
            "profile_completed": student.profile_completed
        }

        return {
            "message": "Profile updated successfully",
            "profile": profile
        }
    finally:
        db.close()

@app.get("/my-profile")
def get_my_profile(
    current_student=Depends(get_current_student)
):
    return {
        "id": current_student.id,
        "name": current_student.name,
        "university_id": current_student.university_id,
        "email": current_student.email,
        "program": current_student.program,
        "profile_picture": current_student.profile_picture,
        "bio": current_student.bio,
        "github": current_student.github,
        "linkedin": current_student.linkedin,
        "whatsapp": current_student.whatsapp,
        "skills": current_student.skills,
        "interests": current_student.interests,
        "fyp_status": current_student.fyp_status,
        "profile_completed": current_student.profile_completed
    }



# =========================
# TEAMS
# =========================

@app.post("/teams")
def create_team(
    team: TeamCreate,
    current_student=Depends(get_current_student)
):
    db = database.SessionLocal()

    try:
        if not current_student.profile_completed:
            raise HTTPException(
                status_code=403,
                detail="Complete your profile before creating a team"
            )

        # Student can only belong to one team
        existing_membership = db.query(models.TeamMember).filter(
            models.TeamMember.student_id == current_student.id
        ).first()

        if existing_membership:
            raise HTTPException(
                status_code=400,
                detail="You are already in a team"
            )

        # Validate department before creating anything
        if team.department_preference not in TEAM_DEPARTMENT_OPTIONS:
            raise HTTPException(
                status_code=400,
                detail="Invalid department preference"
            )

        # Validate spots (team total can never exceed MAX_TEAM_MEMBERS)
        if team.spots_available < 0:
            raise HTTPException(
                status_code=400,
                detail="Available spots cannot be negative"
            )
        if team.spots_available > MAX_TEAM_MEMBERS - 1:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"A team can have at most {MAX_TEAM_MEMBERS} members "
                    f"including the owner, so spots available cannot "
                    f"exceed {MAX_TEAM_MEMBERS - 1}."
                )
            )

        # Create team
        new_team = models.Team(
            name=team.name,
            project_title=team.project_title,
            description=team.description,
            department_preference=team.department_preference,
            spots_available=team.spots_available,
            skills_needed=team.skills_needed,
            roles_needed=team.roles_needed,
            contact=team.contact,
            created_by=current_student.id
        )

        db.add(new_team)
        db.flush()

        # Add creator as first member
        creator_member = models.TeamMember(
            team_id=new_team.id,
            student_id=current_student.id
        )

        db.add(creator_member)

        # Commit everything together
        db.commit()
        db.refresh(new_team)

        return {
            "message": "Team created successfully",
            "team_id": new_team.id
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not create team"
        )

    finally:
        db.close()

@app.put("/teams/{team_id}")
def update_team(
    team_id: int,
    team_data: schemas.TeamUpdate,
    current_student: models.Student = Depends(
        get_current_student
    )
):
    db: Session = SessionLocal()

    try:
        team = db.query(models.Team).filter(
            models.Team.id == team_id
        ).with_for_update().first()

        if not team:
            raise HTTPException(
                status_code=404,
                detail="Team not found"
            )

        if team.created_by != current_student.id:
            raise HTTPException(
                status_code=403,
                detail="Only the team owner can edit the team"
            )

        valid_departments = {
            "BSCS",
            "BSAI",
            "BSCB",
            "BSSE",
            "BESE",
            "Any",
        }

        if team_data.department_preference not in valid_departments:
            raise HTTPException(
                status_code=400,
                detail="Invalid department preference"
            )

        team.name = team_data.name
        team.project_title = team_data.project_title
        team.description = team_data.description
        team.department_preference = team_data.department_preference
        if team_data.spots_available > MAX_TEAM_MEMBERS - 1:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"A team can have at most {MAX_TEAM_MEMBERS} members "
                    f"including the owner, so spots available cannot "
                    f"exceed {MAX_TEAM_MEMBERS - 1}."
                )
            )
        team.spots_available = team_data.spots_available
        _clamp_spots_available(db, team)
        team.skills_needed = team_data.skills_needed
        team.roles_needed = team_data.roles_needed
        team.contact = team_data.contact

        db.commit()
        db.refresh(team)

        return {
            "message": "Team updated successfully",
            "team": {
                "id": team.id,
                "name": team.name,
                "project_title": team.project_title,
                "description": team.description,
                "department_preference": team.department_preference,
                "spots_available": team.spots_available,
                "skills_needed": team.skills_needed,
                "roles_needed": team.roles_needed,
                "contact": team.contact,
                "created_by": team.created_by,
            }
        }

    finally:
        db.close()

@app.delete("/teams/{team_id}")
def delete_team(
    team_id: int,
    current_student: models.Student = Depends(
        get_current_student
    )
):
    db: Session = SessionLocal()

    try:
        team = db.query(models.Team).filter(
            models.Team.id == team_id
        ).with_for_update().first()

        if not team:
            raise HTTPException(
                status_code=404,
                detail="Team not found"
            )

        # Only the team owner can delete the team
        if team.created_by != current_student.id:
            raise HTTPException(
                status_code=403,
                detail="Only the team owner can delete the team"
            )

        # Remove dependent records explicitly instead of relying on DB cascades.
        db.query(models.TeamInvitation).filter(
            models.TeamInvitation.team_id == team_id
        ).delete()
        db.query(models.TeamMember).filter(
            models.TeamMember.team_id == team_id
        ).delete()

        db.delete(team)
        db.commit()

        return {
            "message": "Team deleted successfully"
        }

    finally:
        db.close()


@app.delete("/teams/{team_id}/members/me")
def leave_team(
    team_id: int,
    current_student: models.Student = Depends(
        get_current_student
    )
):
    db: Session = SessionLocal()

    try:
        membership = db.query(models.TeamMember).filter(
            models.TeamMember.team_id == team_id,
            models.TeamMember.student_id == current_student.id
        ).first()

        if not membership:
            raise HTTPException(
                status_code=404,
                detail="You are not a member of this team"
            )

        team = db.query(models.Team).filter(
            models.Team.id == team_id
        ).with_for_update().first()

        if not team:
            raise HTTPException(
                status_code=404,
                detail="Team not found"
            )

        if team.created_by == current_student.id:
            # Owner leaving: hand leadership to the next member,
            # or dissolve the team if nobody else remains.
            db.delete(membership)
            db.flush()

            next_membership = db.query(models.TeamMember).filter(
                models.TeamMember.team_id == team_id
            ).order_by(models.TeamMember.id).first()

            if next_membership is None:
                db.query(models.TeamInvitation).filter(
                    models.TeamInvitation.team_id == team_id
                ).delete()
                db.delete(team)
                db.commit()
                return {
                    "message": "You left the team and it was removed"
                }

            db.query(models.TeamInvitation).filter(
                models.TeamInvitation.team_id == team_id
            ).delete()
            team.created_by = next_membership.student_id
            team.spots_available += 1
            _clamp_spots_available(db, team)
            db.commit()

            return {
                "message": "You left the team; leadership was transferred"
            }

        db.delete(membership)
        team.spots_available += 1
        _clamp_spots_available(db, team)

        db.commit()

        return {
            "message": "You left the team successfully"
        }

    finally:
        db.close()

@app.get("/teams")
def get_teams(skip: int = 0, limit: int = 50):

    limit = min(max(limit, 1), 100)
    skip = max(skip, 0)

    db = database.SessionLocal()

    teams = db.query(models.Team).offset(skip).limit(limit).all()

    result = []

    for team in teams:
        result.append({
            "id": team.id,
            "name": team.name,
            "project_title": team.project_title,
            "description": team.description,
            "department_preference": team.department_preference,
            "spots_available": team.spots_available,
            "skills_needed": team.skills_needed,
            "roles_needed": team.roles_needed,
            "created_by": team.created_by
        })

    db.close()

    return result

@app.get("/teams/{team_id}")
def get_team(team_id: int):

    db = database.SessionLocal()

    team = db.query(models.Team).filter(
        models.Team.id == team_id
    ).first()

    if not team:
        db.close()
        raise HTTPException(
            status_code=404,
            detail="Team not found"
        )

    # Find the team creator
    members = (
        db.query(models.Student)
        .join(
            models.TeamMember,
            models.TeamMember.student_id == models.Student.id
        )
        .filter(
            models.TeamMember.team_id == team.id
        )
        .all()
    )

    member_list = []

    for student in members:
        member_list.append({
            "id": student.id,
            "name": student.name,
            "program": student.program,
            "university_id": student.university_id,
            "profile_picture": student.profile_picture
        })

    result = {
        "id": team.id,
        "name": team.name,
        "project_title": team.project_title,
        "description": team.description,
        "department_preference": team.department_preference,
        "spots_available": team.spots_available,
        "skills_needed": team.skills_needed,
        "roles_needed": team.roles_needed,
        "created_by": team.created_by,
        "members": member_list
    }

    db.close()

    return result

@app.get("/teams/{team_id}/members")
def get_team_members(team_id: int):

    db = database.SessionLocal()

    team = db.query(models.Team).filter(
        models.Team.id == team_id
    ).first()

    if not team:
        db.close()
        raise HTTPException(
            status_code=404,
            detail="Team not found"
        )

    members = (
        db.query(models.Student)
        .join(
            models.TeamMember,
            models.TeamMember.student_id == models.Student.id
        )
        .filter(
            models.TeamMember.team_id == team_id
        )
        .all()
    )

    result = []

    for student in members:
        result.append({
            "id": student.id,
            "name": student.name,
            "university_id": student.university_id,
            "program": student.program,
            "profile_picture": student.profile_picture
        })

    db.close()

    return result

@app.get("/my-team")
def get_my_team(
    current_student=Depends(get_current_student)
):
    db = database.SessionLocal()

    membership = db.query(models.TeamMember).filter(
        models.TeamMember.student_id == current_student.id
    ).first()

    if not membership:
        db.close()
        return None

    team = db.query(models.Team).filter(
        models.Team.id == membership.team_id
    ).first()

    if not team:
        db.close()
        return None

    members = (
        db.query(models.Student)
        .join(
            models.TeamMember,
            models.TeamMember.student_id == models.Student.id
        )
        .filter(
            models.TeamMember.team_id == team.id
        )
        .all()
    )

    member_list = []

    for student in members:
        member_list.append({
            "id": student.id,
            "name": student.name,
            "university_id": student.university_id,
            "program": student.program,
            "profile_picture": student.profile_picture
        })

    result = {
        "id": team.id,
        "name": team.name,
        "project_title": team.project_title,
        "description": team.description,
        "department_preference": team.department_preference,
        "spots_available": team.spots_available,
        "skills_needed": team.skills_needed,
        "roles_needed": team.roles_needed,
        "contact": team.contact,
        "created_by": team.created_by,
        "members": member_list
    }

    db.close()

    return result

@app.get("/teams/{team_id}/contact")
def get_team_contact(
    team_id: int,
    current_student=Depends(get_current_student)
):
    db = database.SessionLocal()

    team = db.query(models.Team).filter(
        models.Team.id == team_id
    ).first()

    db.close()

    if not team:
        raise HTTPException(
            status_code=404,
            detail="Team not found"
        )

    return {
        "contact": team.contact
    }

@app.post("/teams/{team_id}/invitations/{student_id}")
def invite_team_member(
    team_id: int,
    student_id: int,
    current_student: models.Student = Depends(get_current_student)
):
    db = database.SessionLocal()
    try:
        team = db.query(models.Team).filter(
            models.Team.id == team_id
        ).with_for_update().first()
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
        if team.created_by != current_student.id:
            raise HTTPException(status_code=403, detail="Only the team owner can invite members")

        student = db.query(models.Student).filter(
            models.Student.id == student_id,
            models.Student.email_verified.is_(True)
        ).first()
        if not student:
            raise HTTPException(status_code=404, detail="Verified student not found")
        if db.query(models.TeamMember).filter(
            models.TeamMember.student_id == student_id
        ).first():
            raise HTTPException(status_code=400, detail="Student is already in a team")
        if team.spots_available <= 0 or db.query(models.TeamMember).filter(
            models.TeamMember.team_id == team_id
        ).count() >= MAX_TEAM_MEMBERS:
            raise HTTPException(status_code=400, detail="This team has no available spots")

        db.add(models.TeamInvitation(
            team_id=team_id, student_id=student_id, invited_by=current_student.id
        ))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=409, detail="Invitation already pending")
        return {"message": "Invitation sent; the student must accept to join"}
    finally:
        db.close()


@app.get("/my-invitations")
def get_my_invitations(current_student: models.Student = Depends(get_current_student)):
    db = database.SessionLocal()
    try:
        rows = db.query(models.TeamInvitation, models.Team).join(
            models.Team, models.Team.id == models.TeamInvitation.team_id
        ).filter(models.TeamInvitation.student_id == current_student.id).all()
        return [
            {"id": invitation.id, "team_id": team.id, "team_name": team.name}
            for invitation, team in rows
            if invitation.invited_by == team.created_by
        ]
    finally:
        db.close()


@app.post("/invitations/{invitation_id}/accept")
def accept_invitation(
    invitation_id: int,
    current_student: models.Student = Depends(get_current_student)
):
    db = database.SessionLocal()
    try:
        # Lock the team before the invitation so member-count and spot updates
        # are serialized with other team mutations.
        invitation_team = db.query(models.TeamInvitation.team_id).filter(
            models.TeamInvitation.id == invitation_id,
            models.TeamInvitation.student_id == current_student.id
        ).first()
        if not invitation_team:
            raise HTTPException(status_code=404, detail="Invitation not found")
        team = db.query(models.Team).filter(
            models.Team.id == invitation_team.team_id
        ).with_for_update().first()
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
        invitation = db.query(models.TeamInvitation).filter(
            models.TeamInvitation.id == invitation_id,
            models.TeamInvitation.student_id == current_student.id
        ).with_for_update().first()
        if not invitation or invitation.team_id != team.id:
            raise HTTPException(status_code=404, detail="Invitation not found")
        if invitation.invited_by != team.created_by:
            raise HTTPException(status_code=409, detail="Invitation is no longer valid")
        if db.query(models.TeamMember).filter(
            models.TeamMember.student_id == current_student.id
        ).first():
            raise HTTPException(status_code=409, detail="You are already in a team")
        if team.spots_available <= 0 or db.query(models.TeamMember).filter(
            models.TeamMember.team_id == team.id
        ).count() >= MAX_TEAM_MEMBERS:
            raise HTTPException(status_code=409, detail="This team has no available spots")

        db.add(models.TeamMember(team_id=team.id, student_id=current_student.id))
        db.delete(invitation)
        team.spots_available -= 1
        _clamp_spots_available(db, team)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=409, detail="Could not join the team")
        return {"message": "You joined the team"}
    finally:
        db.close()


@app.delete("/invitations/{invitation_id}")
def decline_invitation(
    invitation_id: int,
    current_student: models.Student = Depends(get_current_student)
):
    db = database.SessionLocal()
    try:
        invitation = db.query(models.TeamInvitation).filter(
            models.TeamInvitation.id == invitation_id,
            models.TeamInvitation.student_id == current_student.id
        ).first()
        if not invitation:
            raise HTTPException(status_code=404, detail="Invitation not found")
        db.delete(invitation)
        db.commit()
        return {"message": "Invitation declined"}
    finally:
        db.close()

@app.delete("/teams/{team_id}/members/{student_id}")
def remove_team_member(
    team_id: int,
    student_id: int,
    current_student: models.Student = Depends(get_current_student)
):
    db = database.SessionLocal()

    team = db.query(models.Team).filter(
        models.Team.id == team_id
    ).with_for_update().first()

    if not team:
        db.close()
        raise HTTPException(status_code=404, detail="Team not found")

    # Only the team owner can remove members
    if team.created_by != current_student.id:
        db.close()
        raise HTTPException(
            status_code=403,
            detail="Only the team owner can remove members"
        )

    # Owner cannot remove themselves
    if student_id == team.created_by:
        db.close()
        raise HTTPException(
            status_code=400,
            detail="Team owner cannot be removed"
        )

    membership = db.query(models.TeamMember).filter(
        models.TeamMember.team_id == team_id,
        models.TeamMember.student_id == student_id
    ).first()

    if not membership:
        db.close()
        raise HTTPException(
            status_code=404,
            detail="Student is not a member of this team"
        )

    db.delete(membership)

    # One spot becomes available again
    team.spots_available += 1
    _clamp_spots_available(db, team)

    db.commit()
    db.close()

    return {
        "message": "Student removed from team",
        "spots_available": team.spots_available
    }