from pydantic import BaseModel, EmailStr, Field
from typing import Optional


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


class StudentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    university_id: str = Field(min_length=1, max_length=50)
    email: EmailStr
    password: str = Field(min_length=6, max_length=100)
    program: str

    profile_picture: Optional[str] = None
    bio: Optional[str] = Field(default=None, max_length=1000)
    github: Optional[str] = None
    linkedin: Optional[str] = None
    whatsapp: Optional[str] = None
    skills: Optional[str] = Field(default=None, max_length=1000)
    interests: Optional[str] = Field(default=None, max_length=1000)
    fyp_status: Optional[str] = None


class TeamCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    project_title: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)

    department_preference: str

    spots_available: int = Field(
        ge=0,
        le=20
    )

    skills_needed: Optional[str] = Field(default=None, max_length=1000)
    roles_needed: Optional[str] = Field(default=None, max_length=1000)
    contact: Optional[str] = Field(default=None, max_length=200)


class StudentLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=100)


class StudentUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    program: str

    profile_picture: Optional[str] = None
    bio: Optional[str] = Field(default=None, max_length=1000)
    github: Optional[str] = None
    linkedin: Optional[str] = None
    whatsapp: Optional[str] = None
    skills: Optional[str] = Field(default=None, max_length=1000)
    interests: Optional[str] = Field(default=None, max_length=1000)
    fyp_status: Optional[str] = None

class TeamUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    project_title: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    department_preference: str
    spots_available: int = Field(ge=0, le=20)
    skills_needed: Optional[str] = Field(default=None, max_length=1000)
    roles_needed: Optional[str] = Field(default=None, max_length=1000)
    contact: Optional[str] = Field(default=None, max_length=200)