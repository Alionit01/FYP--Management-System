from pydantic import BaseModel, EmailStr
from typing import Optional


class StudentCreate(BaseModel):
    name: str
    university_id: str
    email: EmailStr
    password: str
    program: str
    profile_picture: Optional[str] = None
    bio: Optional[str] = None
    github: Optional[str] = None
    linkedin: Optional[str] = None
    whatsapp: Optional[str] = None
    skills: Optional[str] = None
    interests: Optional[str] = None
    fyp_status: Optional[str] = None

class TeamCreate(BaseModel):
    name: str
    project_title: Optional[str] = None
    description: Optional[str] = None
    department_preference: str
    spots_available: int
    skills_needed: Optional[str] = None
    roles_needed: Optional[str] = None
    contact: Optional[str] = None
    created_by: int

class StudentLogin(BaseModel):
    email: EmailStr
    password: str
