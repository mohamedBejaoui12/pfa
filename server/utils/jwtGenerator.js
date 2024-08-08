const jwt = require('jsonwebtoken');
require('dotenv').config();

function jwtGenerator(fullname) {
    const payload = {
        fullname // Use 'fullname' in the payload
    };
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
}

module.exports = jwtGenerator;
