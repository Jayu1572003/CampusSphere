const express = require('express');
const router = express.Router();
const { authenticate, adminOnly } = require('../middleware/auth');

router.get('/', authenticate, (req, res) => {
  try {
    const db = req.app.locals.db;
    const { student_id, course_id, semester, exam_type } = req.query;
    let conds = ['1=1']; const p = [];
    if (req.user.role === 'student') { conds.push('r.student_id = ?'); p.push(req.user.student_id); }
    else if (student_id) { conds.push('r.student_id = ?'); p.push(student_id); }
    if (course_id) { conds.push('r.course_id = ?'); p.push(course_id); }
    if (semester) { conds.push('r.semester = ?'); p.push(semester); }
    if (exam_type) { conds.push('r.exam_type = ?'); p.push(exam_type); }
    res.json(db.prepare(`SELECT r.*, s.first_name, s.last_name, s.student_number, c.course_name, c.course_code
      FROM results r JOIN students s ON r.student_id=s.id JOIN courses c ON r.course_id=c.id
      WHERE ${conds.join(' AND ')} ORDER BY r.semester, c.course_code`).all(...p));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/gpa/:studentId', authenticate, (req, res) => {
  try {
    const db = req.app.locals.db;
    const { studentId } = req.params;
    if (req.user.role === 'student' && req.user.student_id !== parseInt(studentId)) return res.status(403).json({ error: 'Access denied.' });
    const semester_gpa = db.prepare(`SELECT r.semester,
      ROUND(AVG(r.marks_obtained/r.max_marks*10),2) as gpa, COUNT(*) as courses
      FROM results r WHERE r.student_id=? AND r.exam_type='final' GROUP BY r.semester ORDER BY r.semester`).all(studentId);
    const overall = db.prepare("SELECT ROUND(AVG(marks_obtained/max_marks*10),2) as cgpa FROM results WHERE student_id=? AND exam_type='final'").get(studentId);
    res.json({ semester_gpa, cgpa: overall?.cgpa || 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, adminOnly, (req, res) => {
  try {
    const db = req.app.locals.db;
    const { student_id, course_id, semester, marks_obtained, max_marks, grade, exam_type } = req.body;
    if (!student_id || !course_id || !semester) return res.status(400).json({ error: 'student_id, course_id, semester required.' });
    const marks = marks_obtained || 0; const max = max_marks || 100;
    const pct = (marks / max) * 100;
    const autoGrade = grade || (pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : 'F');
    const r = db.prepare('INSERT INTO results (student_id,course_id,semester,marks_obtained,max_marks,grade,exam_type) VALUES (?,?,?,?,?,?,?)')
      .run(student_id, course_id, semester, marks, max, autoGrade, exam_type || 'final');
    res.status(201).json(db.prepare('SELECT * FROM results WHERE id=?').get(r.lastInsertRowid));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, adminOnly, (req, res) => {
  try {
    const db = req.app.locals.db;
    const existing = db.prepare('SELECT * FROM results WHERE id=?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found.' });
    const marks = req.body.marks_obtained ?? existing.marks_obtained;
    const max = req.body.max_marks ?? existing.max_marks;
    const pct = (marks / max) * 100;
    const autoGrade = req.body.grade || (pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : 'F');
    db.prepare('UPDATE results SET marks_obtained=?,max_marks=?,grade=?,exam_type=? WHERE id=?')
      .run(marks, max, autoGrade, req.body.exam_type || existing.exam_type, req.params.id);
    res.json(db.prepare('SELECT * FROM results WHERE id=?').get(req.params.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, adminOnly, (req, res) => {
  req.app.locals.db.prepare('DELETE FROM results WHERE id=?').run(req.params.id);
  res.json({ message: 'Deleted.' });
});

module.exports = router;
