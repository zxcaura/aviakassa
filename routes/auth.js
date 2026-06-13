const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'aviakassa_secret_2026';

// Регистрация
router.post('/register', async (req, res) => {
    const { fullName, email, password, phone } = req.body;
    
    console.log('Register attempt:', { fullName, email, password, phone });
    
    if (!fullName || !email || !password) {
        return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run(`INSERT INTO Users (Email, PasswordHash, FullName, Phone) VALUES (?, ?, ?, ?)`,
            [email, hashedPassword, fullName, phone || ''],
            function(err) {
                if (err) {
                    console.error('DB error:', err.message);
                    if (err.message.includes('UNIQUE')) {
                        return res.status(409).json({ error: 'Email уже существует' });
                    }
                    return res.status(500).json({ error: 'Ошибка регистрации: ' + err.message });
                }
                console.log('User registered, id:', this.lastID);
                res.status(201).json({ success: true, userId: this.lastID });
            });
    } catch(e) {
        console.error('Server error:', e);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Вход
router.post('/login', (req, res) => {
    const { email, password } = req.body;
    
    db.get(`SELECT * FROM Users WHERE Email = ?`, [email], async (err, user) => {
        if (err || !user) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }
        
        const match = await bcrypt.compare(password, user.PasswordHash);
        if (!match) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }
        
        const token = jwt.sign(
            { userId: user.UserId, email: user.Email, fullName: user.FullName },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({ 
            success: true, 
            token, 
            user: { 
                id: user.UserId, 
                email: user.Email, 
                fullName: user.FullName,
                phone: user.Phone
            } 
        });
    });
});

// Получить профиль
router.get('/profile', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Не авторизован' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        db.get(`SELECT UserId, Email, FullName, Phone FROM Users WHERE UserId = ?`, 
            [decoded.userId], (err, user) => {
                if (err || !user) {
                    return res.status(404).json({ error: 'Пользователь не найден' });
                }
                res.json(user);
            });
    } catch(e) {
        res.status(403).json({ error: 'Токен недействителен' });
    }
});

// Обновить профиль
router.put('/profile', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Не авторизован' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const { fullName, phone } = req.body;
        db.run(`UPDATE Users SET FullName = ?, Phone = ? WHERE UserId = ?`, 
            [fullName, phone, decoded.userId], function(err) {
                if (err) return res.status(500).json({ error: 'Ошибка обновления' });
                res.json({ success: true });
            });
    } catch(e) {
        res.status(403).json({ error: 'Токен недействителен' });
    }
});

// Получить заказы пользователя
router.get('/orders', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Не авторизован' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        db.all(`SELECT o.*, f.FlightNumber, f.Airline, f.DepartureAirport, f.ArrivalAirport, f.DepartureTime, f.ArrivalTime
                FROM Orders o 
                JOIN Flights f ON o.FlightId = f.FlightId 
                WHERE o.UserId = ? 
                ORDER BY o.CreatedAt DESC`, 
            [decoded.userId], (err, rows) => {
                if (err) return res.status(500).json({ error: 'Ошибка загрузки заказов' });
                res.json(rows);
            });
    } catch(e) {
        res.status(403).json({ error: 'Токен недействителен' });
    }
});

module.exports = router;