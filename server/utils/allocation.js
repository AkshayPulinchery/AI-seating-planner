const db = require('../db');
const { sendAssignmentEmails } = require('./email');

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
        db.all("SELECT * FROM classrooms WHERE isAvailable = 1", [], (err, rows) => {
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
        const placeholders = seatingData.map((_, i) => {
            const o = i * 4;
            return `($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4})`;
        }).join(", ");
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
        db.all("SELECT * FROM invigilators WHERE isAvailable = 1", [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function clearManualRoomAssignments() {
    return new Promise((resolve, reject) => {
        // Only delete room assignments that are not manually set
        db.run("DELETE FROM room_assignments WHERE isManual = 0", [], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

function getManualRoomAssignments() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM room_assignments WHERE isManual = 1", [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function clearRoomAssignments() {
    // We now use clearManualRoomAssignments to preserve overrides
    return clearManualRoomAssignments();
}

function insertRoomAssignments(assignments) {
    if (assignments.length === 0) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const placeholders = assignments.map((_, i) => {
            const o = i * 3;
            return `($${o + 1}, $${o + 2}, $${o + 3})`;
        }).join(", ");
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
        const examGroups = {};
        students.forEach(s => {
            if (!examGroups[s.examCode]) examGroups[s.examCode] = [];
            examGroups[s.examCode].push(s);
        });

        // 2. Prepare Benches (Capacity)
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

        // Total capacity check
        const totalCapacity = allBenches.length * 2;
        if (students.length > totalCapacity) {
            console.warn(`Warning: ${students.length} students but only ${totalCapacity} seats. Some will be unallocated.`);
        }

        // --- 3. ADVANCED CSP SOLVER (Constraint Satisfaction Problem) ---
        // Constraints:
        // 1. Two students on the same bench CANNOT have the same exam code.
        // 2. Attempt to fill benches as densely as possible to optimize room usage.

        // Flatten students into a pool, sorted by exam code size (largest first) to deal with hard constraints early
        const sortedExamCodes = Object.keys(examGroups).sort((a, b) => examGroups[b].length - examGroups[a].length);
        let studentPool = [];
        for (const code of sortedExamCodes) {
            studentPool.push(...examGroups[code]);
        }

        const activeRoomIds = new Set();
        let allocatedCount = 0;

        // CSP Allocation Logic (Forward Checking Heuristic)
        // We iterate over the student pool, trying to place each student into a valid seat.
        for (const student of studentPool) {
            let placed = false;

            // Try to place student on a partially filled bench FIRST (to minimize unused seats)
            for (let i = 0; i < allBenches.length; i++) {
                const bench = allBenches[i];
                // Check if bench has exactly 1 person and they DON'T share the same exam code
                if (bench.seats[0] !== null && bench.seats[1] === null) {
                    if (bench.seats[0].examCode !== student.examCode) {
                        bench.seats[1] = student;
                        activeRoomIds.add(bench.roomId);
                        allocatedCount++;
                        placed = true;
                        break;
                    }
                } else if (bench.seats[0] === null && bench.seats[1] !== null) {
                    if (bench.seats[1].examCode !== student.examCode) {
                        bench.seats[0] = student;
                        activeRoomIds.add(bench.roomId);
                        allocatedCount++;
                        placed = true;
                        break;
                    }
                }
            }

            // If couldn't place on a partially filled bench, place on an empty bench
            if (!placed) {
                for (let i = 0; i < allBenches.length; i++) {
                    const bench = allBenches[i];
                    if (bench.seats[0] === null && bench.seats[1] === null) {
                        // Place in seat 0
                        bench.seats[0] = student;
                        activeRoomIds.add(bench.roomId);
                        allocatedCount++;
                        placed = true;
                        break;
                    }
                }
            }

            // If STILL not placed, it means we ran out of valid empty benches. 
            // Fallback: Force place the student on a partially filled bench even if they share the same exam code.
            if (!placed) {
                for (let i = 0; i < allBenches.length; i++) {
                    const bench = allBenches[i];
                    if (bench.seats[0] !== null && bench.seats[1] === null) {
                        bench.seats[1] = student;
                        activeRoomIds.add(bench.roomId);
                        allocatedCount++;
                        placed = true;
                        break;
                    } else if (bench.seats[0] === null && bench.seats[1] !== null) {
                        bench.seats[0] = student;
                        activeRoomIds.add(bench.roomId);
                        allocatedCount++;
                        placed = true;
                        break;
                    }
                }
            }

            if (!placed) {
                console.log(`CSP Wall Hit: Could not cleanly place student ${student.id} (${student.examCode}) even with fallbacks (Capacity full).`);
            }
        }

        // 4. Save Seating to DB
        const unallocated = students.length - allocatedCount;
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

        // 5. Assign Invigilators
        await clearManualRoomAssignments();
        const manualAssignments = await getManualRoomAssignments();

        // Track which rooms already have manual invigilators so we skip them
        const skipRoomIds = new Set(manualAssignments.map(ma => ma.roomId));
        // Track which invigilators are already manually assigned so we don't double book them
        const usedInvigilatorIds = new Set();
        manualAssignments.forEach(ma => {
            if (ma.invigilator1Id) usedInvigilatorIds.add(ma.invigilator1Id);
            if (ma.invigilator2Id) usedInvigilatorIds.add(ma.invigilator2Id);
        });

        const roomAssignments = [];
        const activeRoomsList = Array.from(activeRoomIds).filter(id => !skipRoomIds.has(id));

        // Shuffle available invigilators that are not manually assigned elsewhere
        let availableInvigilators = invigilators.filter(inv => !usedInvigilatorIds.has(inv.id));
        const shuffledInvigilators = [...availableInvigilators].sort(() => 0.5 - Math.random());
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

        // 6. Trigger Emails
        // We delay it slightly so the response isn't blocked by slow SMTP, 
        // though sendAssignmentEmails is async
        sendAssignmentEmails();

        return {
            success: true,
            allocated: allocatedCount,
            unallocated: unallocated,
            roomsAssigned: roomAssignments.length
        };

    } catch (error) {
        console.error("CSP Server Allocation failed:", error);
        throw error;
    }
}

module.exports = { generateSeating };
