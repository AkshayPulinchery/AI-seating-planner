require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Supabase
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// PostgreSQL folds unquoted identifiers to lowercase.
// This map converts them back to the camelCase the frontend expects.
const COLUMN_MAP = {
    registernumber: 'registerNumber',
    examcode: 'examCode',
    roomname: 'roomName',
    benchcount: 'benchCount',
    isavailable: 'isAvailable',
    roomid: 'roomId',
    benchnumber: 'benchNumber',
    student1id: 'student1Id',
    student2id: 'student2Id',
    invigilator1id: 'invigilator1Id',
    invigilator2id: 'invigilator2Id',
    ismanual: 'isManual',
    student1name: 'student1Name',
    student1reg: 'student1Reg',
    student1exam: 'student1Exam',
    student2name: 'student2Name',
    student2reg: 'student2Reg',
    student2exam: 'student2Exam',
    invigilator1: 'invigilator1',
    invigilator2: 'invigilator2',
};

function toCamelCase(row) {
    if (!row) return row;
    const result = {};
    for (const key of Object.keys(row)) {
        result[COLUMN_MAP[key] || key] = row[key];
    }
    return result;
}

// Create a wrapper to make the transition easier and mimic db.all/db.run where possible
const dbWrapper = {
    // Equivalent roughly to db.all
    all: async (text, params, callback) => {
        try {
            const res = await pool.query(text, params);
            const rows = res.rows.map(toCamelCase);
            if (callback) callback(null, rows);
            return rows;
        } catch (err) {
            if (callback) callback(err, null);
            else throw err;
        }
    },
    // Equivalent roughly to db.get
    get: async (text, params, callback) => {
        try {
            const res = await pool.query(text, params);
            const row = toCamelCase(res.rows[0]) || null;
            if (callback) callback(null, row);
            return row;
        } catch (err) {
            if (callback) callback(err, null);
            else throw err;
        }
    },
    // Equivalent roughly to db.run
    run: async (text, params, callback) => {
        try {
            const res = await pool.query(text, params);
            const mockContext = {
                changes: res.rowCount,
                lastID: res.rows && res.rows[0] && res.rows[0].id ? res.rows[0].id : null
            };
            if (callback) callback.call(mockContext, null);
            return mockContext;
        } catch (err) {
            if (callback) callback.call({}, err);
            else throw err;
        }
    },
    pool // Export raw pool for complex transactions (like allocation logic)
};

module.exports = dbWrapper;

