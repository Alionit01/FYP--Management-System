import os

from fastapi import FastAPI, HTTPException
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base
from . import models, database
from .schemas import StudentCreate, TeamCreate, StudentLogin
from .auth import hash_password, verify_password, create_access_token


app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Create database tables
Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    return {"message": "FYP Finder API is running!"}


@app.get("/db-test")
def db_test():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        return {"database": result.scalar() == 1}


# =========================
# AUTHENTICATION
# =========================

@app.post("/students")
def create_student(student: StudentCreate):

    university_domain = os.getenv("UNIVERSITY_EMAIL_DOMAIN")

    if not university_domain:
        raise HTTPException(
            status_code=500,
            detail="University email domain is not configured"
        )

    if not student.email.lower().endswith(
        "@" + university_domain.lower()
    ):
        raise HTTPException(
            status_code=403,
            detail="University email required"
        )

    db = database.SessionLocal()

    existing_student = db.query(models.Student).filter(
        (models.Student.email == student.email) |
        (models.Student.university_id == student.university_id)
    ).first()

    if existing_student:
        db.close()
        raise HTTPException(
            status_code=400,
            detail="Email or university ID already registered"
        )

    new_student = models.Student(
        name=student.name,
        university_id=student.university_id,
        email=student.email,
        password=hash_password(student.password),
        program=student.program,
        profile_picture=student.profile_picture,
        bio=student.bio,
        github=student.github,
        linkedin=student.linkedin,
        whatsapp=student.whatsapp,
        skills=student.skills,
        interests=student.interests,
        fyp_status=student.fyp_status
    )

    db.add(new_student)
    db.commit()
    db.refresh(new_student)

    student_id = new_student.id

    db.close()

    return {
        "message": "Student created successfully",
        "student_id": student_id
    }


@app.post("/login")
def login(student: StudentLogin):

    db = database.SessionLocal()

    user = db.query(models.Student).filter(
        models.Student.email == student.email
    ).first()

    if not user:
        db.close()
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not verify_password(student.password, user.password):
        db.close()
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    token = create_access_token(user.id)

    db.close()

    return {
        "access_token": token,
        "token_type": "bearer",
        "student_id": user.id
    }


# =========================
# STUDENTS
# =========================

@app.get("/students")
def get_students():

    db = database.SessionLocal()

    students = db.query(models.Student).all()

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


# =========================
# TEAMS
# =========================

@app.post("/teams")
def create_team(team: TeamCreate):

    db = database.SessionLocal()

    new_team = models.Team(
        name=team.name,
        project_title=team.project_title,
        description=team.description,
        department_preference=team.department_preference,
        spots_available=team.spots_available,
        skills_needed=team.skills_needed,
        roles_needed=team.roles_needed,
        contact=team.contact,
        created_by=team.created_by
    )

    db.add(new_team)
    db.commit()
    db.refresh(new_team)

    team_id = new_team.id

    db.close()

    return {
        "message": "Team created successfully",
        "team_id": team_id
    }


@app.get("/teams")
def get_teams():

    db = database.SessionLocal()

    teams = db.query(models.Team).all()

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
            "contact": team.contact,
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
    creator = db.query(models.Student).filter(
        models.Student.id == team.created_by
    ).first()

    # For now, the creator is the only team member
    members = []

    if creator:
        members.append({
            "id": creator.id,
            "name": creator.name,
            "program": creator.program,
            "university_id": creator.university_id,
            "profile_picture": creator.profile_picture
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
        "members": members
    }

    db.close()

    return result