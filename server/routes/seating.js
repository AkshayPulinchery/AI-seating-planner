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
            s.roomId,
            c.roomName, 
            s.benchNumber,
            stu1.name as student1Name, stu1.registerNumber as student1Reg, stu1.examCode as student1Exam,
            stu2.name as student2Name, stu2.registerNumber as student2Reg, stu2.examCode as student2Exam,
            i1.name as invigilator1,
            i2.name as invigilator2,
            ra.invigilator1Id,
            ra.invigilator2Id
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

// Manually assign an invigilator to a room
router.post('/manual-assign', async (req, res) => {
    const { roomId, invigilator1Id, invigilator2Id } = req.body;

    try {
        // First delete any existing assignment for this room
        await new Promise((resolve, reject) => {
            db.run("DELETE FROM room_assignments WHERE roomId = $1", [roomId], (err) => {
                if (err) reject(err); else resolve();
            });
        });

        // Insert manual override
        await new Promise((resolve, reject) => {
            db.run(
                "INSERT INTO room_assignments (roomId, invigilator1Id, invigilator2Id, isManual) VALUES ($1, $2, $3, true)",
                [roomId, invigilator1Id || null, invigilator2Id || null],
                (err) => { if (err) reject(err); else resolve(); }
            );
        });

        // Trigger auto-allocation to fill around it
        const result = await generateSeating();

        res.json({ message: 'Manual assignment saved successfully', allocation: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
