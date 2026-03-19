let app;

try {
    const express = require('express');
    const cors = require('cors');
    const path = require('path');

    app = express();
    const PORT = process.env.PORT || 5000;

    app.use(cors({
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
        credentials: true
    }));

    // Handle CORS preflight for all routes (Express 5 compatible)
    app.use((req, res, next) => {
        if (req.method === 'OPTIONS') {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
            return res.sendStatus(204);
        }
        next();
    });
    app.use(express.json());

    // Log incoming requests for debugging in Vercel
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.url}`);
        next();
    });

    // Health check (put this BEFORE db-dependent routes so we can tell if Express itself works)
    app.get('/', (req, res) => {
        res.json({
            message: 'Exam Seating System API is running',
            node_version: process.version,
            env_check: !!process.env.DATABASE_URL ? 'DATABASE_URL is set' : 'DATABASE_URL is MISSING',
            endpoints: ['/api/auth/login', '/api/students', '/api/classrooms', '/api/seating', '/api/invigilators']
        });
    });

    app.get('/api', (req, res) => {
        res.send('API is running');
    });

    // Now load DB-dependent routes
    const db = require('../db');
    const authRoutes = require('../routes/auth');
    const studentRoutes = require('../routes/students');
    const classroomRoutes = require('../routes/classrooms');
    const seatingRoutes = require('../routes/seating');
    const invigilatorRoutes = require('../routes/invigilators');

    app.use('/api/auth', authRoutes);
    app.use('/api/students', studentRoutes);
    app.use('/api/classrooms', classroomRoutes);
    app.use('/api/seating', seatingRoutes);
    app.use('/api/invigilators', invigilatorRoutes);

    // Aliases
    app.use('/auth', authRoutes);
    app.use('/students', studentRoutes);
    app.use('/classrooms', classroomRoutes);
    app.use('/seating', seatingRoutes);
    app.use('/invigilators', invigilatorRoutes);

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

} catch (e) {
    // If anything crashes during startup, expose the error as an endpoint
    console.error('FATAL STARTUP ERROR:', e);
    const express = require('express');
    app = express();
    app.use((req, res) => {
        res.status(500).json({
            error: 'Server failed to start',
            message: e.message,
            stack: e.stack
        });
    });
}

module.exports = app;
