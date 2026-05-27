const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

router.get('/stats', authenticate, (req, res) => {
  try {
    const db = req.app.locals.db;
    if (req.user.role === 'admin') {
      const totalStudents = db.prepare("SELECT COUNT(*) as c FROM students").get()?.c || 0;
      const activeStudents = db.prepare("SELECT COUNT(*) as c FROM students WHERE status='active'").get()?.c || 0;
      const totalCourses = db.prepare("SELECT COUNT(*) as c FROM courses").get()?.c || 0;
      const pendingFees = db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM fees WHERE status='pending'").get()?.t || 0;
      const paidFees = db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM fees WHERE status='paid'").get()?.t || 0;
      const recentStudents = db.prepare("SELECT * FROM students ORDER BY created_at DESC LIMIT 5").all();
      const feeStatus = db.prepare("SELECT status, COUNT(*) as count, SUM(amount) as total FROM fees GROUP BY status").all();
      const programDist = db.prepare("SELECT program, COUNT(*) as count FROM students GROUP BY program ORDER BY count DESC LIMIT 8").all();
      const notifications = db.prepare("SELECT COUNT(*) as c FROM notifications WHERE is_active=1").get()?.c || 0;
      const totalAttendance = db.prepare("SELECT COUNT(*) as c FROM attendance").get()?.c || 0;
      const presentCount = db.prepare("SELECT COUNT(*) as c FROM attendance WHERE status='present'").get()?.c || 0;
      const attendancePct = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;
      res.json({ totalStudents, activeStudents, totalCourses, pendingFees, paidFees, recentStudents, feeStatus, programDist, notifications, attendancePct });
    } else {
      const sid = req.user.student_id;
      const student = db.prepare('SELECT * FROM students WHERE id=?').get(sid);
      const feesSummary = db.prepare("SELECT status, SUM(amount) as total, COUNT(*) as count FROM fees WHERE student_id=? GROUP BY status").all(sid);
      const attTotal = db.prepare("SELECT COUNT(*) as c FROM attendance WHERE student_id=?").get(sid)?.c || 0;
      const attPresent = db.prepare("SELECT COUNT(*) as c FROM attendance WHERE student_id=? AND status='present'").get(sid)?.c || 0;
      const attPct = attTotal > 0 ? Math.round(((attPresent) / attTotal) * 100) : 0;
      const cgpa = db.prepare("SELECT ROUND(AVG(marks_obtained/max_marks*10),2) as cgpa FROM results WHERE student_id=? AND exam_type='final'").get(sid);
      const recentResults = db.prepare(`SELECT r.*,c.course_name,c.course_code FROM results r JOIN courses c ON r.course_id=c.id WHERE r.student_id=? ORDER BY r.created_at DESC LIMIT 5`).all(sid);
      const notifications = db.prepare("SELECT * FROM notifications WHERE is_active=1 AND target_role IN ('all','student') ORDER BY created_at DESC LIMIT 5").all();
      const pendingFees = db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM fees WHERE student_id=? AND status='pending'").get(sid)?.t || 0;
      res.json({ student, feesSummary, attPct, attTotal, cgpa: cgpa?.cgpa || 0, recentResults, notifications, pendingFees });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
