const db = require('../db');

function getAllStudents() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM students", [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function getAllClassrooms() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM classrooms", [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function clearSeating() {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM seating", [], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

function insertSeating(seatingData) {
    if (seatingData.length === 0) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const placeholders = seatingData.map(() => "(?, ?, ?, ?)").join(", ");
        const values = seatingData.flatMap(s => [s.roomId, s.benchNumber, s.student1Id, s.student2Id]);
        const sql = `INSERT INTO seating (roomId, benchNumber, student1Id, student2Id) VALUES ${placeholders}`;

        db.run(sql, values, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}


async function generateSeating() {
    try {
        const students = await getAllStudents();
        const classrooms = await getAllClassrooms();

        if (students.length === 0 || classrooms.length === 0) {
            throw new Error("Students or Classrooms data missing.");
        }

        // 1. Group students by Exam Code
        const studentsByExam = {};
        students.forEach(s => {
            if (!studentsByExam[s.examCode]) {
                studentsByExam[s.examCode] = [];
            }
            studentsByExam[s.examCode].push(s);
        });

        // 2. Sort exam groups by size (descending) to handle largest constraints first
        const examCodes = Object.keys(studentsByExam).sort((a, b) => studentsByExam[b].length - studentsByExam[a].length);

        // 3. Prepare Benches
        // Flatten all bench slots across all rooms
        let allBenches = [];
        classrooms.forEach(room => {
            for (let i = 1; i <= room.benchCount; i++) {
                allBenches.push({
                    roomId: room.id,
                    benchNumber: i,
                    seats: [null, null] // Max 2 students per bench
                });
            }
        });

        // 4. Allocation Logic
        // We will iterate through benches and fill them.

        // Helper to get next student from the largest available group that isn't `excludeExamCode`
        const getStudent = (excludeExamCode) => {
            // Sort exams by remaining count dynamically? Or just iterate.
            // Simple: iterate through our sorted examCodes, pick first valid.
            // Re-sorting every time might be slow for 500 students, but 500 is small.
            // Optimization: Keep a persistent sorted structure or just linear scan since num_exams is likely small.

            // Re-sort examCodes based on current remaining count
            examCodes.sort((a, b) => studentsByExam[b].length - studentsByExam[a].length);

            for (const code of examCodes) {
                if (code !== excludeExamCode && studentsByExam[code].length > 0) {
                    return { student: studentsByExam[code].pop(), code: code };
                }
            }
            return null;
        };

        for (let bench of allBenches) {
            // Fill Seat 1
            const slot1 = getStudent(null);
            if (!slot1) break; // No more students
            bench.seats[0] = slot1.student;

            // Fill Seat 2
            const slot2 = getStudent(slot1.code); // Must differ from slot1's exam code
            if (slot2) {
                bench.seats[1] = slot2.student;
            } else {
                // Could not find a student from a different exam. 
                // Checks if we have same-exam students left?
                // Rule: "Students with the same exam code must not sit on the same bench"
                // So we leave it empty.
            }
        }

        // 5. Save to DB
        // Check for any unallocated students?
        const remaining = examCodes.reduce((acc, code) => acc + studentsByExam[code].length, 0);
        if (remaining > 0) {
            console.warn(`${remaining} students could not be allocated due to constraints or lack of space.`);
        }

        await clearSeating();

        const seatingEntries = allBenches
            .filter(b => b.seats[0] !== null || b.seats[1] !== null)
            .map(b => ({
                roomId: b.roomId,
                benchNumber: b.benchNumber,
                student1Id: b.seats[0] ? b.seats[0].id : null,
                student2Id: b.seats[1] ? b.seats[1].id : null
            }));

        // Batch insert
        // SQLite limit variables, so chunk it if necessary. 500 students -> ~250 rows. Safe.
        await insertSeating(seatingEntries);

        return { success: true, allocated: seatingEntries.length * 2 - seatingEntries.filter(s => !s.student2Id).length, unallocated: remaining };

    } catch (error) {
        console.error("Allocation failed:", error);
        throw error;
    }
}

module.exports = { generateSeating };
