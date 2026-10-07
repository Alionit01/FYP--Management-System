from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
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
    email_verified = Column(
        Boolean, nullable=False, default=False
    )
    verification_token = Column(String, nullable=True)

class PendingRegistration(Base):
    __tablename__ = "pending_registrations"

    id = Column(Integer, primary_key=True)
    token_hash = Column(String(64), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    student_data = Column(JSON, nullable=False)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True)
    token_hash = Column(String(64), unique=True, nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)


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
    created_by = Column(
        Integer,
        ForeignKey("students.id"),
        nullable=False
    )

class TeamInvitation(Base):
    __tablename__ = "team_invitations"

    id = Column(Integer, primary_key=True)
    team_id = Column(
        Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False
    )
    student_id = Column(
        Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    invited_by = Column(
        Integer, ForeignKey("students.id"), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("team_id", "student_id", name="unique_team_invitee"),
    )


class TeamMember(Base):
    __tablename__ = "team_members"

    id = Column(Integer, primary_key=True, index=True)

    team_id = Column(
        Integer,
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    student_id = Column(
        Integer,
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "team_id",
            "student_id",
            name="unique_team_student"
        ),
        UniqueConstraint(
            "student_id",
            name="unique_student_team"
        ),
    )