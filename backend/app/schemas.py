from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional


def _validate_url(value: Optional[str]) -> Optional[str]:
    if value is None or value == "":
        return value
    lowered = value.strip().lower()
    if not (lowered.startswith("https://") or lowered.startswith("http://")):
        raise ValueError(
            "URL must start with http:// or https://"
        )
    return value




MAX_TEAM_MEMBERS = 4
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
    password: str = Field(min_length=6, max_length=72)
    program: str

    profile_picture: Optional[str] = None
    bio: Optional[str] = Field(default=None, max_length=1000)
    github: Optional[str] = None
    linkedin: Optional[str] = None
    whatsapp: Optional[str] = None
    skills: Optional[str] = Field(default=None, max_length=1000)
    interests: Optional[str] = Field(default=None, max_length=1000)
    fyp_status: Optional[str] = None


    @field_validator("password")
    @classmethod
    def _check_password_bytes(cls, v):
        # bcrypt operates on bytes; 72 chars may exceed 72 bytes
        if len(v.encode("utf-8")) > 72:
            raise ValueError(
                "Password must be at most 72 bytes (UTF-8)"
            )
        return v

    @field_validator("github", "linkedin", "profile_picture")
    @classmethod
    def _check_urls(cls, v):
        return _validate_url(v)


class TeamCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    project_title: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)

    department_preference: str

    spots_available: int = Field(
        ge=0,
        le=MAX_TEAM_MEMBERS - 1
    )

    skills_needed: Optional[str] = Field(default=None, max_length=1000)
    roles_needed: Optional[str] = Field(default=None, max_length=1000)
    contact: Optional[str] = Field(default=None, max_length=200)


class StudentLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)

    @field_validator("password")
    @classmethod
    def _check_password_bytes(cls, v):
        if len(v.encode("utf-8")) > 72:
            raise ValueError(
                "Password must be at most 72 bytes (UTF-8)"
            )
        return v


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


    @field_validator("github", "linkedin", "profile_picture")
    @classmethod
    def _check_urls(cls, v):
        return _validate_url(v)

class TeamUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    project_title: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    department_preference: str
    spots_available: int = Field(ge=0, le=MAX_TEAM_MEMBERS - 1)
    skills_needed: Optional[str] = Field(default=None, max_length=1000)
    roles_needed: Optional[str] = Field(default=None, max_length=1000)
    contact: Optional[str] = Field(default=None, max_length=200)