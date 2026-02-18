const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'exam_system.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Students table
        db.run(`CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            registerNumber TEXT UNIQUE NOT NULL,
            examCode TEXT NOT NULL
        )`);

        // Classrooms table
        db.run(`CREATE TABLE IF NOT EXISTS classrooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            roomName TEXT UNIQUE NOT NULL,
            benchCount INTEGER NOT NULL
        )`);

        // Seating table
        // benchNumber is 1-based index within the room
        db.run(`CREATE TABLE IF NOT EXISTS seating (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            roomId INTEGER NOT NULL,
            benchNumber INTEGER NOT NULL,
            student1Id INTEGER,
            student2Id INTEGER,
            FOREIGN KEY(roomId) REFERENCES classrooms(id),
            FOREIGN KEY(student1Id) REFERENCES students(id),
            FOREIGN KEY(student2Id) REFERENCES students(id)
        )`);

        // Invigilators table
        db.run(`CREATE TABLE IF NOT EXISTS invigilators (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT
        )`);

        // Room Assignments (linking invigilators to rooms for a seating session)
        db.run(`CREATE TABLE IF NOT EXISTS room_assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            roomId INTEGER NOT NULL,
            invigilator1Id INTEGER,
            invigilator2Id INTEGER,
            FOREIGN KEY(roomId) REFERENCES classrooms(id),
            FOREIGN KEY(invigilator1Id) REFERENCES invigilators(id),
            FOREIGN KEY(invigilator2Id) REFERENCES invigilators(id)
        )`);

        // Admin table (simple constraint)
        db.run(`CREATE TABLE IF NOT EXISTS admin (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )`);

        // Insert default admin if not exists
        db.get("SELECT * FROM admin WHERE username = ?", ["admin"], (err, row) => {
            if (!row) {
                db.run("INSERT INTO admin (username, password) VALUES (?, ?)", ["admin", "admin123"]);
                console.log("Default admin user created: admin / admin123");
            }
        });
    });
}

module.exports = db;
