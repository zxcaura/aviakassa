const express = require('express');
const db = require('../db/database');

const router = express.Router();

// Получить все рейсы
router.get('/', (req, res) => {
    db.all("SELECT * FROM Flights ORDER BY Price", [], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка сервера' });
        }
        res.json(rows);
    });
});

module.exports = router;