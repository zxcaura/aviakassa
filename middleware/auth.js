const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || 'aviakassa_secret_2026';

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: "Нет токена" });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        res.status(401).json({ message: "Неверный токен" });
    }
};