const express = require('express');
const cors = require('cors');
const db = require('./db');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true
}));

app.options('*', cors());
app.use(express.json());

// Log incoming requests for debugging in Vercel
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});
// Serve uploaded files if any (optional for now)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const classroomRoutes = require('./routes/classrooms');
const seatingRoutes = require('./routes/seating');

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/seating', seatingRoutes);
app.use('/api/invigilators', require('./routes/invigilators'));

// Aliases in case the frontend misses the /api suffix in VITE_API_URL
app.use('/auth', authRoutes);
app.use('/students', studentRoutes);
app.use('/classrooms', classroomRoutes);
app.use('/seating', seatingRoutes);
app.use('/invigilators', require('./routes/invigilators'));

// Fix for pinging /api directly
app.get('/api', (req, res) => {
    res.send('API is running');
});

app.get('/', (req, res) => {
    res.json({
        message: 'Exam Seating System API is running',
        endpoints: ['/api/auth/login', '/api/students', '/api/classrooms', '/api/seating', '/api/invigilators']
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = app;
