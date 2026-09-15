from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from .schemas import StudentCreate, TeamCreate
from .database import engine, Base
from . import models, database
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

@app.post("/students")
def create_student(student: StudentCreate):
    db = database.SessionLocal()

    new_student = models.Student(
        name=student.name,
        university_id=student.university_id,
        email=student.email,
        password=student.password,
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
    db.close()

    return {
        "message": "Student created successfully",
        "student_id": new_student.id
    }

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
            "email": student.email,
            "program": student.program,
            "profile_picture": student.profile_picture,
            "bio": student.bio,
            "github": student.github,
            "linkedin": student.linkedin,
            "whatsapp": student.whatsapp,
            "skills": student.skills,
            "interests": student.interests,
            "fyp_status": student.fyp_status
        })

    db.close()

    return result

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
    db.close()

    return {
        "message": "Team created successfully",
        "team_id": new_team.id
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