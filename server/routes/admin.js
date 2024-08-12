// routes/admin.js
const router = require('express').Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const authorization = require('../middleware/authorization');


// Route to get admin data
router.get('/',authorization, async (req, res) => {
  try {
    const admin = await pool.query(
      "SELECT * FROM members WHERE fullname=$1 and admin = true", [req.user.fullname]
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
router.get('/allmembers', async (req, res) => {
  try {
    const users = await pool.query('SELECT * FROM members');
    if (users.rowCount === 0) {
      return res.status(404).send("There are no members");
    }
    res.json(users.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});
router.get('/update/:cin', authorization, async (req, res) => {
  try {
    const { cin } = req.params;
    const member = await pool.query('SELECT * FROM members WHERE member_cin = $1', [cin]);
    if (member.rowCount === 0) {
      return res.status(404).json("Member not found");
    }
    res.json(member.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});

router.put('/update/:cin', authorization, async (req, res) => {
  try {
    const { cin } = req.params;
    const { new_cin, fullname, member_etat, grade, admin, validate_from, validate_to, member_email, member_pass } = req.body;
    const saltRound = 10;
    const salt = await bcrypt.genSalt(saltRound);
    const bcryptPassword = await bcrypt.hash(member_pass, salt);

    await pool.query(
      `UPDATE members SET member_cin = $1, fullname = $2, member_etat = $3, grade = $4, admin = $5, validate_from = $6, validate_to = $7, member_email = $8, member_pass = $9 WHERE member_cin = $10`,
      [new_cin, fullname, member_etat, grade, admin, validate_from, validate_to, member_email,bcryptPassword , cin]
    );

    res.json("Member updated successfully");
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});

router.post('/addMeeting',authorization, async (req, res) => {
  try {
    const { created_by, title, subject, content, start_at } = req.body;

    const admin = await pool.query(
      "SELECT * FROM members WHERE fullname=$1 and admin = true", [req.user.fullname]
    );
    

    const newMeeting = await pool.query(
      "INSERT INTO meetings (created_by, title, subject, content, start_at, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *",
      [created_by, title, subject, content, start_at]
    );

    const newJournal = await pool.query(
      "INSERT INTO journal (member_cin, action, action_time) VALUES ($1, $2, NOW()) RETURNING *",
      [created_by, 'Add a Meeting']
    );

    res.json(newMeeting.rows[0]);

  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;

module.exports = router;
