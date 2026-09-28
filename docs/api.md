# LMS API Reference

All protected endpoints require `Authorization: Bearer <token>`. Responses use `{ success, ...payload }`; unauthenticated requests return `401` and unauthorized requests return `403`.

## Authentication

| Method | Endpoint | Access | Notes |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | Creates a **student** account only. Supplying `faculty` or `admin` as a role is rejected. |
| POST | `/auth/login` | Public | Accepts a username or email plus password. |
| POST | `/auth/logout` | Authenticated | Clears the client session. |
| GET | `/auth/me` | Authenticated | Returns the current user. |
| GET/PUT | `/users/me` | Authenticated | Reads or updates the current profile. |

## Courses and Learning

| Method | Endpoint | Access |
| --- | --- | --- |
| GET | `/courses` | Public catalog metadata |
| GET | `/courses/me/courses` | Student |
| GET | `/courses/:id` | Authenticated; an unenrolled student receives metadata only, while a course owner or admin receives content |
| POST | `/courses/:id/enroll` | Student |
| GET | `/courses/:id/modules` | Enrolled student, course owner, or admin |
| GET | `/modules/:moduleId/lessons` | Enrolled student, course owner, or admin |
| GET | `/lessons/:id` | Enrolled student, course owner, or admin |
| POST | `/lessons/:id/complete` | Enrolled student |
| GET | `/courses/:id/progress` | Enrolled student, course owner, or admin |

## Faculty Course Management

Faculty operations below require ownership of the target course. The backend enforces this for content reads, rosters, progress, and every mutation; the UI is not the authorization boundary. Admin access remains available where the backend role middleware permits it.

| Method | Endpoint |
| --- | --- |
| POST, PUT, DELETE | `/courses` and `/courses/:id` |
| POST | `/courses/:id/modules` |
| PUT, DELETE | `/modules/:id` |
| POST | `/modules/:moduleId/lessons` |
| PUT, DELETE | `/lessons/:id` |
| GET | `/courses/:id/students` |
| GET, POST | `/courses/:id/materials` |
| POST | `/courses/:id/announcements` |

Course, module, and lesson update handlers whitelist editable fields. Ownership and foreign-key fields cannot be reassigned by update payloads.

## Assignments

| Method | Endpoint | Access |
| --- | --- | --- |
| GET, POST | `/courses/:id/assignments` | Course participant; creation requires owner/admin |
| GET, DELETE | `/assignments/:id` | Participant; deletion requires owner/admin |
| POST | `/assignments/:id/submissions` | Enrolled student |
| GET | `/assignments/:id/my-submission` | Student's submission or staff submissions |
| GET | `/assignments/:id/submissions` | Course owner/admin |
| POST | `/submissions/:id/evaluate` | Course owner/admin |

## Announcements

`GET /announcements/my` returns announcements for the current student's enrolled courses, the current faculty member's owned courses, or all courses for an admin.

## Local runtime

The API listens on `http://localhost:5000`. The Vite client runs only on `http://localhost:5175` (`strictPort: true`).
