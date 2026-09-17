from app.database import SessionLocal
from app.models import Student
from app.auth import hash_password


students = [
    {
        "name": "Ahmed Khan",
        "university_id": "TEST1001",
        "email": "test1001@iqra.edu.pk",
        "program": "BSCS",
        "skills": "Python, FastAPI, PostgreSQL",
        "interests": "AI, Backend Development",
        "fyp_status": "Looking for a team",
        "bio": "Interested in backend systems and AI.",
    },
    {
        "name": "Sara Ahmed",
        "university_id": "TEST1002",
        "email": "test1002@iqra.edu.pk",
        "program": "BSCS",
        "skills": "React, JavaScript, Tailwind CSS",
        "interests": "Web Development, UI",
        "fyp_status": "Looking for a team",
        "bio": "Frontend developer interested in modern web applications.",
    },
    {
        "name": "Hamza Ali",
        "university_id": "TEST1003",
        "email": "test1003@iqra.edu.pk",
        "program": "BSCS",
        "skills": "Java, Spring Boot, SQL",
        "interests": "Software Engineering",
        "fyp_status": "Already in a team",
        "bio": "Interested in scalable software systems.",
    },
    {
        "name": "Ayesha Malik",
        "university_id": "TEST1004",
        "email": "test1004@iqra.edu.pk",
        "program": "BSCS",
        "skills": "Python, Machine Learning, Pandas",
        "interests": "Data Science, AI",
        "fyp_status": "Looking for a team",
        "bio": "Exploring machine learning and data analysis.",
    },
    {
        "name": "Usman Raza",
        "university_id": "TEST1005",
        "email": "test1005@iqra.edu.pk",
        "program": "BSCS",
        "skills": "C++, Algorithms, Git",
        "interests": "Competitive Programming",
        "fyp_status": "Already in a team",
        "bio": "Enjoys algorithms and problem solving.",
    },
    {
        "name": "Fatima Noor",
        "university_id": "TEST1006",
        "email": "test1006@iqra.edu.pk",
        "program": "BSSE",
        "skills": "React, Node.js, MongoDB",
        "interests": "Web Applications",
        "fyp_status": "Looking for a team",
        "bio": "Full-stack development enthusiast.",
    },
    {
        "name": "Bilal Hassan",
        "university_id": "TEST1007",
        "email": "test1007@iqra.edu.pk",
        "program": "BSSE",
        "skills": "Java, OOP, Software Design",
        "interests": "Software Architecture",
        "fyp_status": "Looking for a team",
        "bio": "Interested in clean software architecture.",
    },
    {
        "name": "Maham Iqbal",
        "university_id": "TEST1008",
        "email": "test1008@iqra.edu.pk",
        "program": "BSSE",
        "skills": "UI/UX, Figma, HTML, CSS",
        "interests": "Design, User Experience",
        "fyp_status": "Looking for a team",
        "bio": "Interested in designing simple and useful interfaces.",
    },
    {
        "name": "Danish Shah",
        "university_id": "TEST1009",
        "email": "test1009@iqra.edu.pk",
        "program": "BSSE",
        "skills": "Python, Django, PostgreSQL",
        "interests": "Backend Development",
        "fyp_status": "Already in a team",
        "bio": "Backend developer interested in web systems.",
    },
    {
        "name": "Hira Zain",
        "university_id": "TEST1010",
        "email": "test1010@iqra.edu.pk",
        "program": "BSSE",
        "skills": "Testing, Selenium, Java",
        "interests": "Software Testing, QA",
        "fyp_status": "Looking for a team",
        "bio": "Interested in software quality and automation.",
    },
    {
        "name": "Zain Ahmed",
        "university_id": "TEST1011",
        "email": "test1011@iqra.edu.pk",
        "program": "BSAI",
        "skills": "Python, TensorFlow, Machine Learning",
        "interests": "Deep Learning, Computer Vision",
        "fyp_status": "Looking for a team",
        "bio": "Interested in AI and computer vision.",
    },
    {
        "name": "Maryam Khan",
        "university_id": "TEST1012",
        "email": "test1012@iqra.edu.pk",
        "program": "BSAI",
        "skills": "Python, PyTorch, NLP",
        "interests": "Natural Language Processing",
        "fyp_status": "Looking for a team",
        "bio": "Interested in language models and NLP.",
    },
    {
        "name": "Saad Umar",
        "university_id": "TEST1013",
        "email": "test1013@iqra.edu.pk",
        "program": "BSAI",
        "skills": "Python, Computer Vision, OpenCV",
        "interests": "Robotics, Vision",
        "fyp_status": "Already in a team",
        "bio": "Interested in computer vision applications.",
    },
    {
        "name": "Iqra Tariq",
        "university_id": "TEST1014",
        "email": "test1014@iqra.edu.pk",
        "program": "BSAI",
        "skills": "Python, Data Science, SQL",
        "interests": "Data Analytics, AI",
        "fyp_status": "Looking for a team",
        "bio": "Interested in data-driven applications.",
    },
    {
        "name": "Owais Javed",
        "university_id": "TEST1015",
        "email": "test1015@iqra.edu.pk",
        "program": "BSAI",
        "skills": "Python, Reinforcement Learning",
        "interests": "AI Research, Robotics",
        "fyp_status": "Already in a team",
        "bio": "Interested in intelligent systems and robotics.",
    },
    {
        "name": "Ali Raza",
        "university_id": "TEST1016",
        "email": "test1016@iqra.edu.pk",
        "program": "BSCY",
        "skills": "Linux, Networking, Wireshark",
        "interests": "Network Security",
        "fyp_status": "Looking for a team",
        "bio": "Interested in cybersecurity and networking.",
    },
    {
        "name": "Noor Fatima",
        "university_id": "TEST1017",
        "email": "test1017@iqra.edu.pk",
        "program": "BSCY",
        "skills": "Python, Cybersecurity, Kali Linux",
        "interests": "Ethical Hacking",
        "fyp_status": "Looking for a team",
        "bio": "Interested in security research and ethical hacking.",
    },
    {
        "name": "Talha Ahmed",
        "university_id": "TEST1018",
        "email": "test1018@iqra.edu.pk",
        "program": "BSCY",
        "skills": "Networking, Firewalls, Linux",
        "interests": "Network Security",
        "fyp_status": "Already in a team",
        "bio": "Interested in secure network infrastructure.",
    },
    {
        "name": "Laiba Hassan",
        "university_id": "TEST1019",
        "email": "test1019@iqra.edu.pk",
        "program": "BSCY",
        "skills": "Digital Forensics, Python, Linux",
        "interests": "Forensics, Cybercrime Investigation",
        "fyp_status": "Looking for a team",
        "bio": "Interested in digital forensics.",
    },
    {
        "name": "Rayyan Sheikh",
        "university_id": "TEST1020",
        "email": "test1020@iqra.edu.pk",
        "program": "BSCY",
        "skills": "Cryptography, Python, Security",
        "interests": "Cryptography, Application Security",
        "fyp_status": "Looking for a team",
        "bio": "Interested in application security and cryptography.",
    },
]


db = SessionLocal()

try:
    for student_data in students:

        existing = db.query(Student).filter(
            Student.university_id == student_data["university_id"]
        ).first()

        if existing:
            print(f"Skipping {student_data['name']} - already exists")
            continue

        student = Student(
            **student_data,
            password=hash_password("TestPassword123")
        )

        db.add(student)

    db.commit()

    print("20 test students added successfully!")

finally:
    db.close()