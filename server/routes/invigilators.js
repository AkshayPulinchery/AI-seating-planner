const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all invigilators
router.get('/', (req, res) => {
    db.all("SELECT * FROM invigilators", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Add invigilator
router.post('/', (req, res) => {
    const { name, email } = req.body;
    db.run("INSERT INTO invigilators (name, email) VALUES (?, ?)", [name, email], function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ id: this.lastID, name, email });
    });
});

// Delete invigilator
router.delete('/:id', (req, res) => {
    db.run("DELETE FROM invigilators WHERE id = ?", req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted' });
    });
});

module.exports = router;
