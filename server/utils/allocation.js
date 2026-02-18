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



function getAllInvigilators() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM invigilators", [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function clearRoomAssignments() {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM room_assignments", [], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

function insertRoomAssignments(assignments) {
    if (assignments.length === 0) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const placeholders = assignments.map(() => "(?, ?, ?)").join(", ");
        const values = assignments.flatMap(a => [a.roomId, a.invigilator1Id, a.invigilator2Id]);
        const sql = `INSERT INTO room_assignments (roomId, invigilator1Id, invigilator2Id) VALUES ${placeholders}`;
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
        const invigilators = await getAllInvigilators();

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

        // 2. Sort exam groups by size
        const examCodes = Object.keys(studentsByExam).sort((a, b) => studentsByExam[b].length - studentsByExam[a].length);

        // 3. Prepare Benches
        let allBenches = [];
        classrooms.forEach(room => {
            for (let i = 1; i <= room.benchCount; i++) {
                allBenches.push({
                    roomId: room.id,
                    benchNumber: i,
                    seats: [null, null]
                });
            }
        });

        // 4. Allocation Logic
        const getStudent = (excludeExamCode) => {
            examCodes.sort((a, b) => studentsByExam[b].length - studentsByExam[a].length);
            for (const code of examCodes) {
                if (code !== excludeExamCode && studentsByExam[code].length > 0) {
                    return { student: studentsByExam[code].pop(), code: code };
                }
            }
            return null;
        };

        const activeRoomIds = new Set();

        for (let bench of allBenches) {
            const slot1 = getStudent(null);
            if (!slot1) break;
            bench.seats[0] = slot1.student;
            activeRoomIds.add(bench.roomId);

            const slot2 = getStudent(slot1.code);
            if (slot2) {
                bench.seats[1] = slot2.student;
            }
        }

        // 5. Save Seating to DB
        const remaining = examCodes.reduce((acc, code) => acc + studentsByExam[code].length, 0);
        await clearSeating();

        const seatingEntries = allBenches
            .filter(b => b.seats[0] !== null || b.seats[1] !== null)
            .map(b => ({
                roomId: b.roomId,
                benchNumber: b.benchNumber,
                student1Id: b.seats[0] ? b.seats[0].id : null,
                student2Id: b.seats[1] ? b.seats[1].id : null
            }));

        await insertSeating(seatingEntries);

        // 6. Assign Invigilators
        await clearRoomAssignments();
        const roomAssignments = [];
        const activeRoomsList = Array.from(activeRoomIds);

        // Simple random assignment, 2 per room
        // If not enough invigilators, some rooms might get 1 or 0
        // We shuffle invigilators first
        const shuffledInvigilators = [...invigilators].sort(() => 0.5 - Math.random());
        let invigilatorIndex = 0;

        activeRoomsList.forEach(roomId => {
            if (invigilatorIndex < shuffledInvigilators.length) {
                const i1 = shuffledInvigilators[invigilatorIndex++];
                const i2 = invigilatorIndex < shuffledInvigilators.length ? shuffledInvigilators[invigilatorIndex++] : null;
                roomAssignments.push({
                    roomId: roomId,
                    invigilator1Id: i1.id,
                    invigilator2Id: i2 ? i2.id : null
                });
            }
        });

        await insertRoomAssignments(roomAssignments);

        return {
            success: true,
            allocated: seatingEntries.length * 2 - seatingEntries.filter(s => !s.student2Id).length,
            unallocated: remaining,
            roomsAssigned: roomAssignments.length
        };

    } catch (error) {
        console.error("Allocation failed:", error);
        throw error;
    }
}

module.exports = { generateSeating };
