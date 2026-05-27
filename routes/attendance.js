const express = require('express');
const router = express.Router();
const { authenticate, adminOnly } = require('../middleware/auth');

router.get('/', authenticate, (req, res) => {
  try {
    const db = req.app.locals.db;
    const { student_id, course_id, date, month } = req.query;
    let conds = ['1=1']; const p = [];
    if (req.user.role === 'student') { conds.push('a.student_id = ?'); p.push(req.user.student_id); }
    else if (student_id) { conds.push('a.student_id = ?'); p.push(student_id); }
    if (course_id) { conds.push('a.course_id = ?'); p.push(course_id); }
    if (date) { conds.push('a.date = ?'); p.push(date); }
    if (month) { conds.push("strftime('%Y-%m', a.date) = ?"); p.push(month); }
    const sql = `SELECT a.*, s.first_name, s.last_name, s.student_number, c.course_name, c.course_code
      FROM attendance a JOIN students s ON a.student_id=s.id JOIN courses c ON a.course_id=c.id
      WHERE ${conds.join(' AND ')} ORDER BY a.date DESC`;
    res.json(db.prepare(sql).all(...p));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/summary/:studentId', authenticate, (req, res) => {
  try {
    const db = req.app.locals.db;
    const { studentId } = req.params;
    if (req.user.role === 'student' && req.user.student_id !== parseInt(studentId)) return res.status(403).json({ error: 'Access denied.' });
    const summary = db.prepare(`
      SELECT c.course_name, c.course_code, c.id as course_id,
        COUNT(*) as total_classes,
        SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN a.status='absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN a.status='late' THEN 1 ELSE 0 END) as late,
        ROUND(100.0*SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END)/COUNT(*),1) as percentage
      FROM attendance a JOIN courses c ON a.course_id=c.id
      WHERE a.student_id=? GROUP BY a.course_id
    `).all(studentId);
    res.json(summary);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, adminOnly, (req, res) => {
  try {
    const db = req.app.locals.db;
    const { records } = req.body;
    if (!records || !records.length) return res.status(400).json({ error: 'records array required.' });
    let count = 0;
    for (const r of records) {
      try {
        db.prepare('INSERT OR REPLACE INTO attendance (student_id,course_id,date,status,remarks) VALUES (?,?,?,?,?)').run(r.student_id, r.course_id, r.date, r.status, r.remarks || null);
        count++;
      } catch(e) {}
    }
    res.status(201).json({ message: `${count} records saved.` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, adminOnly, (req, res) => {
  try {
    const db = req.app.locals.db;
    const { status, remarks } = req.body;
    db.prepare('UPDATE attendance SET status=?, remarks=? WHERE id=?').run(status, remarks || null, req.params.id);
    res.json(db.prepare('SELECT * FROM attendance WHERE id=?').get(req.params.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, adminOnly, (req, res) => {
  req.app.locals.db.prepare('DELETE FROM attendance WHERE id=?').run(req.params.id);
  res.json({ message: 'Deleted.' });
});

module.exports = router;
