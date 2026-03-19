const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');
const { generateSeating } = require('../utils/allocation');

const upload = multer({ storage: multer.memoryStorage() });

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
    db.run("INSERT INTO students (name, registerNumber, examCode) VALUES ($1, $2, $3) RETURNING id",
        [name, registerNumber, examCode],
        function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ id: this.lastID, name, registerNumber, examCode });
            // Auto-generate seating in background
            generateSeating().catch(err => console.error("Auto-allocation failed:", err));
        }
    );
});

// Upload CSV
router.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const results = [];
    const bufferStream = new Readable();
    bufferStream.push(req.file.buffer);
    bufferStream.push(null);
    bufferStream
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            console.log("CSV Headers detected:", Object.keys(results[0] || {}));

            let insertedCheck = 0;
            let failedRows = 0;
            const client = await db.pool.connect();

            try {
                await client.query("BEGIN");
                for (let i = 0; i < results.length; i++) {
                    const row = results[i];
                    const normalizedRow = {};
                    Object.keys(row).forEach(key => {
                        const cleanKey = key.trim().toLowerCase().replace(/^\ufeff/, '');
                        normalizedRow[cleanKey] = row[key];
                    });

                    const name = normalizedRow['name'] || normalizedRow['student name'] || normalizedRow['studentname'];
                    const regNo = normalizedRow['registernumber'] || normalizedRow['register number'] || normalizedRow['regno'] || normalizedRow['register no'];
                    const exam = normalizedRow['examcode'] || normalizedRow['exam code'] || normalizedRow['subjectcode'];

                    if (name && regNo && exam) {
                        try {
                            await client.query("INSERT INTO students (name, registerNumber, examCode) VALUES ($1, $2, $3) ON CONFLICT (registerNumber) DO NOTHING", [name, regNo, exam]);
                            insertedCheck++;
                        } catch (err) {
                            console.error("Row insert error", err);
                            failedRows++;
                        }
                    } else {
                        failedRows++;
                        console.log(`Skipping Row ${i} due to missing fields:`, { name, regNo, exam, raw: row });
                    }
                }
                await client.query("COMMIT");
            } catch (err) {
                await client.query("ROLLBACK");
                console.error("Bulk upload transaction failed:", err);
            } finally {
                client.release();
            }


            res.json({
                message: `Processed ${results.length} rows. Attempted ${insertedCheck} students. Skipped ${failedRows}.`,
                inserted: insertedCheck,
                total: results.length,
                skipped: failedRows
            });
            // Auto-generate seating in background
            if (insertedCheck > 0) {
                generateSeating().catch(err => console.error("Auto-allocation failed:", err));
            }
        })
        .on('error', (err) => {
            res.status(500).json({ error: err.message });
        });
});

// Bulk delete students
router.post('/delete-bulk', (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'Invalid IDs' });
    }
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    db.run(`DELETE FROM students WHERE id IN (${placeholders})`, ids, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted', changes: this.changes });
        // Auto-generate seating in background
        if (this.changes > 0) generateSeating().catch(err => console.error("Auto-allocation failed:", err));
    });
});

// Delete student
router.delete('/:id', (req, res) => {
    db.run("DELETE FROM students WHERE id = $1", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted', changes: this.changes });
        // Auto-generate seating in background
        if (this.changes > 0) generateSeating().catch(err => console.error("Auto-allocation failed:", err));
    });
});

module.exports = router;
