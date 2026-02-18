const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

const upload = multer({ dest: 'uploads/' });

// Get all students
router.get('/', (req, res) => {
    db.all("SELECT * FROM students", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Add single student
router.post('/', (req, res) => {
    const { name, registerNumber, examCode } = req.body;
    db.run("INSERT INTO students (name, registerNumber, examCode) VALUES (?, ?, ?)",
        [name, registerNumber, examCode],
        function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ id: this.lastID, name, registerNumber, examCode });
        }
    );
});

// Upload CSV
router.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const results = [];
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
            // Processing CSV data
            // Expected headers: Name, RegisterNumber, ExamCode (case sensitive handling needed?)
            // Let's assume headers are correct or map them.

            const stmt = db.prepare("INSERT OR IGNORE INTO students (name, registerNumber, examCode) VALUES (?, ?, ?)");
            let insertedCheck = 0;

            db.serialize(() => {
                db.run("BEGIN TRANSACTION");
                results.forEach(row => {
                    // Adapt keys to match what might be in CSV (e.g. "Student Name", "Register No")
                    // For MVP assume keys match exactly or are simple.
                    // Let's look for common variations or just expect standard keys.
                    const name = row['Name'] || row['name'] || row['Student Name'];
                    const regNo = row['RegisterNumber'] || row['registerNumber'] || row['Register Number'];
                    const exam = row['ExamCode'] || row['examCode'] || row['Exam Code'];

                    if (name && regNo && exam) {
                        stmt.run(name, regNo, exam);
                        insertedCheck++;
                    }
                });
                db.run("COMMIT");
                stmt.finalize();
            });

            // Clean up file
            fs.unlinkSync(req.file.path);
            res.json({ message: `Processed ${results.length} rows.` });
        })
        .on('error', (err) => {
            res.status(500).json({ error: err.message });
        });
});

// Delete student
router.delete('/:id', (req, res) => {
    db.run("DELETE FROM students WHERE id = ?", req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted', changes: this.changes });
    });
});

module.exports = router;
