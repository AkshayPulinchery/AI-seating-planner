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
            console.log("CSV Headers detected:", Object.keys(results[0] || {}));

            const stmt = db.prepare("INSERT OR IGNORE INTO students (name, registerNumber, examCode) VALUES (?, ?, ?)");
            let insertedCheck = 0;
            let failedRows = 0;

            db.serialize(() => {
                db.run("BEGIN TRANSACTION");
                results.forEach((row, index) => {
                    // normalize keys to lowercase and remove whitespace/BOM
                    const normalizedRow = {};
                    Object.keys(row).forEach(key => {
                        const cleanKey = key.trim().toLowerCase().replace(/^\ufeff/, '');
                        normalizedRow[cleanKey] = row[key];
                    });

                    // console.log(`Row ${index}:`, normalizedRow);

                    // Map possible header names
                    const name = normalizedRow['name'] || normalizedRow['student name'] || normalizedRow['studentname'];
                    const regNo = normalizedRow['registernumber'] || normalizedRow['register number'] || normalizedRow['regno'] || normalizedRow['register no'];
                    const exam = normalizedRow['examcode'] || normalizedRow['exam code'] || normalizedRow['subjectcode'];

                    if (name && regNo && exam) {
                        stmt.run(name, regNo, exam);
                        insertedCheck++;
                    } else {
                        failedRows++;
                        console.log(`Skipping Row ${index} due to missing fields:`, { name, regNo, exam, raw: row });
                    }
                });
                db.run("COMMIT");
                stmt.finalize();
            });

            // Clean up file
            fs.unlinkSync(req.file.path);
            res.json({
                message: `Processed ${results.length} rows. Successfully added ${insertedCheck} students. Skipped ${failedRows}.`,
                inserted: insertedCheck,
                total: results.length,
                skipped: failedRows
            });
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
