-- college_ms PostgreSQL Schema
-- Converted from MariaDB (phpMyAdmin export)

SET client_encoding = 'UTF8';
BEGIN;

-- --------------------------------------------------------
-- Table: global_settings
-- --------------------------------------------------------
CREATE TYPE semester_type_enum AS ENUM ('Odd', 'Even');

CREATE TABLE global_settings (
    id               SERIAL PRIMARY KEY,
    current_academic_year  VARCHAR(9)         NOT NULL,
    current_semester_type  semester_type_enum NOT NULL
);

-- --------------------------------------------------------
-- Table: users
-- --------------------------------------------------------
CREATE TYPE user_role_enum AS ENUM ('admin', 'teacher', 'student');

CREATE TABLE users (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(50)     NOT NULL UNIQUE,
    password    VARCHAR(255)    NOT NULL,
    role        user_role_enum  NOT NULL,
    is_active   BOOLEAN         DEFAULT TRUE,
    last_login  TIMESTAMPTZ     DEFAULT NULL,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------
-- Table: courses
-- --------------------------------------------------------
CREATE TABLE courses (
    id              SERIAL PRIMARY KEY,
    course_code     VARCHAR(10)  NOT NULL UNIQUE,
    course_name     VARCHAR(100) NOT NULL,
    department      VARCHAR(100) NOT NULL,
    duration_years  INT          NOT NULL,
    total_semesters INT          NOT NULL
);

-- --------------------------------------------------------
-- Table: teachers
-- --------------------------------------------------------
CREATE TYPE gender_enum AS ENUM ('Male', 'Female', 'Other');
CREATE TYPE designation_enum AS ENUM ('Professor', 'Assistant Professor', 'Guest Lecturer');

CREATE TABLE teachers (
    teacher_id          SERIAL PRIMARY KEY,
    user_id             INT             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_id         VARCHAR(50)     NOT NULL UNIQUE,
    full_name           VARCHAR(100)    NOT NULL,
    gender              gender_enum     NOT NULL,
    email               VARCHAR(150)    NOT NULL UNIQUE,
    phone_number        VARCHAR(20)     NOT NULL,
    address             TEXT            DEFAULT NULL,
    profile_picture_url VARCHAR(255)    DEFAULT NULL,
    department          VARCHAR(100)    NOT NULL,
    qualification       VARCHAR(100)    NOT NULL,
    designation         designation_enum NOT NULL,
    joining_date        DATE            NOT NULL
);

-- --------------------------------------------------------
-- Table: students
-- --------------------------------------------------------
CREATE TYPE student_status_enum AS ENUM ('Active', 'Graduated', 'Suspended');

CREATE TABLE students (
    student_id          SERIAL PRIMARY KEY,
    user_id             INT                 NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id           INT                 NOT NULL REFERENCES courses(id),
    enrollment_number   VARCHAR(50)         NOT NULL UNIQUE,
    full_name           VARCHAR(100)        NOT NULL,
    date_of_birth       DATE                NOT NULL,
    gender              gender_enum         NOT NULL,
    blood_group         VARCHAR(5)          DEFAULT NULL,
    profile_picture_url VARCHAR(255)        DEFAULT NULL,
    email               VARCHAR(150)        NOT NULL UNIQUE,
    phone_number        VARCHAR(20)         NOT NULL,
    address             TEXT                NOT NULL,
    city                VARCHAR(50)         NOT NULL,
    state               VARCHAR(50)         NOT NULL,
    pin_code            VARCHAR(10)         NOT NULL,
    guardian_name       VARCHAR(100)        NOT NULL,
    guardian_phone      VARCHAR(20)         NOT NULL,
    guardian_relation   VARCHAR(50)         DEFAULT NULL,
    semester            INT                 NOT NULL,
    admission_date      DATE                NOT NULL,
    status              student_status_enum DEFAULT 'Active'
);

-- --------------------------------------------------------
-- Table: subjects
-- --------------------------------------------------------
CREATE TYPE subject_type_enum AS ENUM ('Core', 'Elective', 'Practical');

CREATE TABLE subjects (
    id           SERIAL PRIMARY KEY,
    course_id    INT               NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    semester     INT               NOT NULL,
    subject_code VARCHAR(20)       NOT NULL UNIQUE,
    subject_name VARCHAR(100)      NOT NULL,
    subject_type subject_type_enum DEFAULT 'Core',
    credits      INT               NOT NULL DEFAULT 3
);

-- --------------------------------------------------------
-- Table: teacher_assignments
-- --------------------------------------------------------
CREATE TABLE teacher_assignments (
    id            SERIAL PRIMARY KEY,
    teacher_id    INT         NOT NULL REFERENCES teachers(teacher_id) ON DELETE CASCADE,
    subject_id    INT         NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    academic_year VARCHAR(9)  NOT NULL,
    UNIQUE (teacher_id, subject_id, academic_year)
);

-- --------------------------------------------------------
-- Table: daily_classes
-- --------------------------------------------------------
CREATE TYPE class_status_enum AS ENUM ('Scheduled', 'Cancelled', 'Completed');

CREATE TABLE daily_classes (
    id          SERIAL PRIMARY KEY,
    subject_id  INT               NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id  INT               NOT NULL REFERENCES teachers(teacher_id) ON DELETE CASCADE,
    class_date  DATE              NOT NULL,
    start_time  TIME              NOT NULL,
    end_time    TIME              NOT NULL,
    room_number VARCHAR(20)       NOT NULL,
    status      class_status_enum DEFAULT 'Scheduled',
    created_at  TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------
-- Table: attendance
-- --------------------------------------------------------
CREATE TYPE attendance_status_enum AS ENUM ('Present', 'Absent', 'Late', 'Excused');

CREATE TABLE attendance (
    id             SERIAL PRIMARY KEY,
    student_id     INT                    NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    daily_class_id INT                    NOT NULL REFERENCES daily_classes(id) ON DELETE CASCADE,
    status         attendance_status_enum NOT NULL,
    remarks        VARCHAR(255)           DEFAULT NULL,
    marked_by      INT                    NOT NULL REFERENCES teachers(teacher_id),
    UNIQUE (student_id, daily_class_id)
);

-- --------------------------------------------------------
-- Table: marks
-- --------------------------------------------------------
CREATE TYPE exam_type_enum AS ENUM ('Sessional 1', 'Sessional 2', 'End Sem', 'Practical', 'Assignment');

CREATE TABLE marks (
    id          SERIAL PRIMARY KEY,
    student_id  INT            NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    subject_id  INT            NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    exam_type   exam_type_enum NOT NULL,
    score       NUMERIC(5, 2)  NOT NULL,
    max_score   INT            DEFAULT 100,
    remarks     VARCHAR(255)   DEFAULT NULL,
    uploaded_by INT            NOT NULL REFERENCES teachers(teacher_id),
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, subject_id, exam_type)
);

-- --------------------------------------------------------
-- Table: fees
-- --------------------------------------------------------
CREATE TYPE fee_type_enum   AS ENUM ('Tuition', 'Hostel', 'Library Fine', 'Exam');
CREATE TYPE fee_status_enum AS ENUM ('Pending', 'Partial', 'Paid');

CREATE TABLE fees (
    id           SERIAL PRIMARY KEY,
    student_id   INT             NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    semester     INT             NOT NULL,
    fee_type     fee_type_enum   DEFAULT 'Tuition',
    total_fee    NUMERIC(10, 2)  NOT NULL,
    paid_amount  NUMERIC(10, 2)  DEFAULT 0.00,
    due_date     DATE            NOT NULL,
    status       fee_status_enum DEFAULT 'Pending',
    UNIQUE (student_id, semester, fee_type)
);

-- --------------------------------------------------------
-- Table: payments
-- --------------------------------------------------------
CREATE TYPE payment_method_enum AS ENUM ('Online', 'Cash', 'Bank Transfer');

CREATE TABLE payments (
    id                    SERIAL PRIMARY KEY,
    fee_id                INT                 NOT NULL REFERENCES fees(id) ON DELETE CASCADE,
    amount_paid           NUMERIC(10, 2)      NOT NULL,
    payment_method        payment_method_enum NOT NULL,
    transaction_reference VARCHAR(100)        DEFAULT NULL UNIQUE,
    payment_date          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    processed_by          INT                 DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL
);

-- --------------------------------------------------------
-- Table: notices
-- --------------------------------------------------------
CREATE TYPE notice_target_enum   AS ENUM ('all', 'teacher', 'student');
CREATE TYPE notice_priority_enum AS ENUM ('Low', 'Normal', 'High');

CREATE TABLE notices (
    id             SERIAL PRIMARY KEY,
    title          VARCHAR(255)          NOT NULL,
    content        TEXT                  NOT NULL,
    target_role    notice_target_enum    DEFAULT 'all',
    subject_id     INT                   DEFAULT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    priority       notice_priority_enum  DEFAULT 'Normal',
    attachment_url VARCHAR(255)          DEFAULT NULL,
    valid_until    DATE                  DEFAULT NULL,
    posted_by      INT                   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at     TIMESTAMPTZ           NOT NULL DEFAULT NOW()
);

COMMIT;
