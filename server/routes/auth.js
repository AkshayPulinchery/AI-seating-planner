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

router.post('/change-password', (req, res) => {
    const { username, oldPassword, newPassword } = req.body;
    db.get("SELECT * FROM admin WHERE username = ? AND password = ?", [username, oldPassword], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) {
            return res.status(401).json({ error: 'Current password incorrect' });
        }

        db.run("UPDATE admin SET password = ? WHERE username = ?", [newPassword, username], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Password updated successfully' });
        });
    });
});

module.exports = router;
