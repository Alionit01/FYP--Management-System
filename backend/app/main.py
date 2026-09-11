from fastapi import FastAPI
from sqlalchemy import text
from .schemas import StudentCreate
from .database import engine, Base
from . import models, database
app = FastAPI()

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