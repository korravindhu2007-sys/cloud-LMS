# Architecture

This project is structured as a simple three-tier LMS architecture:

- React frontend for role-specific learning and teaching workspaces
- Express REST API for business logic and access control
- SQLite database for local academic project persistence

## Why this architecture

This is a maintainable, practical choice for an undergraduate CSE project because it keeps the system easy to run locally, simple to debug, and suitable for later cloud deployment.

## Layers

### Frontend
- Vite + React application
- Role-specific workspace UI with the active Student, Faculty, and Admin sidebars
- Role-based navigation and layout
- API client service layer

### Backend
- Express server
- Route/controller-style request handling
- JWT authentication
- Role-based authorization logic
- Validation and centralized error handling

### Database
- SQLite via better-sqlite3
- Core LMS entities mapped to relational tables
- Seed data for development/demo accounts
- Foreign keys and indexing for relational integrity

## Deployment direction

Later, the same backend can be connected to cloud object storage for course materials and uploads, while the database can move to PostgreSQL or MySQL in production.
