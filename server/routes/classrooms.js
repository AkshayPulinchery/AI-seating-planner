const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');
const { generateSeating } = require('../utils/allocation');

const upload = multer({ storage: multer.memoryStorage() });

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
    db.run("INSERT INTO classrooms (roomName, benchCount) VALUES ($1, $2) RETURNING id",
        [roomName, benchCount],
        function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ id: this.lastID, roomName, benchCount });
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

                    const name = normalizedRow['roomname'] || normalizedRow['room name'] || normalizedRow['room'] || normalizedRow['name'];
                    const benches = normalizedRow['benchcount'] || normalizedRow['bench count'] || normalizedRow['capacity'] || normalizedRow['benches'];

                    if (name && benches) {
                        try {
                            // Suppress unique constraint violations without throwing if possible
                            // BUT wait, does Postgres support ON CONFLICT without DO UPDATE? Yes, DO NOTHING.
                            // BUT wait! Does roomName have a UNIQUE constraint? In seed.js it was created with UNIQUE NOT NULL.
                            // However, we didn't specify the column type exactly in Postgres yet (we will in seed.js later). 
                            // Let's assume roomName is unique.
                            // If we don't know the exact constraint name, we can do ON CONFLICT (roomName) DO NOTHING.
                            // But actually Postgres requires the constraint explicitly. I'll make sure seed.js adds unique constraint.
                            await client.query("INSERT INTO classrooms (roomName, benchCount) VALUES ($1, $2) ON CONFLICT (roomName) DO NOTHING", [name, parseInt(benches, 10)]);
                            insertedCheck++;
                        } catch (err) {
                            console.error("Row insert error", err);
                            failedRows++;
                        }
                    } else {
                        failedRows++;
                        console.log(`Skipping Row ${i} due to missing fields:`, { name, benches, raw: row });
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
                message: `Processed ${results.length} rows. Attempted ${insertedCheck} classrooms. Skipped ${failedRows}.`,
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

// Bulk delete classrooms
router.post('/delete-bulk', (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'Invalid IDs' });
    }
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    db.run(`DELETE FROM classrooms WHERE id IN (${placeholders})`, ids, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted', changes: this.changes });
        if (this.changes > 0) generateSeating().catch(err => console.error("Auto-allocation failed:", err));
    });
});

// Delete classroom
router.delete('/:id', (req, res) => {
    db.run("DELETE FROM classrooms WHERE id = $1", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted', changes: this.changes });
        if (this.changes > 0) generateSeating().catch(err => console.error("Auto-allocation failed:", err));
    });
});

// Toggle Availability
router.put('/:id/availability', (req, res) => {
    const { isAvailable } = req.body;
    db.run("UPDATE classrooms SET isAvailable = $1 WHERE id = $2", [isAvailable ? 1 : 0, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Updated successfully' });
        // Auto-generate seating in background due to availability change
        generateSeating().catch(err => console.error("Auto-allocation failed:", err));
    });
});

module.exports = router;
