const jwt = require('jsonwebtoken');
require('dotenv').config();

const authorization = (req, res, next) => {
    try {
        // Extract token from header
        const token = req.header('Authorization').replace('Bearer ', '');
        if (!token) return res.status(401).json("No token provided");
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Attach decoded data to req.user
        next();
    } catch (error) {
        console.error(error.message);
        res.status(401).json("Invalid Token");
    }
};

module.exports = authorization;
