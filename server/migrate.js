const db = require('./db');

function addColumnIfNotExists(tableName, columnName, columnDefinition) {
    return new Promise((resolve, reject) => {
        db.all(`PRAGMA table_info(${tableName})`, [], (err, rows) => {
            if (err) return reject(err);
            const exists = rows.some(row => row.name === columnName);
            if (!exists) {
                db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`, (err) => {
                    if (err) reject(err);
                    else {
                        console.log(`Added ${columnName} to ${tableName}`);
                        resolve();
                    }
                });
            } else {
                console.log(`Column ${columnName} already exists in ${tableName}`);
                resolve();
            }
        });
    });
}

async function migrate() {
    try {
        await addColumnIfNotExists('classrooms', 'isAvailable', 'BOOLEAN DEFAULT 1');
        await addColumnIfNotExists('invigilators', 'isAvailable', 'BOOLEAN DEFAULT 1');
        await addColumnIfNotExists('room_assignments', 'isManual', 'BOOLEAN DEFAULT 0');

        console.log("Migration completed.");

        // Also ensure all existing rows have default as 1
        db.run('UPDATE classrooms SET isAvailable = 1 WHERE isAvailable IS NULL OR isAvailable = 0');
        db.run('UPDATE invigilators SET isAvailable = 1 WHERE isAvailable IS NULL OR isAvailable = 0');

    } catch (e) {
        console.error("Migration failed:", e);
    }
}

migrate();
