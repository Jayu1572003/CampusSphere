const express = require('express');
const router = express.Router();
const { authenticate, adminOnly } = require('../middleware/auth');

router.get('/', authenticate, (req, res) => {
  try {
    const db = req.app.locals.db;
    const { program, semester } = req.query;
    let conds = ['1=1']; const p = [];
    if (program) { conds.push('program = ?'); p.push(program); }
    if (semester) { conds.push('semester = ?'); p.push(semester); }
    res.json(db.prepare(`SELECT * FROM courses WHERE ${conds.join(' AND ')} ORDER BY course_code`).all(...p));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, (req, res) => {
  const db = req.app.locals.db;
  const c = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Course not found.' });
  res.json(c);
});

router.post('/', authenticate, adminOnly, (req, res) => {
  try {
    const db = req.app.locals.db;
    const { course_code, course_name, credits, semester, program, instructor } = req.body;
    if (!course_code || !course_name) return res.status(400).json({ error: 'course_code and course_name required.' });
    const r = db.prepare('INSERT INTO courses (course_code,course_name,credits,semester,program,instructor) VALUES (?,?,?,?,?,?)')
      .run(course_code, course_name, credits || 3, semester || null, program || null, instructor || null);
    res.status(201).json(db.prepare('SELECT * FROM courses WHERE id = ?').get(r.lastInsertRowid));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, adminOnly, (req, res) => {
  try {
    const db = req.app.locals.db;
    const fields = ['course_code','course_name','credits','semester','program','instructor'];
    const updates = []; const values = [];
    fields.forEach(f => { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); } });
    if (!updates.length) return res.status(400).json({ error: 'No fields to update.' });
    values.push(req.params.id);
    db.prepare(`UPDATE courses SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    res.json(db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, adminOnly, (req, res) => {
  const db = req.app.locals.db;
  if (!db.prepare('SELECT id FROM courses WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Not found.' });
  db.prepare('DELETE FROM courses WHERE id = ?').run(req.params.id);
  res.json({ message: 'Course deleted.' });
});

module.exports = router;
