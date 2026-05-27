const express = require('express');
const router = express.Router();
const { authenticate, adminOnly } = require('../middleware/auth');

router.get('/', authenticate, (req, res) => {
  try {
    const db = req.app.locals.db;
    let q = "SELECT * FROM notifications WHERE is_active=1";
    if (req.user.role === 'student') q += " AND target_role IN ('all','student')";
    q += " ORDER BY created_at DESC LIMIT 50";
    res.json(db.prepare(q).all());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, adminOnly, (req, res) => {
  try {
    const db = req.app.locals.db;
    const { title, message, type, target_role } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'title and message required.' });
    const r = db.prepare('INSERT INTO notifications (title,message,type,target_role) VALUES (?,?,?,?)')
      .run(title, message, type || 'info', target_role || 'all');
    res.status(201).json(db.prepare('SELECT * FROM notifications WHERE id=?').get(r.lastInsertRowid));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, adminOnly, (req, res) => {
  try {
    const db = req.app.locals.db;
    const n = db.prepare('SELECT * FROM notifications WHERE id=?').get(req.params.id);
    if (!n) return res.status(404).json({ error: 'Not found.' });
    const { title, message, type, target_role, is_active } = req.body;
    db.prepare('UPDATE notifications SET title=?,message=?,type=?,target_role=?,is_active=? WHERE id=?')
      .run(title || n.title, message || n.message, type || n.type, target_role || n.target_role, is_active !== undefined ? is_active : n.is_active, req.params.id);
    res.json(db.prepare('SELECT * FROM notifications WHERE id=?').get(req.params.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, adminOnly, (req, res) => {
  req.app.locals.db.prepare('DELETE FROM notifications WHERE id=?').run(req.params.id);
  res.json({ message: 'Deleted.' });
});

module.exports = router;
