# Cloud Based Learning Management System

CloudLMS is a React + Vite frontend backed by Express and SQLite. It provides authenticated learning and teaching workflows with JWT-based role controls for students, faculty, and administrators.

## Implemented Features

### Students

- Public self-registration for student accounts only
- Login with either username or email
- Course catalog, enrollment, enrolled-course access, lessons, materials, and lesson completion
- Progress in the Profile page
- Assignment viewing, submission, marks, and faculty feedback
- Announcements for enrolled courses
- Sidebar: Profile, My Courses, Assignments, Logout

### Faculty

- Owned-course creation and management
- Course modules, lessons, assignments, materials, announcements, and enrolled-student rosters
- Submission review and evaluation for assignments in owned courses
- Server-enforced access to owned courses only
- Sidebar: Profile, Students, My Courses, Announcements, Logout

### Admin

- Authenticated student and faculty profile lists
- Elevated backend management access where the API authorizes it
- Sidebar: Profiles, Logout

## Architecture

- Frontend: React 19 + Vite
- Backend: Express 5
- Persistence: SQLite through `better-sqlite3`
- Authentication: JWT with bcrypt password hashes
- Authorization: role and course-ownership checks on protected endpoints

## Local Runtime

The project uses exactly these local development endpoints:

- Backend: `http://localhost:5000`
- Frontend: `http://localhost:5175`

Copy the environment template before starting the backend:

```powershell
Copy-Item .env.example .env
npm run dev:backend
```

In a second terminal, start the Vite frontend:

```powershell
npm run dev
```

Vite is configured with `strictPort`, so it fails rather than silently creating a second frontend on another port.

## Environment

```env
PORT=5000
JWT_SECRET=replace_with_a_secure_jwt_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5175
DB_PATH=backend/data/lms.db
NODE_ENV=development
```

## Verification

```powershell
npm test
npm run build
npm run lint
```

## Scope

The current LMS includes assignments and course-resource links. Quiz workflows, file uploads/object storage, advanced analytics, full administrator account management, and production deployment are outside the current scope.
