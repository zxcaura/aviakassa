const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db/database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'aviakassa_secret_2026';

// Создание заказа
router.post('/', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    let userId = null;
    
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            userId = decoded.userId;
        } catch(e) {
            console.log('Invalid token:', e.message);
        }
    }
    
    const { passengerName, passengerBirthDate, passportNumber, flightId, ticketCount, email, phone, totalPrice } = req.body;
    
    console.log('Order request:', { passengerName, flightId, ticketCount, totalPrice, userId });
    
    // Проверяем наличие мест
    db.get("SELECT AvailableSeats, Price FROM Flights WHERE FlightId = ?", [flightId], (err, flight) => {
        if (err || !flight) {
            console.error('Flight not found:', flightId);
            return res.status(404).json({ error: 'Рейс не найден' });
        }
        
        const count = ticketCount || 1;
        if (flight.AvailableSeats < count) {
            return res.status(400).json({ error: 'Недостаточно свободных мест' });
        }
        
        // Генерация уникального номера билета
        const ticketNumber = `TK-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        
        // Создание заказа
        db.run(`INSERT INTO Orders 
            (UserId, PassengerName, PassengerBirthDate, PassportNumber, FlightId, TicketCount, TotalPrice, Email, Phone, TicketNumber, OrderStatus)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
            [userId, passengerName, passengerBirthDate, passportNumber, flightId, count, totalPrice, email, phone, ticketNumber],
            function(err) {
                if (err) {
                    console.error('Order creation error:', err);
                    return res.status(500).json({ error: 'Ошибка создания заказа: ' + err.message });
                }
                
                // Уменьшаем количество доступных мест
                db.run("UPDATE Flights SET AvailableSeats = AvailableSeats - ? WHERE FlightId = ?", [count, flightId]);
                
                console.log('Order created, id:', this.lastID, 'ticket:', ticketNumber);
                res.status(201).json({ success: true, orderId: this.lastID, ticketNumber });
            });
    });
});

// Получить заказы пользователя (уже есть в auth.js, но добавим для удобства)
router.get('/my', (req, res) => {
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