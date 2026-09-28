# Database Design

The LMS backend uses SQLite for the initial implementation. The database includes these primary entities:

- roles
- users
- courses
- enrollments
- modules
- lessons
- materials
- assignments
- submissions
- quizzes
- questions
- quiz_attempts
- quiz_answers
- results
- progress
- announcements

## Core relationships

- Users belong to a role
- Faculty teach courses
- Students enroll into courses
- Courses contain modules, lessons, materials, assignments, quizzes, and announcements
- Assignments have submissions
- Quizzes have questions and attempts
- Results and progress are tracked per user and course

## Design principles

- Primary keys on all tables
- Foreign keys for relational integrity
- Unique constraints for email, username, and course enrollment combinations
- Timestamp fields for audit tracking
- Indexes on frequently queried fields such as user role, course ownership, and enrollment records

## Seed accounts

The development seed data includes:

- 1 admin account
- 1 faculty account
- 2 student accounts
- sample course records
- example modules and lessons
- sample announcements

All seed demo accounts are clearly marked as development/demo data and are not intended for production use.
