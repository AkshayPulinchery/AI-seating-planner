const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM admin WHERE username = ? AND password = ?", [username, password], (err, row) => {
        console.log(`Login attempt for ${username}: ${row ? 'Success' : 'Failed'}`);
        if (err) return res.status(500).json({ error: err.message });
        if (row) {
            res.json({ token: 'admin-token', message: 'Login successful' });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    });
});

module.exports = router;
