const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');
const { generateSeating } = require('../utils/allocation');

const upload = multer({ storage: multer.memoryStorage() });

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
    db.run("INSERT INTO invigilators (name, email) VALUES ($1, $2) RETURNING id", [name, email], function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ id: this.lastID, name, email });
        // Auto-generate seating in background
        generateSeating().catch(err => console.error("Auto-allocation failed:", err));
    });
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

                    const name = normalizedRow['name'] || normalizedRow['invigilatorname'] || normalizedRow['fullname'];
                    const email = normalizedRow['email'] || normalizedRow['emailaddress'] || '';

                    if (name) {
                        try {
                            await client.query("INSERT INTO invigilators (name, email) VALUES ($1, $2)", [name, email]);
                            insertedCheck++;
                        } catch (err) {
                            console.error("Row insert error", err);
                            failedRows++;
                        }
                    } else {
                        failedRows++;
                        console.log(`Skipping Row ${i} due to missing fields:`, { name, email, raw: row });
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
                message: `Processed ${results.length} rows. Attempted ${insertedCheck} invigilators. Skipped ${failedRows}.`,
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

// Bulk delete invigilators
router.post('/delete-bulk', (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'Invalid IDs' });
    }
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    db.run(`DELETE FROM invigilators WHERE id IN (${placeholders})`, ids, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted', changes: this.changes });
        if (this.changes > 0) generateSeating().catch(err => console.error("Auto-allocation failed:", err));
    });
});

// Delete invigilator
router.delete('/:id', (req, res) => {
    db.run("DELETE FROM invigilators WHERE id = $1", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted' });
        if (this.changes > 0) generateSeating().catch(err => console.error("Auto-allocation failed:", err));
    });
});

// Toggle Availability
router.put('/:id/availability', (req, res) => {
    const { isAvailable } = req.body;
    db.run("UPDATE invigilators SET isAvailable = $1 WHERE id = $2", [isAvailable ? true : false, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Updated successfully' });
        // Auto-generate seating in background due to availability change
        generateSeating().catch(err => console.error("Auto-allocation failed:", err));
    });
});

module.exports = router;
