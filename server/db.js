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

// Create a wrapper to make the transition easier and mimic db.all/db.run where possible
const dbWrapper = {
    // Equivalent roughly to db.all
    all: async (text, params, callback) => {
        try {
            const res = await pool.query(text, params);
            if (callback) callback(null, res.rows);
            return res.rows;
        } catch (err) {
            if (callback) callback(err, null);
            else throw err;
        }
    },
    // Equivalent roughly to db.get
    get: async (text, params, callback) => {
        try {
            const res = await pool.query(text, params);
            const row = res.rows[0] || null;
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
