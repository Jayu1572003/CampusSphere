const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

router.post('/login', (req, res) => {
  try {
    const db = req.app.locals.db;
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) return res.status(401).json({ error: 'Invalid credentials.' });

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });

    let studentInfo = null;
    if (user.role === 'student' && user.student_id) {
      studentInfo = db.prepare('SELECT * FROM students WHERE id = ?').get(user.student_id);
    }

    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      student_id: user.student_id || null,
      student_number: studentInfo ? studentInfo.student_number : null,
      name: studentInfo ? `${studentInfo.first_name} ${studentInfo.last_name}` : 'Administrator',
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: payload });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/me', require('../middleware/auth').authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
