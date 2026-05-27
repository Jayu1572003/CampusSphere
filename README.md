# 🎓 CampusSphere - Next-Gen Student Management System

CampusSphere is a modern, responsive, and feature-rich **Student Management System** designed for educational institutions. It features a rich, glassmorphic UI, support for both **Admin** and **Student** portals, role-based access control, real-time analytics, and a theme toggle system (Dark/Light mode).

The application is built using a modern **Node.js/Express** backend and a **Vanilla HTML/CSS/JS** frontend, utilizing **sql.js** (SQLite running in WebAssembly) for robust, file-persisted data storage without requiring external database setup.

---

## ✨ Features

### 👤 Role-Based Access Control (RBAC)
*   **Admin Portal**: Complete administrative command center.
*   **Student Portal**: Self-service portal for students to track their academic progress.
*   **JWT-Based Authentication**: Secure stateless session management with bcrypt-hashed passwords.

### 🛠️ Admin Features
*   **Analytics Dashboard**: Visual overview of student counts, course counts, attendance percentages, and fee collections.
*   **Student Management**: Add, update, view, and delete student profiles (personal info, program, batch, semester, status).
*   **Course Management**: Manage curriculum, course codes, credits, and instructors.
*   **Attendance Tracking**: Mark and monitor daily attendance (present, absent, late) for any student and course.
*   **Grade Book (Results)**: Input and update exam grades (Midterm & Final examinations).
*   **Fee Management**: Track tuition, hostel, and library fee payments; mark status as paid, pending, or overdue.
*   **Broadcast Announcements**: Create system-wide announcements with targets (All, Students, or Admins).

### 🎒 Student Features
*   **Personal Dashboard**: View GPA, attendance rate, total outstanding fees, and recent notifications.
*   **My Grades**: View scores and letter grades for Midterm and Final examinations.
*   **Attendance Records**: Check attendance history and status across enrolled subjects.
*   **Fees & Receipts**: Access payment invoices and transaction receipts.
*   **System Notifications**: Read direct alerts and announcements from administration.

### 🎨 Modern UI & UX
*   **Glassmorphic Design**: Curated, harmonious color palettes with interactive 3D parallax effects on the login screen.
*   **Dark/Light Mode**: Smooth theme transition that persists in `LocalStorage`.
*   **Responsive Layout**: Fully optimized for mobile, tablet, and desktop screens.
*   **Toast Notifications**: Real-time interactive feedback on user actions.

---

## 🛠️ Tech Stack

*   **Frontend**: Vanilla HTML5, CSS3 (using CSS Variables for theme management), Vanilla ES6 JavaScript (using async/await API fetches).
*   **Backend**: Node.js, Express.js.
*   **Database**: `sql.js` (WebAssembly SQLite DB, auto-saved to disk at `database/sms.db`).
*   **Security**: JSON Web Tokens (JWT) for authentication, `bcryptjs` for password hashing.
*   **Dev Utilities**: `nodemon` for hot-reloading development environment.

---

## 📂 Project Structure

```text
├── database/             # SQLite DB and setup script
│   ├── db.js             # sql.js wrapper, schema creation, & seeding logic
│   └── sms.db            # Auto-generated database file (created on first run)
├── middleware/           # Express middleware
│   └── auth.js           # JWT authorization verification
├── public/               # Frontend static assets
│   ├── admin/            # Admin HTML templates (dashboard, students, courses, etc.)
│   ├── student/          # Student HTML templates (dashboard, grades, fees, etc.)
│   ├── css/              # Main stylesheet and theme configuration
│   ├── js/               # Shared app logic, API wrappers, and page scripts
│   └── index.html        # Main Login page
├── routes/               # API endpoints
│   ├── auth.js           # Auth routes (/api/auth)
│   ├── dashboard.js      # Statistics and dashboard data
│   ├── students.js       # Student CRUD
│   ├── courses.js        # Course CRUD
│   ├── attendance.js     # Attendance routes
│   ├── fees.js           # Payment/Fee routes
│   ├── results.js        # Exam grades routes
│   └── notifications.js  # Announcement routes
├── server.js             # Main Express server entry point
├── package.json          # Node dependencies and npm scripts
└── README.md             # Project documentation (this file)
```

---

## 🚀 Quick Start

### 📋 Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (v16.x or higher is recommended).

### 🔧 Installation

1. Clone or extract the repository:
   ```bash
   cd "Student Management System"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### 💻 Running the Application

*   **Development Mode** (with auto-reload):
    ```bash
    npm run dev
    ```

*   **Production Mode**:
    ```bash
    npm start
    ```

Once started, the application will seed a demo database (if it doesn't already exist) and run at:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🔑 Demo Credentials

To test the application out of the box, use the following pre-seeded credentials:

| Portal | Username / ID | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Full access to manage students, courses, fees, attendance, grades, and notifications |
| **Student** | `STU2024001` | `student123` | Access to student profile, dashboard, grades, attendance logs, and fees |

---

## 📡 API Reference Summary

All API endpoints are protected and require a `Bearer <token>` in the `Authorization` header, except for public login.

### Authentication
*   `POST /api/auth/login` - Login and get JWT token.

### Admin & Student Services
*   `GET /api/dashboard/stats` - Retrieve stats/metrics (filtered depending on role).
*   `GET /api/students` | `POST /api/students` | `PUT /api/students/:id` | `DELETE /api/students/:id` - Manage student records.
*   `GET /api/courses` | `POST /api/courses` | `PUT /api/courses/:id` | `DELETE /api/courses/:id` - Manage courses.
*   `GET /api/attendance` | `POST /api/attendance` - Record/view attendance.
*   `GET /api/fees` | `POST /api/fees/pay` - Track fee details and post payments.
*   `GET /api/results` | `POST /api/results` - Retrieve or input midterm/final grades.
*   `GET /api/notifications` | `POST /api/notifications` - View/broadcast system notifications.

---

## 📝 License
This project is open-source and available under the [MIT License](LICENSE).
