const express = require('express');
const router = express.Router();
const { authenticate, adminOnly } = require('../middleware/auth');

router.get('/', authenticate, (req, res) => {
  try {
    const db = req.app.locals.db;
    const { student_id, status, semester } = req.query;
    let conds = ['1=1']; const p = [];
    if (req.user.role === 'student') { conds.push('f.student_id = ?'); p.push(req.user.student_id); }
    else if (student_id) { conds.push('f.student_id = ?'); p.push(student_id); }
    if (status) { conds.push('f.status = ?'); p.push(status); }
    if (semester) { conds.push('f.semester = ?'); p.push(semester); }
    res.json(db.prepare(`SELECT f.*, s.first_name, s.last_name, s.student_number FROM fees f JOIN students s ON f.student_id=s.id WHERE ${conds.join(' AND ')} ORDER BY f.due_date DESC`).all(...p));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/summary', authenticate, (req, res) => {
  try {
    const db = req.app.locals.db;
    const sid = req.user.role === 'student' ? req.user.student_id : req.query.student_id;
    if (!sid) {
      return res.json(db.prepare('SELECT status, COUNT(*) as count, SUM(amount) as total FROM fees GROUP BY status').all());
    }
    const records = db.prepare('SELECT * FROM fees WHERE student_id=? ORDER BY due_date DESC').all(sid);
    const totals = db.prepare(`SELECT COALESCE(SUM(CASE WHEN status='paid' THEN amount ELSE 0 END),0) as paid,
      COALESCE(SUM(CASE WHEN status='pending' THEN amount ELSE 0 END),0) as pending,
      COALESCE(SUM(amount),0) as total FROM fees WHERE student_id=?`).get(sid);
    res.json({ records, totals });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, adminOnly, (req, res) => {
  try {
    const db = req.app.locals.db;
    const { student_id, fee_type, amount, due_date, semester, remarks } = req.body;
    if (!student_id || !fee_type || !amount) return res.status(400).json({ error: 'student_id, fee_type, amount required.' });
    const r = db.prepare('INSERT INTO fees (student_id,fee_type,amount,due_date,semester,remarks) VALUES (?,?,?,?,?,?)')
      .run(student_id, fee_type, amount, due_date || null, semester || null, remarks || null);
    res.status(201).json(db.prepare('SELECT * FROM fees WHERE id=?').get(r.lastInsertRowid));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, adminOnly, (req, res) => {
  try {
    const db = req.app.locals.db;
    const fee = db.prepare('SELECT * FROM fees WHERE id=?').get(req.params.id);
    if (!fee) return res.status(404).json({ error: 'Not found.' });
    const { status, paid_date, transaction_id, remarks, amount, due_date } = req.body;
    db.prepare('UPDATE fees SET status=?, paid_date=?, transaction_id=?, remarks=?, amount=?, due_date=? WHERE id=?')
      .run(status || fee.status, paid_date || fee.paid_date, transaction_id || fee.transaction_id, remarks || fee.remarks, amount || fee.amount, due_date || fee.due_date, req.params.id);
    res.json(db.prepare('SELECT * FROM fees WHERE id=?').get(req.params.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, adminOnly, (req, res) => {
  req.app.locals.db.prepare('DELETE FROM fees WHERE id=?').run(req.params.id);
  res.json({ message: 'Deleted.' });
});

module.exports = router;
