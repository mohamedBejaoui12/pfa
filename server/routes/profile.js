const router = require('express').Router();
const pool = require('../db');
const authorization = require('../middleware/authorization');

// Route to get profile data
router.get('/', authorization, async (req, res) => {
    try {
        const user = await pool.query(
            "SELECT * FROM members WHERE fullname = $1",
            [req.user.fullname] // Use 'fullname' to match the payload key
        );

        if (user.rowCount === 0) {
            return res.status(404).json("User not found");
        }

        res.json(user.rows[0]);
    } catch (error) {
        console.error(error.message);
        res.status(500).json("Server Error");
    }
});

module.exports = router;

// Purpose: Handles profile-related routes.
// Functionality: Retrieves and returns user profile data for authenticated users.