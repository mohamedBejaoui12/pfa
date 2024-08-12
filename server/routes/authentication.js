const router = require('express').Router();
const pool = require('../db');
const jwtGenerator = require('../utils/jwtGenerator');
const authorization = require('../middleware/authorization');
const bcrypt = require('bcrypt'); // Import bcrypt

// User login route
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Check if the admin username is provided with an empty password
        if (username === "admin" && password === "") {
            return res.json({ redirectToAdminLogin: true });
        }

        const memberQuery = "SELECT * FROM members WHERE fullname = $1";
        const member = await pool.query(memberQuery, [username]);

        if (member.rowCount === 0) {
            return res.status(401).json("Password or username is incorrect");
        }
        
        const user = member.rows[0];
        
        // Compare the hashed password
        const validPass = await bcrypt.compare(password, user.member_pass);
        if (!validPass) {
            return res.status(401).json("Password or username is incorrect");
        }

        const token = jwtGenerator(username);
        res.json({ token });

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error");
    }
});

// Admin login route
router.post('/admin-login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const memberQuery = "SELECT * FROM members WHERE fullname = $1";
        const member = await pool.query(memberQuery, [username]);

        if (member.rowCount === 0) {
            return res.status(401).json("User not found");
        }

        const user = member.rows[0];

        // Check if the user is an admin
        if (!user.admin) {
            return res.status(403).json("Access denied");
        }

        // Verify password
        const validPass = await bcrypt.compare(password, user.member_pass);
        if (!validPass) {
            return res.status(401).json("Password or username is incorrect");
        }

        // Generate a token
        const token = jwtGenerator(username);
        res.json({ token });

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error");
    }
});

router.get('/is-verify', authorization, (req, res) => {
    // If the token is valid, req.user should be populated by the authorization middleware
    if (req.user) {
        res.json(true);
    } else {
        res.json(false);
    }
});
// GET endpoint to retrieve member CIN
router.get('/get-member-cin', authorization, async (req, res) => {
    try {
      // Assuming req.user is set by the authorization middleware
      const username = req.user.fullname;  // Adjust according to how req.user is set up
      
      const memberQuery = "SELECT member_cin FROM members WHERE fullname = $1";
      const member = await pool.query(memberQuery, [username]);
  
      if (member.rowCount === 0) {
        return res.status(404).json("User not found");
      }
  
      const memberCIN = member.rows[0].member_cin;
      res.json({ member_cin: memberCIN });
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Server Error");
    }
  });
  

module.exports = router;
