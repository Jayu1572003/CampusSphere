const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDb } = require('./database/db');

async function startServer() {
  // Initialize DB first
  const db = await getDb();
  
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, 'public')));

  // Attach db to app for routes to use
  app.locals.db = db;

  // API Routes
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/students', require('./routes/students'));
  app.use('/api/courses', require('./routes/courses'));
  app.use('/api/attendance', require('./routes/attendance'));
  app.use('/api/fees', require('./routes/fees'));
  app.use('/api/results', require('./routes/results'));
  app.use('/api/notifications', require('./routes/notifications'));
  app.use('/api/dashboard', require('./routes/dashboard'));

  // Serve frontend for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
      res.status(404).json({ error: 'API endpoint not found' });
    }
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\n🎓 CampusSphere`);
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`📚 Admin:   username=admin      password=admin123`);
    console.log(`🎒 Student: username=STU2024001  password=student123\n`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
