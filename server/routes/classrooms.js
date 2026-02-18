const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all classrooms
router.get('/', (req, res) => {
    db.all("SELECT * FROM classrooms", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Add classroom
router.post('/', (req, res) => {
    const { roomName, benchCount } = req.body;
    db.run("INSERT INTO classrooms (roomName, benchCount) VALUES (?, ?)",
        [roomName, benchCount],
        function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ id: this.lastID, roomName, benchCount });
        }
    );
});

// Delete classroom
router.delete('/:id', (req, res) => {
    db.run("DELETE FROM classrooms WHERE id = ?", req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted', changes: this.changes });
    });
});

module.exports = router;
