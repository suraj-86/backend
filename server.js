import express from 'express';
import dotenv from 'dotenv';
// const mysql = require('mysql2');

dotenv.config()

import { pool } from './src/db/db.js';
import cors from 'cors';
const app = express();
app.use(cors());
app.use(express.json());


// ==========================================
// 2. LOGIN ROUTE
// ==========================================
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    // We fetch full_name and ensure it is named 'full_name' in the result
    const sql = `
        SELECT u.id, u.username, u.role, 
               COALESCE(t.full_name, s.full_name, u.username) AS full_name
        FROM users u
        LEFT JOIN teachers t ON u.id = t.user_id
        LEFT JOIN students s ON u.id = s.user_id
        WHERE u.username = ? AND u.password = ?`;

    pool.query(sql, [username, password], (err, data) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (data.length > 0) {
            // This sends { id, username, role, full_name } to React
            return res.json({ success: true, user: data[0] });
        } else {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }
    });
});

// ==========================================
// 3. STUDENT MANAGEMENT ROUTES
// ==========================================

// GET all students
app.get('/api/students', (req, res) => {
     console.log("GET /api/students hit");
    const sql = `
        SELECT students.*, courses.course_name 
        FROM students 
        LEFT JOIN courses ON students.course_id = courses.id
    `;
    pool.query(sql, (err, data) => {
        if (err) return res.status(500).json(err);
        return res.json(data);
    });
});

// POST (Add) student
app.post('/api/students', async (req, res) => {
    const { name, email, roll, password, semester, course_id } = req.body;

    try {
        await pool.transaction(async (tx) => {
            const userSql = "INSERT INTO users (username, password, role) VALUES (?, ?, 'student')";
            const userResult = await tx.query(userSql, [roll, password]);
            const userId = userResult.insertId;

            const studentSql = `
                INSERT INTO students (
                    user_id, course_id, enrollment_number, full_name, date_of_birth, gender, email,
                    phone_number, address, city, state, pin_code, guardian_name, guardian_phone,
                    semester, admission_date, status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_DATE, 'Active')
            `;

            await tx.query(studentSql, [
                userId, course_id, roll, name, '2000-01-01', 'Other', email,
                '', '', '', '', '', 'N/A', '', semester || 1
            ]);
        });

        res.json({ success: true });
    } catch (err) {
        const message = err.code === '23505'
            ? "Username, roll number, or email already exists. Transaction rolled back."
            : err.message;
        res.status(400).json({ error: message });
    }
});


// PUT (Update) student
app.put('/api/students/:id', (req, res) => {
    const { name, email, roll, semester } = req.body;
    const sql = "UPDATE students SET full_name=?, email=?, enrollment_number=?, semester=? WHERE student_id=?";
    pool.query(sql, [name, email, roll, semester, req.params.id], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ success: true });
    });
});

// DELETE student
app.delete('/api/students/:id', (req, res) => {
    const sql = "DELETE FROM students WHERE student_id = ?";
    pool.query(sql, [req.params.id], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ success: true });
    });
});


// ==========================================
// 4. TEACHER MANAGEMENT ROUTES
// ==========================================

// GET all teachers
app.get('/api/teachers', (req, res) => {
    const sql = "SELECT * FROM teachers";
    pool.query(sql, (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        return res.json(data);
    });
});

// POST (Add) teacher
app.post('/api/teachers', async (req, res) => {
    const { full_name, email, employee_id, department, qualification, designation, password } = req.body;

    try {
        await pool.transaction(async (tx) => {
            const userSql = "INSERT INTO users (username, password, role) VALUES (?, ?, 'teacher')";
            const userResult = await tx.query(userSql, [employee_id, password]);
            const userId = userResult.insertId;

            const teacherSql = `
                INSERT INTO teachers (
                    user_id, employee_id, full_name, gender, email, phone_number,
                    department, qualification, designation, joining_date
                )
                VALUES (?, ?, ?, 'Other', ?, '', ?, ?, ?, CURRENT_DATE)
            `;

            await tx.query(teacherSql, [userId, employee_id, full_name, email, department, qualification, designation]);
        });

        res.json({ success: true, message: "Faculty registered successfully" });
    } catch (err) {
        const message = err.code === '23505'
            ? "Employee ID or email already exists. Transaction rolled back."
            : err.message;
        res.status(400).json({ error: message });
    }
});

app.put('/api/teachers/:id', (req, res) => {
    const { full_name, email, employee_id, department, qualification, designation } = req.body;
    const sql = "UPDATE teachers SET full_name=?, email=?, employee_id=?, department=?, qualification=?, designation=? WHERE teacher_id=?";
    pool.query(sql, [full_name, email, employee_id, department, qualification, designation, req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// DELETE teacher
app.delete('/api/teachers/:id', (req, res) => {
    const sql = "DELETE FROM teachers WHERE teacher_id = ?";
    pool.query(sql, [req.params.id], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ success: true });
    });
});

// ==========================================
// 5. COURSE MANAGEMENT ROUTES
// ==========================================

// GET all courses
app.get('/api/courses', (req, res) => {
    const sql = "SELECT * FROM courses";
    pool.query(sql, (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        return res.json(data);
    });
});

// POST (Add) new course
app.post('/api/courses', (req, res) => {
    const { course_code, course_name, department, duration_years, total_semesters } = req.body;
    const sql = "INSERT INTO courses (course_code, course_name, department, duration_years, total_semesters) VALUES (?, ?, ?, ?, ?)";
    
    pool.query(sql, [course_code, course_name, department, duration_years, total_semesters], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Course added successfully" });
    });
});

// PUT (Update) course
app.put('/api/courses/:id', (req, res) => {
    const { course_code, course_name, department, duration_years, total_semesters } = req.body;
    const sql = "UPDATE courses SET course_code=?, course_name=?, department=?, duration_years=?, total_semesters=? WHERE id=?";
    
    pool.query(sql, [course_code, course_name, department, duration_years, total_semesters, req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// DELETE course
app.delete('/api/courses/:id', (req, res) => {
    const sql = "DELETE FROM courses WHERE id = ?";
    pool.query(sql, [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ==========================================
// 6. SUBJECT MANAGEMENT ROUTES
// ==========================================

// GET all subjects with Course and Teacher names
app.get('/api/subjects', (req, res) => {
    const sql = `
        SELECT subjects.*, courses.course_name, teachers.full_name as teacher_name 
        FROM subjects 
        LEFT JOIN courses ON subjects.course_id = courses.id
        LEFT JOIN teacher_assignments ON subjects.id = teacher_assignments.subject_id
        LEFT JOIN teachers ON teacher_assignments.teacher_id = teachers.teacher_id
    `;
    pool.query(sql, (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(data);
    });
});

// POST (Add) new subject
app.post('/api/subjects', (req, res) => {
    const { course_id, semester, subject_code, subject_name, subject_type, credits } = req.body;
    const sql = "INSERT INTO subjects (course_id, semester, subject_code, subject_name, subject_type, credits) VALUES (?, ?, ?, ?, ?, ?)";
    
    pool.query(sql, [course_id, semester, subject_code, subject_name, subject_type, credits], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: result.insertId });
    });
});

app.put('/api/subjects/:id', async (req, res) => {
    const subjectId = req.params.id;
    const { subject_code, subject_name, course_id, semester, subject_type, credits, teacher_id } = req.body;

    try {
        await pool.transaction(async (tx) => {
            const subSql = "UPDATE subjects SET course_id=?, semester=?, subject_code=?, subject_name=?, subject_type=?, credits=? WHERE id=?";
            await tx.query(subSql, [course_id, semester, subject_code, subject_name, subject_type, credits, subjectId]);

            await tx.query("DELETE FROM teacher_assignments WHERE subject_id=? AND academic_year='2026-2027'", [subjectId]);

            if (teacher_id) {
                await tx.query(
                    "INSERT INTO teacher_assignments (teacher_id, subject_id, academic_year) VALUES (?, ?, '2026-2027')",
                    [teacher_id, subjectId]
                );
            }
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE subject
app.delete('/api/subjects/:id', (req, res) => {
    const sql = "DELETE FROM subjects WHERE id = ?";
    pool.query(sql, [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ==========================================
// 7. CAMPUS NOTICE ROUTES
// ==========================================

// GET all notices (ordered by date)
app.get('/api/notices', (req, res) => {
    // Select date as 'date' to match your frontend accessor
    const sql = "SELECT id, title, content, target_role, priority, attachment_url, DATE_FORMAT(created_at, '%Y-%m-%d') as date FROM notices ORDER BY created_at DESC";
    pool.query(sql, (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(data);
    });
});

// POST (Create) new notice
app.post('/api/notices', (req, res) => {
    const { title, content, target_role, priority, attachment_url, posted_by } = req.body;
    
    // Validate that posted_by is present before querying
    if (!posted_by) {
        return res.status(400).json({ error: "Admin ID (posted_by) is required." });
    }

    const sql = "INSERT INTO notices (title, content, target_role, priority, attachment_url, posted_by) VALUES (?, ?, ?, ?, ?, ?)";
    
    pool.query(sql, [title, content, target_role, priority, attachment_url, posted_by], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, id: result.insertId });
    });
});

// PUT (Update) existing notice
app.put('/api/notices/:id', (req, res) => {
    const { title, content, target_role, priority, attachment_url } = req.body;
    const sql = "UPDATE notices SET title=?, content=?, target_role=?, priority=?, attachment_url=? WHERE id=?";
    
    pool.query(sql, [title, content, target_role, priority, attachment_url, req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// DELETE notice
app.delete('/api/notices/:id', (req, res) => {
    const sql = "DELETE FROM notices WHERE id = ?";
    pool.query(sql, [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ==========================================
// 8. ADMIN DASHBOARD AGGREGATION
// ==========================================

app.get('/api/admin/dashboard-stats', (req, res) => {
    const statsSql = `
        SELECT 
            (SELECT COUNT(*) FROM students) as totalStudents,
            (SELECT COUNT(*) FROM teachers) as totalTeachers,
            (SELECT COUNT(*) FROM courses) as totalCourses,
            (SELECT COUNT(*) FROM notices) as totalNotices
    `;

    const activitySql = `
        SELECT 
            u.username as user, 
            'System Access' as action, 
            u.role as target, 
            DATE_FORMAT(u.created_at, '%b %d, %Y') as time,
            'Active' as status
        FROM users u
        ORDER BY u.created_at DESC
        LIMIT 5
    `;

    pool.query(statsSql, (err, statsData) => {
        if (err) return res.status(500).json({ error: err.message });
        
        pool.query(activitySql, (err, activityData) => {
            if (err) return res.status(500).json({ error: err.message });
            
            res.json({
                stats: statsData[0],
                activities: activityData
            });
        });
    });
});

// ==========================================
// 9. TEACHER NOTICE & CLASS ROUTES
// ==========================================

// Get subjects assigned to a specific teacher
app.get('/api/teacher/:id/assigned-subjects', (req, res) => {
    // This query now counts students by matching course_id and semester
    const sql = `
        SELECT 
            s.id, 
            s.subject_code, 
            s.subject_name, 
            c.course_name,
            s.semester,
            s.credits,
            (SELECT COUNT(*) FROM students st 
             WHERE st.course_id = s.course_id AND st.semester = s.semester) as enrolled_count
        FROM subjects s
        JOIN teacher_assignments ta ON s.id = ta.subject_id
        JOIN courses c ON s.course_id = c.id
        WHERE ta.teacher_id = (SELECT teacher_id FROM teachers WHERE user_id = ?)
    `;

    pool.query(sql, [req.params.id], (err, data) => {
        if (err) {
            console.error("❌ SQL ERROR:", err.sqlMessage);
            return res.status(500).json(err);
        }
        res.json(data);
    });
});

// Get notices for the teacher (Official admin notices + their own sent notices)
app.get('/api/teacher/:id/notices', (req, res) => {
    const sql = `
        SELECT n.*, DATE_FORMAT(n.created_at, '%Y-%m-%d') as date, 
               u.username as author, s.subject_name
        FROM notices n
        LEFT JOIN users u ON n.posted_by = u.id
        LEFT JOIN subjects s ON n.subject_id = s.id
        WHERE n.target_role IN ('all', 'teacher') 
           OR n.posted_by = ?
        ORDER BY n.created_at DESC
    `;
    pool.query(sql, [req.params.id], (err, data) => {
        if (err) return res.status(500).json(err);
        res.json(data);
    });
});

// 2. Save Attendance (100% SQL Matched & Bulletproof)
app.post('/api/attendance', (req, res) => {
    const { subject_id, date, students, marked_by } = req.body;

    // STEP 1: Find the actual teacher_id using the logged-in user_id
    const getTeacherSql = `SELECT teacher_id FROM teachers WHERE user_id = ?`;

    pool.query(getTeacherSql, [marked_by], (err, teacherData) => {
        if (err || teacherData.length === 0) {
            console.error("❌ Error finding teacher:", err);
            return res.status(500).json({ error: "Teacher lookup failed" });
        }
        
        const actualTeacherId = teacherData[0].teacher_id;

        // STEP 2: Ensure a 'daily_class' exists for this date so we don't violate Foreign Keys
        const checkClassSql = `SELECT id FROM daily_classes WHERE subject_id = ? AND class_date = ?`;

        pool.query(checkClassSql, [subject_id, date], (err, classData) => {
            if (err) return res.status(500).json({ error: "Class lookup failed" });

            // Helper function to insert the attendance once we have a valid class ID
            const insertAttendance = (dailyClassId) => {
                const values = students.map(student => [
                    student.student_id,
                    dailyClassId,
                    student.status,
                    'Marked via Quick Attendance',
                    actualTeacherId
                ]);

                // ON CONFLICT keeps repeated attendance saves idempotent.
                const insertSql = `
                    INSERT INTO attendance (student_id, daily_class_id, status, remarks, marked_by) 
                    VALUES ?
                    ON CONFLICT (student_id, daily_class_id)
                    DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by, remarks = EXCLUDED.remarks
                `;

                pool.query(insertSql, [values], (insertErr, result) => {
                    if (insertErr) {
                        console.error("❌ SQL ERROR saving attendance:", insertErr.sqlMessage);
                        return res.status(500).json({ error: "Failed to save attendance" });
                    }
                    res.json({ success: true, message: "Attendance saved successfully!" });
                });
            };

            // STEP 3: If class exists, use it. If not, create a dummy one for the ledger.
            if (classData.length > 0) {
                insertAttendance(classData[0].id);
            } else {
                const createClassSql = `
                    INSERT INTO daily_classes (subject_id, teacher_id, class_date, start_time, end_time, room_number, status) 
                    VALUES (?, ?, ?, '09:00', '10:00', 'TBA', 'Completed')
                `;
                pool.query(createClassSql, [subject_id, actualTeacherId, date], (err, newClass) => {
                    if (err) {
                        console.error("❌ SQL ERROR creating class:", err.sqlMessage);
                        return res.status(500).json({ error: "Failed to auto-create class session" });
                    }
                    insertAttendance(newClass.insertId); // Pass the newly generated ID!
                });
            }
        });
    });
});


// ==========================================
// ATTENDANCE: Get Students for a Subject
// ==========================================
app.get('/api/subjects/:id/students', (req, res) => {
    
    // We join on BOTH course_id and semester to get the exact right batch of students
    const sql = `
        SELECT 
            st.student_id, 
            st.enrollment_number AS roll, 
            st.full_name AS name
        FROM students st
        JOIN subjects sub ON st.course_id = sub.course_id AND st.semester = sub.semester
        WHERE sub.id = ?
    `;
    
    pool.query(sql, [req.params.id], (err, data) => {
        if (err) {
            console.error("❌ SQL ERROR:", err.sqlMessage); 
            return res.status(500).json({ error: "Database rejected the query" });
        }
        
        // Add a default status of "Absent" to every student for the UI
        const studentsWithStatus = data.map(st => ({ ...st, status: 'Absent' }));
        res.json(studentsWithStatus);
    });
});

// ==========================================
// ATTENDANCE: History & Details
// ==========================================

// 1. Get Attendance History Summary for the Teacher
app.get('/api/teacher/:id/attendance-history', (req, res) => {
    const sql = `
        SELECT 
            dc.id, 
            DATE_FORMAT(dc.class_date, '%Y-%m-%d') as date, 
            c.course_name as class, 
            CONCAT('Sem ', s.semester) as semester, 
            s.subject_name as subject,
            SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present,
            SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) as absent
        FROM daily_classes dc
        JOIN subjects s ON dc.subject_id = s.id
        JOIN courses c ON s.course_id = c.id
        LEFT JOIN attendance a ON dc.id = a.daily_class_id
        WHERE dc.teacher_id = (SELECT teacher_id FROM teachers WHERE user_id = ?)
        GROUP BY dc.id, c.course_name, s.semester, s.subject_name
        ORDER BY dc.class_date DESC
    `;

    pool.query(sql, [req.params.id], (err, data) => {
        if (err) {
            console.error("❌ SQL ERROR fetching history:", err.sqlMessage);
            return res.status(500).json({ error: "Failed to load history" });
        }
        res.json(data);
    });
});

// 2. Get Specific Roster Details for a Past Class
app.get('/api/attendance/class/:classId', (req, res) => {
    const sql = `
        SELECT 
            st.enrollment_number as roll, 
            st.full_name as name, 
            a.status 
        FROM attendance a
        JOIN students st ON a.student_id = st.student_id
        WHERE a.daily_class_id = ?
    `;

    pool.query(sql, [req.params.classId], (err, data) => {
        if (err) {
            console.error("❌ SQL ERROR fetching details:", err.sqlMessage);
            return res.status(500).json({ error: "Failed to load details" });
        }
        res.json(data);
    });
});

// ==========================================
// 10. MARKS MANAGEMENT ROUTES
// ==========================================

// 1. Get Students for a specific subject (Using course_id and semester mapping)
app.get('/api/subjects/:id/students', (req, res) => {
    const sql = `
        SELECT st.student_id as id, st.enrollment_number as enrollment, st.full_name as name
        FROM students st
        JOIN subjects sub ON st.course_id = sub.course_id AND st.semester = sub.semester
        WHERE sub.id = ?
    `;
    pool.query(sql, [req.params.id], (err, data) => {
        if (err) return res.status(500).json({ error: "Failed to fetch students" });
        res.json(data);
    });
});

// 2. Fetch specific marks for a class and exam type (Used for Entry merging & View Modal)
app.get('/api/marks/details', (req, res) => {
    const { subject_id, exam_type } = req.query;
    const sql = `
        SELECT m.student_id as id, st.enrollment_number as enrollment, st.full_name as name, m.score, m.max_score
        FROM marks m
        JOIN students st ON m.student_id = st.student_id
        WHERE m.subject_id = ? AND m.exam_type = ?
    `;
    pool.query(sql, [subject_id, exam_type], (err, data) => {
        if (err) return res.status(500).json(err);
        res.json(data);
    });
});

// 3. Save Marks (Handles both new inserts and updating existing drafts)
app.post('/api/marks', (req, res) => {
    const { subject_id, exam_type, max_score, marks, uploaded_by_user_id } = req.body;

    // First find the exact teacher_id
    const getTeacherSql = `SELECT teacher_id FROM teachers WHERE user_id = ?`;
    pool.query(getTeacherSql, [uploaded_by_user_id], (err, teacherData) => {
        if (err || teacherData.length === 0) return res.status(500).json({ error: "Teacher lookup failed" });

        const teacherId = teacherData[0].teacher_id;
        
        // Filter out empty scores to prevent inserting blanks
        const validMarks = marks.filter(m => m.score !== '');
        if (validMarks.length === 0) return res.json({ success: true, message: "Nothing to save" });

        const values = validMarks.map(m => [
            m.id, subject_id, exam_type, m.score, max_score, teacherId
        ]);

        // ON CONFLICT allows teachers to edit/save drafts securely.
        const sql = `
            INSERT INTO marks (student_id, subject_id, exam_type, score, max_score, uploaded_by)
            VALUES ?
            ON CONFLICT (student_id, subject_id, exam_type)
            DO UPDATE SET score = EXCLUDED.score, max_score = EXCLUDED.max_score, uploaded_by = EXCLUDED.uploaded_by
        `;

        pool.query(sql, [values], (err, result) => {
            if (err) {
                console.error("❌ SQL ERROR saving marks:", err.sqlMessage);
                return res.status(500).json({ error: "Failed to save marks" });
            }
            res.json({ success: true });
        });
    });
});

// 4. Ledger Summary (Calculates class averages automatically)
app.get('/api/teacher/:id/marks-ledger', (req, res) => {
    const sql = `
        SELECT 
            m.subject_id as classId, 
            m.exam_type as type, 
            DATE_FORMAT(MAX(m.created_at), '%Y-%m-%d') as date,
            s.subject_name as subject,
            s.semester, -- Added semester for frontend filtering
            c.course_name as course,
            MAX(m.max_score) as max,
            ROUND(AVG(m.score), 1) as avg,
            'Published' as status
        FROM marks m
        JOIN subjects s ON m.subject_id = s.id
        JOIN courses c ON s.course_id = c.id
        WHERE m.uploaded_by = (SELECT teacher_id FROM teachers WHERE user_id = ?)
        GROUP BY m.subject_id, m.exam_type, s.subject_name, s.semester, c.course_name
        ORDER BY MAX(m.created_at) DESC
    `;
    pool.query(sql, [req.params.id], (err, data) => {
        if (err) return res.status(500).json(err);
        res.json(data);
    });
});

// ==========================================
// TEACHER DASHBOARD ROUTE
// ==========================================
app.get('/api/teacher/:id/dashboard', (req, res) => {
    const userId = req.params.id;

    // 1. Get Teacher ID and Name
    const teacherSql = `SELECT teacher_id, full_name FROM teachers WHERE user_id = ?`;

    pool.query(teacherSql, [userId], (err, teacherResult) => {
        if (err || teacherResult.length === 0) return res.status(404).json({ error: "Teacher not found" });

        const teacherId = teacherResult[0].teacher_id;
        const teacherName = teacherResult[0].full_name;

        // 2. Quick Stats (Assigned Subjects, Total Students)
        const statsSql = `
            SELECT 
                (SELECT COUNT(*) FROM teacher_assignments WHERE teacher_id = ?) as totalSubjects,
                (SELECT COUNT(st.student_id) FROM students st 
                 JOIN subjects sub ON st.course_id = sub.course_id AND st.semester = sub.semester
                 JOIN teacher_assignments ta ON sub.id = ta.subject_id 
                 WHERE ta.teacher_id = ?) as totalStudents
        `;

        // 3. Get Scheduled Classes for TODAY
        // FIX APPLIED HERE: Used TIME_FORMAT instead of DATE_FORMAT
        const classesSql = `
            SELECT 
                dc.id as class_id,
                dc.subject_id,
                s.subject_code,
                s.subject_name,
                s.semester,
                c.course_name,
                TIME_FORMAT(dc.start_time, '%h:%i %p') as start_time,
                TIME_FORMAT(dc.end_time, '%h:%i %p') as end_time,
                dc.room_number
            FROM daily_classes dc
            JOIN subjects s ON dc.subject_id = s.id
            JOIN courses c ON s.course_id = c.id
            WHERE dc.teacher_id = ? AND dc.class_date = CURDATE()
            ORDER BY dc.start_time ASC
        `;

        // 4. Get Recent Notices
        const noticesSql = `
            SELECT id, title, DATE_FORMAT(created_at, '%b %d') as date, priority 
            FROM notices 
            WHERE target_role IN ('all', 'teacher') 
            ORDER BY created_at DESC LIMIT 3
        `;

        pool.query(statsSql, [teacherId, teacherId], (err, statsResult) => {
            pool.query(classesSql, [teacherId], (err, classesResult) => {
                pool.query(noticesSql, (err, noticesResult) => {
                    res.json({
                        teacherName: teacherName,
                        stats: {
                            totalSubjects: statsResult[0]?.totalSubjects || 0,
                            totalStudents: statsResult[0]?.totalStudents || 0,
                            classesConducted: classesResult.length // Classes today
                        },
                        scheduledClasses: classesResult, // Updated to send daily schedule
                        notices: noticesResult
                    });
                });
            });
        });
    });
});

// ==========================================
// SCHEDULE A NEW CLASS ROUTE
// ==========================================
app.post('/api/teacher/schedule-class', (req, res) => {
    const { userId, subjectId, date, startTime, endTime, room } = req.body;

    // Step 1: Find the actual teacher_id belonging to this logged-in user
    const findTeacherSql = `SELECT teacher_id FROM teachers WHERE user_id = ?`;

    pool.query(findTeacherSql, [userId], (err, teacherResult) => {
        if (err || teacherResult.length === 0) {
            console.error("Teacher Lookup Error:", err);
            return res.status(404).json({ error: "Teacher account not found for this user." });
        }

        const exactTeacherId = teacherResult[0].teacher_id;

        // Step 2: Insert the class into daily_classes using the correct teacher_id
        const insertSql = `
            INSERT INTO daily_classes (teacher_id, subject_id, class_date, start_time, end_time, room_number) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        pool.query(insertSql, [exactTeacherId, subjectId, date, startTime, endTime, room], (err, result) => {
            if (err) {
                console.error("Insert Class Error:", err);
                return res.status(500).json({ error: "Failed to schedule class in database." });
            }
            
            res.json({ success: true, message: "Class successfully scheduled!" });
        });
    });
});


// ==========================================
// STUDENT NOTICE ROUTE
// ==========================================
app.get('/api/student/:id/notices', (req, res) => {
    const userId = req.params.id;

    // We use n.content to match your 'notices' table structure
    const sql = `
        SELECT DISTINCT 
            n.id, 
            n.title, 
            n.content, -- Matches EXACT column name in your SQL file
            n.priority, 
            n.attachment_url,
            DATE_FORMAT(n.created_at, '%b %d, %Y') as date,
            -- This gets the Full Name for Teachers/Students or Username for Admin
            COALESCE(t.full_name, s.full_name, u.username) as author_name,
            u.role as author_role
        FROM notices n
        JOIN users u ON n.posted_by = u.id
        LEFT JOIN teachers t ON u.id = t.user_id
        LEFT JOIN students s ON u.id = s.user_id
        WHERE n.target_role IN ('all', 'student')
        OR u.role = 'admin'
        OR n.posted_by IN (
            SELECT t2.user_id FROM teachers t2
            JOIN teacher_assignments ta ON t2.teacher_id = ta.teacher_id
            JOIN subjects sub ON ta.subject_id = sub.id
            JOIN students st ON sub.course_id = st.course_id AND sub.semester = st.semester
            WHERE st.user_id = ?
        )
        ORDER BY n.created_at DESC
    `;

    pool.query(sql, [userId], (err, data) => {
        if (err) {
            console.error("❌ SQL ERROR:", err.sqlMessage);
            return res.status(500).json({ error: err.sqlMessage });
        }
        res.json(data || []);
    });
});

// ==========================================
// STUDENT RESULTS ROUTE (Dynamic Max Scores)
// ==========================================
app.get('/api/student/:id/results', (req, res) => {
    const userId = req.params.id;

    // We now sum both the score AND the max_score for each category!
    const sql = `
        SELECT 
            sub.id,
            sub.subject_name as subject,
            sub.semester,
            sub.credits,
            SUM(CASE WHEN m.exam_type != 'End Sem' THEN m.score ELSE 0 END) as midTerm,
            SUM(CASE WHEN m.exam_type != 'End Sem' THEN m.max_score ELSE 0 END) as midTermMax,
            SUM(CASE WHEN m.exam_type = 'End Sem' THEN m.score ELSE 0 END) as final,
            SUM(CASE WHEN m.exam_type = 'End Sem' THEN m.max_score ELSE 0 END) as finalMax,
            SUM(m.score) as total,
            SUM(m.max_score) as totalMax
        FROM subjects sub
        JOIN marks m ON sub.id = m.subject_id
        JOIN students s ON m.student_id = s.student_id
        WHERE s.user_id = ?
        GROUP BY sub.id, sub.subject_name, sub.semester, sub.credits
        ORDER BY sub.semester ASC;
    `;

    pool.query(sql, [userId], (err, data) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json({ error: "Failed to fetch results" });
        }

        const formattedResults = {};

        data.forEach(row => {
            const total = parseFloat(row.total) || 0;
            // Prevent division by 0 if a subject has no marks yet
            const totalMax = parseFloat(row.totalMax) > 0 ? parseFloat(row.totalMax) : 100; 

            // Calculate Grade automatically based on the exact max scores available
            const percentage = (total / totalMax) * 100;
            let grade = 'F';
            if (percentage >= 90) grade = 'A+';
            else if (percentage >= 80) grade = 'A';
            else if (percentage >= 70) grade = 'B';
            else if (percentage >= 60) grade = 'C';
            else if (percentage >= 40) grade = 'D';

            if (!formattedResults[row.semester]) {
                formattedResults[row.semester] = [];
            }

            formattedResults[row.semester].push({
                id: row.id,
                subject: row.subject,
                midTerm: parseFloat(row.midTerm) || 0,
                midTermMax: parseFloat(row.midTermMax) || 0,
                final: parseFloat(row.final) || 0,
                finalMax: parseFloat(row.finalMax) || 0,
                total: total,
                totalMax: parseFloat(row.totalMax) || 0,
                grade: grade,
                credits: row.credits
            });
        });

        res.json(formattedResults);
    });
});

// ==========================================
// STUDENT ATTENDANCE ROUTE
// ==========================================

// A. GET ALL SUBJECTS FOR DROPDOWN
app.get('/api/student/:id/subjects-list', (req, res) => {
    const userId = req.params.id;
    const semester = req.query.semester;
    const sql = `
        SELECT DISTINCT s.subject_name 
        FROM subjects s
        JOIN students st ON s.course_id = st.course_id
        WHERE st.user_id = ? AND s.semester = ?`;
    pool.query(sql, [userId, semester], (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(data);
    });
});

// B. GET ATTENDANCE LOGS
app.get('/api/student/:id/attendance-logs', (req, res) => {
    const userId = req.params.id;
    const semester = req.query.semester;
    const sql = `
        SELECT 
            dc.class_date, -- From daily_classes table
            s.subject_name, -- From subjects table
            a.status        -- From attendance table (Present, Absent, Late)
        FROM attendance a
        JOIN daily_classes dc ON a.daily_class_id = dc.id
        JOIN subjects s ON dc.subject_id = s.id
        JOIN students st ON a.student_id = st.student_id
        WHERE st.user_id = ? AND s.semester = ?
        ORDER BY dc.class_date DESC`;
    pool.query(sql, [userId, semester], (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(data);
    });
});


app.get('/api/student/:id/subjects', (req, res) => {
    const userId = req.params.id;
    const semester = req.query.semester;

    const sql = `
        SELECT 
            s.id, 
            s.subject_code as code, 
            s.subject_name as name, 
            s.credits, 
            COALESCE(t.full_name, 'Not Assigned') as teacher_name
        FROM subjects s
        JOIN students st ON s.course_id = st.course_id
        LEFT JOIN teacher_assignments ta ON s.id = ta.subject_id
        LEFT JOIN teachers t ON ta.teacher_id = t.teacher_id
        WHERE st.user_id = ? AND s.semester = ?
    `;

    pool.query(sql, [userId, semester], (err, data) => {
        if (err) {
            console.error("SQL Error:", err.message);
            return res.status(500).json({ error: err.message });
        }
        
        const totalCredits = data.reduce((sum, sub) => sum + (sub.credits || 0), 0);
        
        res.json({
            available_semesters: [1, 2, 3, 4, 5, 6, 7, 8],
            total_credits: totalCredits,
            subjects: data
        });
    });
});


// --- GET STUDENT PROFILE ---
app.get('/api/student/:id/profile', (req, res) => {
    const userId = req.params.id;
    
    const sql = `
        SELECT 
            s.*, 
            DATE_FORMAT(s.date_of_birth, '%d %b %Y') as formatted_dob,
            c.course_name 
        FROM students s
        JOIN courses c ON s.course_id = c.id
        WHERE s.user_id = ?
    `;
    
    pool.query(sql, [userId], (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        if (data.length === 0) return res.status(404).json({ message: "Student not found" });

        const dbStudent = data[0];

        const formattedData = {
            personal: {
                name: dbStudent.full_name,
                dob: dbStudent.formatted_dob || "Not Available",
                blood_group: dbStudent.blood_group || "N/A",
                gender: dbStudent.gender,
                contact: dbStudent.phone_number,
                email: dbStudent.email,
                address: dbStudent.address,
                city: dbStudent.city,
                state: dbStudent.state,
                pin_code: dbStudent.pin_code,
                profile_picture: dbStudent.profile_picture_url 
            },
            academic: {
                enrollment_no: dbStudent.enrollment_number,
                course: dbStudent.course_name,
                semester: `Semester ${dbStudent.semester}`,
                batch: "2024-2027", 
                current_cgpa: "N/A", 
                attendance_overall: "N/A" 
            },
            guardians: {
                father_name: dbStudent.guardian_name,
                mother_name: "Not available in DB", 
                guardian_relation: dbStudent.guardian_relation,
                emergency_contact: dbStudent.guardian_phone
            }
        };

        res.json(formattedData);
    });
});


// --- UPDATE STUDENT PROFILE ---
app.put('/api/student/:id/profile', (req, res) => {
    const userId = req.params.id;
    
    const { 
        contact, blood_group, address, city, state, pin_code, 
        father_name, emergency_contact, guardian_relation, profile_picture
    } = req.body;

    const sql = `
        UPDATE students SET 
            phone_number = ?, 
            blood_group = ?, 
            address = ?, 
            city = ?, 
            state = ?, 
            pin_code = COALESCE(?, pin_code), 
            guardian_name = ?, 
            guardian_phone = ?, 
            guardian_relation = ?,
            profile_picture_url = COALESCE(?, profile_picture_url)
        WHERE user_id = ?
    `;

    const params = [
        contact, blood_group, address, city, state, pin_code, 
        father_name, emergency_contact, guardian_relation, profile_picture, userId
    ];

    pool.query(sql, params, (err, result) => {
        if (err) {
            console.error("❌ SQL Error:", err.message);
            return res.status(500).json({ error: "Failed to update database records." });
        }
        res.json({ success: true, message: "Profile updated successfully!" });
    });
});

// ==========================================
// STUDENT DASHBOARD (CUSTOM UI ROUTE)
// ==========================================
app.get('/api/student/:id/custom-dashboard', (req, res) => {
    const userId = req.params.id;

    // 1. Profile Information
    const profileSql = `
        SELECT s.full_name, c.course_name, s.semester, s.email, s.enrollment_number as student_id
        FROM students s
        JOIN courses c ON s.course_id = c.id
        WHERE s.user_id = ?
    `;

    // 2. Today's Classes
    const classesSql = `
        SELECT dc.id, sub.subject_name as subject, 
               CONCAT(TIME_FORMAT(dc.start_time, '%h:%i %p'), ' - ', TIME_FORMAT(dc.end_time, '%h:%i %p')) as time,
               t.full_name as faculty, dc.room_number as room, dc.status
        FROM daily_classes dc
        JOIN subjects sub ON dc.subject_id = sub.id
        JOIN teachers t ON dc.teacher_id = t.teacher_id
        JOIN students st ON sub.course_id = st.course_id AND st.semester = sub.semester
        WHERE st.user_id = ? AND dc.class_date = CURDATE()
        ORDER BY dc.start_time ASC
    `;

    // 3. Recent Notices (Top 3)
    const noticesSql = `
        SELECT id, title, 
               CASE 
                   WHEN DATE(created_at) = CURDATE() THEN 'Today'
                   WHEN DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN 'Yesterday'
                   ELSE DATE_FORMAT(created_at, '%b %d') 
               END as date,
               priority as type
        FROM notices
        WHERE target_role IN ('all', 'student')
        ORDER BY created_at DESC
        LIMIT 3
    `;

    // 4. Performance Trajectory (CGPA per semester based on marks)
    const performanceSql = `
        SELECT CONCAT('Sem ', sub.semester) as semester, 
               ROUND((SUM(m.score) / SUM(m.max_score)) * 10, 1) as cgpa
        FROM marks m
        JOIN subjects sub ON m.subject_id = sub.id
        JOIN students st ON m.student_id = st.student_id
        WHERE st.user_id = ?
        GROUP BY sub.semester
        ORDER BY sub.semester ASC
    `;

    pool.query(profileSql, [userId], (err, profileData) => {
        if (err) return res.status(500).json({ error: "Profile fetch failed" });
        if (profileData.length === 0) return res.status(404).json({ error: "Student not found" });

        pool.query(classesSql, [userId], (err, classesData) => {
            if (err) return res.status(500).json({ error: "Classes fetch failed" });

            pool.query(noticesSql, (err, noticesData) => {
                if (err) return res.status(500).json({ error: "Notices fetch failed" });

                pool.query(performanceSql, [userId], (err, perfData) => {
                    if (err) return res.status(500).json({ error: "Performance fetch failed" });

                    const mappedNotices = noticesData.map(n => ({
                        id: n.id,
                        title: n.title,
                        date: n.date,
                        type: n.type === 'High' ? 'Alert' : (n.type === 'Low' ? 'General' : 'Academic'),
                        bg: n.type === 'High' ? 'bg-amber-50' : (n.type === 'Low' ? 'bg-indigo-50' : 'bg-blue-50'),
                        iconBg: n.type === 'High' ? 'bg-amber-100' : (n.type === 'Low' ? 'bg-indigo-100' : 'bg-blue-100'),
                        text: n.type === 'High' ? 'text-amber-700' : (n.type === 'Low' ? 'text-indigo-700' : 'text-blue-700'),
                        border: n.type === 'High' ? 'border-amber-100' : (n.type === 'Low' ? 'border-indigo-100' : 'border-blue-100')
                    }));

                    res.json({
                        profile: profileData[0],
                        upcoming_classes: classesData,
                        notices: mappedNotices,
                        performanceData: perfData.length > 0 ? perfData : [
                            { semester: 'Sem 1', cgpa: 0 } 
                        ]
                    });
                });
            });
        });
    });
});

// --- START THE SERVER ---

const PORT = process.env.PORT ;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
