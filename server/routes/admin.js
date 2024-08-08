// routes/admin.js
const router = require('express').Router();
const pool = require('../db');
const bcrypt = require('bcrypt');

// Route to get admin data
router.get('/', async (req, res) => {
  try {
    // Adjust query based on the actual needs and database schema
    const admin = await pool.query(
      "SELECT * FROM members WHERE admin = true"
    );

    if (admin.rowCount === 0) {
      return res.status(404).json("Admin not found");
    }

    res.json(admin.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json("Server Error");
  }
});

// Route to register a new member
router.post('/register', async (req, res) => {
  try {
    const { cin, name, etat, grade, admin, validate_from, validate_to, email, password } = req.body;

    const user = await pool.query("SELECT * FROM members WHERE member_cin = $1", [cin]);
    if (user.rows.length !== 0) {
      return res.status(401).send("User Already Exists");
    }

    const saltRound = 10;
    const salt = await bcrypt.genSalt(saltRound);
    const bcryptPassword = await bcrypt.hash(password, salt);

    const newUser = await pool.query(
      "INSERT INTO members (member_cin, fullname, member_etat, grade, admin, created_at, validate_from, validate_to, member_email, member_pass) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9) RETURNING *",
      [cin, name, etat, grade, admin, validate_from, validate_to, email, bcryptPassword]
    );

    res.json(newUser.rows[0]);

  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
