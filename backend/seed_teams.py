from app.database import SessionLocal
from app import models


teams = [
    {
        "name": "Smart Campus Assistant",
        "project_title": "AI Campus Assistant",
        "description": "An AI-powered assistant that helps students find university information, courses, rooms, events, and campus services.",
        "department_preference": "BSAI",
        "spots_available": 2,
        "skills_needed": "Python, Machine Learning, NLP, React",
        "roles_needed": "ML Developer, Frontend Developer",
        "contact": "test1001@iqra.edu.pk",
        "created_by": 1,
    },
    {
        "name": "SecureVault",
        "project_title": "Student Data Security System",
        "description": "A secure platform for storing and managing student documents with authentication and access control.",
        "department_preference": "BSCB",
        "spots_available": 2,
        "skills_needed": "Python, Cybersecurity, FastAPI, PostgreSQL",
        "roles_needed": "Backend Developer, Security Researcher",
        "contact": "test1006@iqra.edu.pk",
        "created_by": 6,
    },
    {
        "name": "EduConnect",
        "project_title": "Peer Learning Platform",
        "description": "A platform where university students can find study partners, share resources, and organize study sessions.",
        "department_preference": "Any",
        "spots_available": 3,
        "skills_needed": "React, JavaScript, UI/UX, Node.js",
        "roles_needed": "Frontend Developer, UI Designer, Backend Developer",
        "contact": "test1011@iqra.edu.pk",
        "created_by": 11,
    },
    {
        "name": "HealthTrack",
        "project_title": "Personal Health Monitoring App",
        "description": "A mobile application that allows users to track daily activities, habits, and personal health goals.",
        "department_preference": "BSCS",
        "spots_available": 2,
        "skills_needed": "Flutter, Firebase, UI/UX",
        "roles_needed": "Mobile Developer, UI/UX Designer",
        "contact": "test1002@iqra.edu.pk",
        "created_by": 2,
    },
    {
        "name": "VisionGuard",
        "project_title": "AI Image-Based Object Detection",
        "description": "A computer vision system capable of detecting and classifying objects from images and video.",
        "department_preference": "BSAI",
        "spots_available": 2,
        "skills_needed": "Python, OpenCV, Computer Vision, Deep Learning",
        "roles_needed": "Computer Vision Developer, ML Engineer",
        "contact": "test1012@iqra.edu.pk",
        "created_by": 12,
    },
    {
        "name": "DevFlow",
        "project_title": "Student Project Management System",
        "description": "A project management platform designed specifically for university students working on semester and FYP projects.",
        "department_preference": "BSSE",
        "spots_available": 3,
        "skills_needed": "React, FastAPI, PostgreSQL, Git",
        "roles_needed": "Full Stack Developer, Backend Developer, QA",
        "contact": "test1007@iqra.edu.pk",
        "created_by": 7,
    },
    {
        "name": "PhishShield",
        "project_title": "Phishing Detection System",
        "description": "A system that analyzes suspicious URLs and messages to help users identify potential phishing attacks.",
        "department_preference": "BSCB",
        "spots_available": 2,
        "skills_needed": "Python, Cybersecurity, Machine Learning",
        "roles_needed": "Security Developer, ML Developer",
        "contact": "test1017@iqra.edu.pk",
        "created_by": 17,
    },
    {
        "name": "AR Campus",
        "project_title": "Augmented Reality Campus Navigation",
        "description": "An augmented reality navigation application that helps students locate classrooms, offices, labs, and other university facilities.",
        "department_preference": "BESE",
        "spots_available": 3,
        "skills_needed": "Unity, C#, AR, Mobile Development",
        "roles_needed": "Unity Developer, Mobile Developer, 3D Designer",
        "contact": "test1019@iqra.edu.pk",
        "created_by": 19,
    },
]


def seed_teams():
    db = SessionLocal()

    try:
        for team_data in teams:
            existing_team = db.query(models.Team).filter(
                models.Team.name == team_data["name"]
            ).first()

            if existing_team:
                print(f"Skipping existing team: {team_data['name']}")
                continue

            creator = db.query(models.Student).filter(
                models.Student.id == team_data["created_by"]
            ).first()

            if not creator:
                print(
                    f"Skipping {team_data['name']} - "
                    f"student ID {team_data['created_by']} not found"
                )
                continue

            team = models.Team(
                name=team_data["name"],
                project_title=team_data["project_title"],
                description=team_data["description"],
                department_preference=team_data["department_preference"],
                spots_available=team_data["spots_available"],
                skills_needed=team_data["skills_needed"],
                roles_needed=team_data["roles_needed"],
                contact=team_data["contact"],
                created_by=team_data["created_by"],
            )

            db.add(team)
            db.commit()
            db.refresh(team)

            membership = models.TeamMember(
                team_id=team.id,
                student_id=team_data["created_by"],
            )

            db.add(membership)
            db.commit()

            print(f"Created team: {team.name}")

    finally:
        db.close()


if __name__ == "__main__":
    seed_teams()