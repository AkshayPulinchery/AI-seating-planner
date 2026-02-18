const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'exam_system.db');
const db = new sqlite3.Database(dbPath);

const EXAM_CODES = ['CS101', 'MA202', 'PH303', 'CH404', 'ENG505'];
const ROOM_COUNT = 10;
const BENCH_PER_ROOM = 30; // Total capacity 600
const STUDENT_COUNT = 500;

function setupSchema() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                registerNumber TEXT UNIQUE NOT NULL,
                examCode TEXT NOT NULL
            )`);
            db.run(`CREATE TABLE IF NOT EXISTS classrooms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                roomName TEXT UNIQUE NOT NULL,
                benchCount INTEGER NOT NULL
            )`);
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
            db.run(`CREATE TABLE IF NOT EXISTS admin (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            )`);
            // Insert default admin
            db.run(`INSERT OR IGNORE INTO admin (username, password) VALUES (?, ?)`, ["admin", "admin123"], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    });
}

function clearTables() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run("DELETE FROM students");
            db.run("DELETE FROM classrooms");
            db.run("DELETE FROM seating", (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    });
}

async function seed() {
    console.log("Initializing DB and Seeding...");

    await setupSchema();
    await clearTables();
    console.log("Cleared existing data.");

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        // Classrooms
        const stmtRoom = db.prepare("INSERT INTO classrooms (roomName, benchCount) VALUES (?, ?)");
        for (let i = 0; i < ROOM_COUNT; i++) {
            stmtRoom.run(`Hall ${String.fromCharCode(65 + i)}`, BENCH_PER_ROOM);
        }
        stmtRoom.finalize();

        // Students
        const stmtStudent = db.prepare("INSERT INTO students (name, registerNumber, examCode) VALUES (?, ?, ?)");
        for (let i = 1; i <= STUDENT_COUNT; i++) {
            const exam = EXAM_CODES[Math.floor(Math.random() * EXAM_CODES.length)];
            const regNo = `REG${2024000 + i}`;
            const name = `Student ${i}`;
            stmtStudent.run(name, regNo, exam);
        }
        stmtStudent.finalize();

        db.run("COMMIT", (err) => {
            if (err) {
                console.error("Error seeding", err);
                process.exit(1);
            } else {
                console.log(`Seeding complete: ${ROOM_COUNT} Classrooms, ${STUDENT_COUNT} Students.`);
                // Verify
                db.get("SELECT COUNT(*) as c FROM students", (err, row) => {
                    console.log("Students count:", row.c);
                    db.close();
                });
            }
        });
    });
}

seed();
