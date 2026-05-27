const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { authenticate, adminOnly } = require('../middleware/auth');

router.get('/', authenticate, (req, res) => {
  try {
    const db = req.app.locals.db;
    const { search, program, batch, semester, status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let conditions = ['1=1'];
    const params = [];

    if (req.user.role === 'student') {
      conditions.push('id = ?'); params.push(req.user.student_id);
    } else {
      if (search) {
        conditions.push('(first_name LIKE ? OR last_name LIKE ? OR student_number LIKE ? OR email LIKE ?)');
        const s = `%${search}%`; params.push(s, s, s, s);
      }
      if (program) { conditions.push('program = ?'); params.push(program); }
      if (batch) { conditions.push('batch = ?'); params.push(batch); }
      if (semester) { conditions.push('semester = ?'); params.push(semester); }
      if (status) { conditions.push('status = ?'); params.push(status); }
    }

    const where = 'WHERE ' + conditions.join(' AND ');
    const students = db.prepare(`SELECT * FROM students ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, parseInt(limit), offset);
    const total = db.prepare(`SELECT COUNT(*) as c FROM students ${where}`).get(...params)?.c || 0;
    res.json({ students, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, (req, res) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;
    if (req.user.role === 'student' && req.user.student_id !== parseInt(id)) return res.status(403).json({ error: 'Access denied.' });
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
    if (!student) return res.status(404).json({ error: 'Student not found.' });
    res.json(student);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, adminOnly, (req, res) => {
  try {
    const db = req.app.locals.db;
    const { student_number, first_name, last_name, email, phone, date_of_birth, gender, address, program, batch, semester, password } = req.body;
    if (!student_number || !first_name || !last_name || !email || !program) {
      return res.status(400).json({ error: 'student_number, first_name, last_name, email, program are required.' });
    }
    const exists = db.prepare('SELECT id FROM students WHERE student_number = ? OR email = ?').get(student_number, email);
    if (exists) return res.status(409).json({ error: 'Student number or email already exists.' });

    const result = db.prepare('INSERT INTO students (student_number,first_name,last_name,email,phone,date_of_birth,gender,address,program,batch,semester) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
      .run(student_number, first_name, last_name, email, phone || null, date_of_birth || null, gender || null, address || null, program, batch || null, semester || 1);
    
    const hash = bcrypt.hashSync(password || 'student123', 10);
    db.prepare('INSERT INTO users (username,password_hash,role,student_id) VALUES (?,?,?,?)').run(student_number, hash, 'student', result.lastInsertRowid);

    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Student registered successfully.', student });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, (req, res) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;
    if (req.user.role === 'student' && req.user.student_id !== parseInt(id)) return res.status(403).json({ error: 'Access denied.' });
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    const allowed = ['first_name', 'last_name', 'email', 'phone', 'date_of_birth', 'gender', 'address', 'program', 'batch', 'semester'];
    if (req.user.role === 'admin') allowed.push('student_number', 'status');
    const updates = []; const values = [];
    allowed.forEach(f => { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); } });
    if (!updates.length) return res.status(400).json({ error: 'No valid fields to update.' });
    values.push(id);
    db.prepare(`UPDATE students SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    res.json({ message: 'Student updated.', student: db.prepare('SELECT * FROM students WHERE id = ?').get(id) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, adminOnly, (req, res) => {
  try {
    const db = req.app.locals.db;
    if (!db.prepare('SELECT id FROM students WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Student not found.' });
    db.prepare('DELETE FROM users WHERE student_id = ?').run(req.params.id);
    db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);
    res.json({ message: 'Student deleted.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
