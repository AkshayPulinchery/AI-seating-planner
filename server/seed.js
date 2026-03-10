require('dotenv').config();
const db = require('./db');
const { pool } = db;

const EXAM_CODES = ['CS101', 'MA202', 'PH303', 'CH404', 'ENG505'];
const ROOM_COUNT = 10;
const BENCH_PER_ROOM = 30; // Total capacity 600
const STUDENT_COUNT = 500;

async function setupSchema() {
    console.log("Setting up schema...");
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        await client.query(`CREATE TABLE IF NOT EXISTS students (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            registerNumber VARCHAR(255) UNIQUE NOT NULL,
            examCode VARCHAR(255) NOT NULL
        )`);

        await client.query(`CREATE TABLE IF NOT EXISTS classrooms (
            id SERIAL PRIMARY KEY,
            roomName VARCHAR(255) UNIQUE NOT NULL,
            benchCount INTEGER NOT NULL,
            isAvailable BOOLEAN DEFAULT true
        )`);

        await client.query(`CREATE TABLE IF NOT EXISTS seating (
            id SERIAL PRIMARY KEY,
            roomId INTEGER NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
            benchNumber INTEGER NOT NULL,
            student1Id INTEGER REFERENCES students(id) ON DELETE SET NULL,
            student2Id INTEGER REFERENCES students(id) ON DELETE SET NULL
        )`);

        await client.query(`CREATE TABLE IF NOT EXISTS invigilators (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            isAvailable BOOLEAN DEFAULT true
        )`);

        await client.query(`CREATE TABLE IF NOT EXISTS room_assignments (
            id SERIAL PRIMARY KEY,
            roomId INTEGER NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
            invigilator1Id INTEGER REFERENCES invigilators(id) ON DELETE SET NULL,
            invigilator2Id INTEGER REFERENCES invigilators(id) ON DELETE SET NULL,
            isManual BOOLEAN DEFAULT false
        )`);

        await client.query(`CREATE TABLE IF NOT EXISTS admin (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL
        )`);

        // Insert default admin
        await client.query(`INSERT INTO admin (username, password) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING`, ["admin", "admin123"]);

        await client.query("COMMIT");
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

async function clearTables() {
    console.log("Clearing tables...");
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query("DELETE FROM students");
        await client.query("DELETE FROM classrooms");
        await client.query("DELETE FROM invigilators");
        await client.query("DELETE FROM seating");
        await client.query("DELETE FROM room_assignments");
        await client.query("COMMIT");
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

async function seed() {
    console.log("Initializing DB and Seeding PostgreSQL...");

    try {
        await setupSchema();
        await clearTables();
        console.log("Cleared existing data.");

        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            // Classrooms
            for (let i = 0; i < ROOM_COUNT; i++) {
                const roomName = `Hall ${String.fromCharCode(65 + i)}`;
                await client.query("INSERT INTO classrooms (roomName, benchCount) VALUES ($1, $2)", [roomName, BENCH_PER_ROOM]);
            }

            // Students
            for (let i = 1; i <= STUDENT_COUNT; i++) {
                const exam = EXAM_CODES[Math.floor(Math.random() * EXAM_CODES.length)];
                const regNo = `REG${2024000 + i}`;
                const name = `Student ${i}`;
                await client.query("INSERT INTO students (name, registerNumber, examCode) VALUES ($1, $2, $3)", [name, regNo, exam]);
            }

            await client.query("COMMIT");
            console.log(`Seeding complete: ${ROOM_COUNT} Classrooms, ${STUDENT_COUNT} Students.`);

            // Verify
            const res = await pool.query("SELECT COUNT(*) as c FROM students");
            console.log("Students count:", res.rows[0].c);

        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }

    } catch (err) {
        console.error("Error during seeding:", err);
    } finally {
        // End the pool so the script exits
        pool.end();
    }
}

seed();
