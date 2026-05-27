const initSqlJs = require("sql.js");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");

const dbDir = path.join(__dirname, "..", "database");
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
const DB_PATH = path.join(dbDir, "sms.db");

let _db = null;

let _rawDb = null;

// Persist DB to disk
function saveDb() {
  if (!_rawDb) return;
  const data = _rawDb.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// Wrap sql.js to behave synchronously like better-sqlite3
function createWrapper(sqlJsDb) {
  return {
    prepare: (sql) => ({
      run: (...params) => {
        sqlJsDb.run(sql, params);
        const changes = sqlJsDb.getRowsModified();
        const lastId = sqlJsDb.exec("SELECT last_insert_rowid()")[0]
          ?.values[0][0];
        saveDb();
        return { changes, lastInsertRowid: lastId };
      },
      get: (...params) => {
        const res = sqlJsDb.exec(sql, params);
        if (!res.length || !res[0].values.length) return undefined;
        const cols = res[0].columns;
        const row = res[0].values[0];
        return Object.fromEntries(cols.map((c, i) => [c, row[i]]));
      },
      all: (...params) => {
        const res = sqlJsDb.exec(sql, params);
        if (!res.length) return [];
        const cols = res[0].columns;
        return res[0].values.map((row) =>
          Object.fromEntries(cols.map((c, i) => [c, row[i]])),
        );
      },
    }),
    exec: (sql) => {
      sqlJsDb.run(sql);
      saveDb();
    },
    transaction: (fn) => (arg) => {
      fn(arg);
      saveDb();
    },
    pragma: () => {},
  };
}

async function getDb() {
  if (_db) return _db;

  const SQL = await initSqlJs({
    locateFile: (file) => path.join(__dirname, "..", "public", file),
  });
  let sqlDb;
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    sqlDb = new SQL.Database(fileBuffer);
  } else {
    sqlDb = new SQL.Database();
  }

  _rawDb = sqlDb;
  _db = createWrapper(sqlDb);

  // Schema
  sqlDb.run(`PRAGMA foreign_keys = ON;`);
  sqlDb.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      student_id INTEGER,
      created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_number TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      date_of_birth DATE,
      gender TEXT,
      address TEXT,
      program TEXT,
      batch TEXT,
      semester INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active',
      photo TEXT,
      created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_code TEXT UNIQUE NOT NULL,
      course_name TEXT NOT NULL,
      credits INTEGER DEFAULT 3,
      semester INTEGER,
      program TEXT,
      instructor TEXT,
      created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      date DATE NOT NULL,
      status TEXT NOT NULL,
      remarks TEXT,
      created_at DATETIME DEFAULT (datetime('now')),
      UNIQUE(student_id, course_id, date)
    );
    CREATE TABLE IF NOT EXISTS fees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      fee_type TEXT NOT NULL,
      amount REAL NOT NULL,
      due_date DATE,
      paid_date DATE,
      status TEXT DEFAULT 'pending',
      transaction_id TEXT,
      semester INTEGER,
      remarks TEXT,
      created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      semester INTEGER NOT NULL,
      marks_obtained REAL,
      max_marks REAL DEFAULT 100,
      grade TEXT,
      exam_type TEXT DEFAULT 'final',
      created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      target_role TEXT DEFAULT 'all',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now'))
    );
  `);
  saveDb();

  // Seed if empty
  const adminExists = _db
    .prepare("SELECT id FROM users WHERE role = ?")
    .get("admin");
  if (!adminExists) {
    console.log("🌱 Seeding demo data...");

    const adminHash = bcrypt.hashSync("admin123", 10);
    sqlDb.run(
      "INSERT INTO users (username, password_hash, role) VALUES (?,?,?)",
      ["admin", adminHash, "admin"],
    );

    const studentsData = [
      {
        number: "STU2024001",
        first: "Arjun",
        last: "Sharma",
        email: "arjun.sharma@university.edu",
        phone: "9876543210",
        dob: "2003-05-15",
        gender: "Male",
        address: "12 MG Road, Delhi",
        program: "B.Tech CSE",
        batch: "2024",
        semester: 2,
      },
      {
        number: "STU2024002",
        first: "Priya",
        last: "Patel",
        email: "priya.patel@university.edu",
        phone: "9876543211",
        dob: "2003-08-22",
        gender: "Female",
        address: "45 SV Nagar, Mumbai",
        program: "B.Tech ECE",
        batch: "2024",
        semester: 2,
      },
      {
        number: "STU2024003",
        first: "Rohit",
        last: "Kumar",
        email: "rohit.kumar@university.edu",
        phone: "9876543212",
        dob: "2002-12-10",
        gender: "Male",
        address: "78 Park Street, Kolkata",
        program: "B.Tech CSE",
        batch: "2024",
        semester: 4,
      },
      {
        number: "STU2024004",
        first: "Sneha",
        last: "Reddy",
        email: "sneha.reddy@university.edu",
        phone: "9876543213",
        dob: "2004-03-30",
        gender: "Female",
        address: "23 Jubilee Hills, Hyderabad",
        program: "BCA",
        batch: "2024",
        semester: 2,
      },
      {
        number: "STU2024005",
        first: "Vikram",
        last: "Singh",
        email: "vikram.singh@university.edu",
        phone: "9876543214",
        dob: "2003-07-18",
        gender: "Male",
        address: "56 Sector 21, Noida",
        program: "B.Tech ME",
        batch: "2024",
        semester: 2,
      },
      {
        number: "STU2023001",
        first: "Anjali",
        last: "Mishra",
        email: "anjali.mishra@university.edu",
        phone: "9876543215",
        dob: "2002-04-05",
        gender: "Female",
        address: "89 Civil Lines, Allahabad",
        program: "MCA",
        batch: "2023",
        semester: 4,
      },
      {
        number: "STU2023002",
        first: "Karan",
        last: "Mehta",
        email: "karan.mehta@university.edu",
        phone: "9876543216",
        dob: "2002-11-25",
        gender: "Male",
        address: "34 Linking Road, Chennai",
        program: "B.Tech CSE",
        batch: "2023",
        semester: 4,
      },
      {
        number: "STU2023003",
        first: "Divya",
        last: "Nair",
        email: "divya.nair@university.edu",
        phone: "9876543217",
        dob: "2003-01-14",
        gender: "Female",
        address: "67 Beach Road, Kochi",
        program: "BCA",
        batch: "2023",
        semester: 4,
      },
    ];

    const studentHash = bcrypt.hashSync("student123", 10);
    const studentIds = [];
    for (const s of studentsData) {
      sqlDb.run(
        "INSERT INTO students (student_number,first_name,last_name,email,phone,date_of_birth,gender,address,program,batch,semester) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        [
          s.number,
          s.first,
          s.last,
          s.email,
          s.phone,
          s.dob,
          s.gender,
          s.address,
          s.program,
          s.batch,
          s.semester,
        ],
      );
      const sid = sqlDb.exec("SELECT last_insert_rowid()")[0].values[0][0];
      studentIds.push(sid);
      sqlDb.run(
        "INSERT INTO users (username,password_hash,role,student_id) VALUES (?,?,?,?)",
        [s.number, studentHash, "student", sid],
      );
    }

    const courses = [
      [
        "CS101",
        "Introduction to Programming",
        4,
        1,
        "B.Tech CSE",
        "Dr. Anand Kumar",
      ],
      [
        "CS201",
        "Data Structures & Algorithms",
        4,
        2,
        "B.Tech CSE",
        "Prof. Sunita Rao",
      ],
      [
        "CS301",
        "Database Management Systems",
        3,
        3,
        "B.Tech CSE",
        "Dr. Ramesh Gupta",
      ],
      ["CS302", "Operating Systems", 3, 3, "B.Tech CSE", "Prof. Meena Joshi"],
      ["CS401", "Computer Networks", 3, 4, "B.Tech CSE", "Dr. Vijay Patil"],
      ["EC101", "Basic Electronics", 4, 1, "B.Tech ECE", "Prof. Lakshmi Devi"],
      ["EC201", "Circuit Theory", 3, 2, "B.Tech ECE", "Dr. Rajiv Singh"],
      ["MA101", "Engineering Mathematics I", 4, 1, "All", "Dr. Priya Sharma"],
      ["MA201", "Engineering Mathematics II", 4, 2, "All", "Dr. Priya Sharma"],
      ["CA101", "Computer Fundamentals", 3, 1, "BCA", "Prof. Anita Verma"],
    ];
    const courseIds = [];
    for (const c of courses) {
      sqlDb.run(
        "INSERT INTO courses (course_code,course_name,credits,semester,program,instructor) VALUES (?,?,?,?,?,?)",
        c,
      );
      courseIds.push(sqlDb.exec("SELECT last_insert_rowid()")[0].values[0][0]);
    }

    const attStatuses = [
      "present",
      "present",
      "present",
      "present",
      "absent",
      "present",
      "late",
    ];
    const dates = [
      "2026-04-01",
      "2026-04-02",
      "2026-04-03",
      "2026-04-07",
      "2026-04-08",
      "2026-04-09",
      "2026-04-10",
      "2026-04-14",
      "2026-04-15",
    ];
    for (const sid of studentIds.slice(0, 5)) {
      for (const cid of courseIds.slice(0, 4)) {
        for (const d of dates) {
          const st =
            attStatuses[Math.floor(Math.random() * attStatuses.length)];
          try {
            sqlDb.run(
              "INSERT OR IGNORE INTO attendance (student_id,course_id,date,status) VALUES (?,?,?,?)",
              [sid, cid, d, st],
            );
          } catch (e) {}
        }
      }
    }

    const feeTypes = [
      ["Tuition Fee", 45000],
      ["Hostel Fee", 12000],
      ["Library Fee", 2000],
      ["Lab Fee", 5000],
    ];
    for (const sid of studentIds) {
      for (const [ft, amt] of feeTypes) {
        const isPaid = Math.random() > 0.3;
        sqlDb.run(
          "INSERT INTO fees (student_id,fee_type,amount,due_date,paid_date,status,transaction_id,semester) VALUES (?,?,?,?,?,?,?,?)",
          [
            sid,
            ft,
            amt,
            "2026-04-30",
            isPaid ? "2026-04-10" : null,
            isPaid ? "paid" : "pending",
            isPaid ? `TXN${Date.now()}${sid}` : null,
            2,
          ],
        );
      }
    }

    for (const sid of studentIds.slice(0, 5)) {
      for (const cid of courseIds.slice(0, 5)) {
        const marks = Math.floor(Math.random() * 30) + 70;
        const grade =
          marks >= 90
            ? "A+"
            : marks >= 80
              ? "A"
              : marks >= 70
                ? "B+"
                : marks >= 60
                  ? "B"
                  : "C";
        sqlDb.run(
          "INSERT INTO results (student_id,course_id,semester,marks_obtained,max_marks,grade,exam_type) VALUES (?,?,?,?,?,?,?)",
          [sid, cid, 2, marks, 100, grade, "final"],
        );
        const mid = Math.floor(Math.random() * 15) + 30;
        const mg = mid >= 45 ? "A+" : mid >= 40 ? "A" : mid >= 35 ? "B+" : "B";
        sqlDb.run(
          "INSERT INTO results (student_id,course_id,semester,marks_obtained,max_marks,grade,exam_type) VALUES (?,?,?,?,?,?,?)",
          [sid, cid, 2, mid, 50, mg, "midterm"],
        );
      }
    }

    const notifs = [
      [
        "Semester Examination Schedule",
        "End semester examinations will commence from May 15, 2026. Hall tickets will be issued on May 10.",
        "info",
        "all",
      ],
      [
        "Fee Payment Deadline",
        "Last date for fee payment is April 30, 2026. Students with pending fees may not be allowed in exams.",
        "warning",
        "all",
      ],
      [
        "New Course Registration Open",
        "Registration for elective courses for Semester 3 is now open. Last date: May 5, 2026.",
        "success",
        "student",
      ],
      [
        "Faculty Meeting",
        "All faculty members are requested to attend the department meeting on April 26 at 11 AM.",
        "info",
        "admin",
      ],
      [
        "Sports Day Announcement",
        "Annual Sports Day is scheduled for May 20, 2026. Students can register for events till May 10.",
        "success",
        "all",
      ],
    ];
    for (const n of notifs) {
      sqlDb.run(
        "INSERT INTO notifications (title,message,type,target_role) VALUES (?,?,?,?)",
        n,
      );
    }

    saveDb();
    console.log("✅ Database seeded successfully!");
  }

  return _db;
}

module.exports = { getDb };
