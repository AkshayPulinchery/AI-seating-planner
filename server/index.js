const express = require('express');
const cors = require('cors');
const db = require('./db');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
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

// Fix for pinging /api directly
app.get('/api', (req, res) => {
    res.send('API is running');
});

app.get('/', (req, res) => {
    res.send('Exam Seating System API is running');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
