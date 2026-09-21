from sqlalchemy import Column, Integer, String, Text, UniqueConstraint
from .database import Base


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    university_id = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    program = Column(String, nullable=False)
    profile_picture = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    github = Column(String, nullable=True)
    linkedin = Column(String, nullable=True)
    whatsapp = Column(String, nullable=True)
    skills = Column(Text, nullable=True)
    interests = Column(Text, nullable=True)
    fyp_status = Column(String, nullable=True)

class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    project_title = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    department_preference = Column(String, nullable=False)
    spots_available = Column(Integer, nullable=False)
    skills_needed = Column(Text, nullable=True)
    roles_needed = Column(Text, nullable=True)
    contact = Column(String, nullable=True)
    created_by = Column(Integer, nullable=False)

class TeamMember(Base):
    __tablename__ = "team_members"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, nullable=False)
    student_id = Column(Integer, nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "team_id",
            "student_id",
            name="unique_team_student"
        ),
    )