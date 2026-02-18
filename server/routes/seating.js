const express = require('express');
const router = express.Router();
const db = require('../db');
const { generateSeating } = require('../utils/allocation');

// Generate seating
router.post('/generate', async (req, res) => {
    try {
        const result = await generateSeating();
        res.json({ message: 'Seating generated successfully', ...result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get seating with details
router.get('/', (req, res) => {
    const sql = `
        SELECT 
            s.id, 
            c.roomName, 
            s.benchNumber,
            stu1.name as student1Name, stu1.registerNumber as student1Reg, stu1.examCode as student1Exam,
            stu2.name as student2Name, stu2.registerNumber as student2Reg, stu2.examCode as student2Exam,
            i1.name as invigilator1,
            i2.name as invigilator2
        FROM seating s
        JOIN classrooms c ON s.roomId = c.id
        LEFT JOIN students stu1 ON s.student1Id = stu1.id
        LEFT JOIN students stu2 ON s.student2Id = stu2.id
        LEFT JOIN room_assignments ra ON s.roomId = ra.roomId
        LEFT JOIN invigilators i1 ON ra.invigilator1Id = i1.id
        LEFT JOIN invigilators i2 ON ra.invigilator2Id = i2.id
        ORDER BY c.roomName, s.benchNumber
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

module.exports = router;
