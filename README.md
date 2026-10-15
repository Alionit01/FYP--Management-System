<div align="center">

# FYP Finder

**Find your project people. Build your team. Get started.**

[Open the live app](https://fypms-psi.vercel.app/) · [View the source](https://github.com/Alionit01/Fypms)

![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)
![FastAPI](https://img.shields.io/badge/API-FastAPI-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169e1?logo=postgresql&logoColor=white)
![Vite](https://img.shields.io/badge/Built%20with-Vite-646cff?logo=vite&logoColor=white)

</div>

FYP Finder helps students discover potential project teammates and manage the process of forming a final-year project team—from creating an account to accepting an invitation.

## The student journey

```mermaid
flowchart LR
    A["**Create an account**<br/>Register with a university email"] --> B["**Verify your email**<br/>Confirm you own the address"]
    B --> C["**Find your people**<br/>Browse student and team profiles"]
    C --> D["**Start or join a team**<br/>Create a team or receive an invitation"]
    D --> E["**Build together**<br/>Manage your team and profile"]
```

## What you can do

| Discover | Team up | Manage |
| --- | --- | --- |
| Browse students and teams | Create and edit a team profile | Verify your university email |
| View student and team profiles | Invite students to a team | Sign in and manage your profile |
| Find potential project collaborators | Accept or manage invitations | Reset a forgotten password |

> Invitations need to be accepted before a student becomes a team member.

## Under the hood

```mermaid
flowchart LR
    subgraph Client["Frontend · React + Vite"]
        Pages["Pages and components"]
        ClientAPI["API client"]
        Pages --> ClientAPI
    end

    subgraph Server["Backend · FastAPI"]
        Routes["REST API"]
        Auth["Authentication"]
        Models["SQLAlchemy models"]
        Routes --> Auth
        Routes --> Models
    end

    DB[("PostgreSQL")]
    Email["Email delivery<br/>Resend or SMTP"]

    ClientAPI -->|"HTTP requests"| Routes
    Models --> DB
    Routes -->|"Verification and password-reset links"| Email
```

## Built with

| Part | Tools |
| --- | --- |
| Frontend | React 19, React Router, Vite, Tailwind CSS |
| Backend | Python 3.12+, FastAPI, SQLAlchemy |
| Database | PostgreSQL, psycopg |
| Email | Resend or SMTP |
| Checks | GitHub Actions, backend tests, frontend lint and tests |

## Run it locally

### Requirements

- Python 3.12+
- Node.js 22 and npm
- PostgreSQL

### 1. Clone the repo

```bash
git clone https://github.com/Alionit01/Fypms.git
cd Fypms
```

### 2. Start the backend

Create a PostgreSQL database, then install the backend requirements:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `backend/.env` and set the database connection, university email domain, secret key, and frontend URL:

```dotenv
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@localhost:5432/DBNAME
UNIVERSITY_EMAIL_DOMAIN=your-university.edu
SECRET_KEY=replace-with-a-long-random-secret
FRONTEND_URL=http://localhost:5173
```

Start the API from the `backend/` directory:

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://127.0.0.1:8000`. Its interactive documentation is at `http://127.0.0.1:8000/docs`.

For local development, if email isn’t configured, verification and password-reset links can be printed in the backend console. To send email, configure Resend or SMTP using the options in `backend/.env.example`.

### 3. Start the frontend

In a second terminal, from the repository root:

```bash
cd frontend
npm ci
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`. By default, the frontend connects to the API at `http://127.0.0.1:8000`.

To use a different API URL, create `frontend/.env.local`:

```dotenv
VITE_API_URL=http://127.0.0.1:8000
```

## Run the checks

From `frontend/`:

```bash
npm run lint
npm test
npm run build
```

From `backend/`:

```bash
mkdir -p /tmp/opencode
python -m unittest discover -s tests -v
```

Backend tests use disposable SQLite databases. Running the app itself requires PostgreSQL.

## Project layout

```text
Fypms/
├── backend/
│   ├── app/          # API, authentication, database models, email
│   ├── scripts/
│   └── tests/
├── frontend/
│   ├── src/          # Pages, components, API client
│   └── tests/
└── .github/
    └── workflows/    # CI checks
```

## Deployment

The frontend is live at [fypms-psi.vercel.app](https://fypms-psi.vercel.app/). The backend is configured separately and needs a PostgreSQL database.

For deployment, set `VITE_API_URL` to the deployed API address. Configure the backend’s database URL, allowed frontend origins, university email domain, secret key, and email sender in the hosting environment.

Never deploy the placeholder credentials from `backend/.env.example` or commit real credentials.

## Author

Built by [Ali ur Rehman](https://github.com/Alionit01).  
Found a problem? [Open an issue](https://github.com/Alionit01/Fypms/issues).
