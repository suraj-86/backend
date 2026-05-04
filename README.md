# College Management System Backend

This is a college project backend for a **College Management System**. The project provides REST APIs for managing students, teachers, courses, subjects, notices, attendance, marks, and dashboard data. It uses **Node.js**, **Express.js**, and **PostgreSQL**.

The main goal of this project is to demonstrate how a real college administration system can store academic data in a relational database and expose it through backend APIs for use by a frontend application.

## Project Overview

In a college, different users need different types of access:

- **Admin** can manage students, teachers, courses, subjects, and notices.
- **Teachers** can view assigned subjects, schedule classes, mark attendance, upload marks, and view dashboards.
- **Students** can view notices, subjects, results, attendance logs, profile details, and dashboard information.

This backend handles these operations through API endpoints and connects them with a PostgreSQL database.

## Technologies Used

- **Node.js** - JavaScript runtime environment
- **Express.js** - Backend web framework
- **PostgreSQL** - Relational database
- **pg** - PostgreSQL client for Node.js
- **dotenv** - Environment variable management
- **cors** - Cross-origin request support
- **nodemon** - Development server auto-restart tool

## Folder Structure

```text
Backend+DB/
+-- backend/
|   +-- src/
|   |   +-- db/
|   |       +-- db.js
|   +-- .env
|   +-- .gitignore
|   +-- package.json
|   +-- package-lock.json
|   +-- server.js
+-- college_ms_postgres.sql
+-- package.json
+-- README.md
```

## Database Design

The database schema is available in:

```text
college_ms_postgres.sql
```

Important tables included in the database:

- `users`
- `students`
- `teachers`
- `courses`
- `subjects`
- `teacher_assignments`
- `daily_classes`
- `attendance`
- `marks`
- `fees`
- `payments`
- `notices`
- `global_settings`

The database uses foreign keys to connect related records, such as students with courses, teachers with subjects, attendance with classes, and marks with students and subjects.

## Main Features

### 1. Login System

The backend provides a login API for users with different roles:

- Admin
- Teacher
- Student

API:

```http
POST /api/login
```

### 2. Student Management

Admin can perform CRUD operations for students.

APIs:

```http
GET    /api/students
POST   /api/students
PUT    /api/students/:id
DELETE /api/students/:id
```

### 3. Teacher Management

Admin can add, update, view, and delete teacher records.

APIs:

```http
GET    /api/teachers
POST   /api/teachers
PUT    /api/teachers/:id
DELETE /api/teachers/:id
```

### 4. Course and Subject Management

Admin can manage courses and subjects offered by the college.

APIs:

```http
GET    /api/courses
POST   /api/courses
PUT    /api/courses/:id
DELETE /api/courses/:id

GET    /api/subjects
POST   /api/subjects
PUT    /api/subjects/:id
DELETE /api/subjects/:id
```

### 5. Notice Management

Notices can be created for all users, students, teachers, or subject-specific groups.

APIs:

```http
GET    /api/notices
POST   /api/notices
PUT    /api/notices/:id
DELETE /api/notices/:id
```

### 6. Attendance Management

Teachers can schedule classes and mark student attendance.

Important APIs:

```http
POST /api/teacher/schedule-class
POST /api/attendance
GET  /api/attendance/class/:classId
GET  /api/teacher/:id/attendance-history
GET  /api/student/:id/attendance-logs
```

### 7. Marks and Results

Teachers can upload marks and students can view their results.

Important APIs:

```http
GET  /api/marks/details
POST /api/marks
GET  /api/teacher/:id/marks-ledger
GET  /api/student/:id/results
```

### 8. Dashboard APIs

The project includes dashboard endpoints for admin, teacher, and student views.

Important APIs:

```http
GET /api/admin/dashboard-stats
GET /api/teacher/:id/dashboard
GET /api/student/:id/custom-dashboard
```

## Installation and Setup

### Prerequisites

Install the following software before running the project:

- Node.js
- PostgreSQL
- npm

### 1. Clone or Open the Project

Open the project folder:

```bash
cd Backend+DB/backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create PostgreSQL Database

Create a PostgreSQL database, then import the SQL file:

```bash
psql -U postgres -d your_database_name -f ../college_ms_postgres.sql
```

Replace `your_database_name` with your actual database name.

### 4. Configure Environment Variables

Create or update the `.env` file inside the `backend` folder:

```env
PORT=5000
DB_URL=postgresql://username:password@localhost:5432/your_database_name
```

Replace the database username, password, and database name according to your local PostgreSQL setup.

### 5. Run the Backend Server

```bash
npm run dev
```

The server will start using the port defined in the `.env` file.

Example:

```text
http://localhost:5000
```

## API Testing

The APIs can be tested using:

- Postman
- Thunder Client
- Any frontend application connected to this backend

Example login request:

```http
POST http://localhost:5000/api/login
Content-Type: application/json
```

```json
{
  "username": "admin",
  "password": "admin123"
}
```

## Learning Outcomes

Through this college project, the following concepts are demonstrated:

- Designing a normalized relational database
- Creating REST APIs using Express.js
- Connecting Node.js with PostgreSQL
- Performing CRUD operations
- Using environment variables for configuration
- Managing role-based data for admin, teacher, and student users
- Handling database transactions while creating related user records
- Building backend services that can be connected to a frontend

## Future Enhancements

Some possible improvements for this project are:

- Add password hashing using bcrypt
- Add JWT-based authentication
- Add API validation for request data
- Add frontend integration
- Add file upload support for profile pictures and attachments
- Add automated tests
- Improve error handling and response formatting

## Conclusion

This College Management System backend is designed as an academic project to show how college records can be managed digitally. It provides a practical example of backend development, database design, and API-based communication between a server and client application.
